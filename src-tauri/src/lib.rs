use futures_util::{StreamExt, SinkExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkRequest {
    pub id: String,
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub response: Option<NetworkResponse>,
    pub timestamp: u64,
    pub duration: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkResponse {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum WebSocketMessage {
    #[serde(rename = "network-request")]
    NetworkRequest(NetworkRequest),
}

type RequestStore = Arc<Mutex<Vec<NetworkRequest>>>;
type CommandSender = broadcast::Sender<String>;

// Server-side deduplication to prevent infinite loops and duplicates
type DeduplicationCache = Arc<Mutex<HashMap<String, u64>>>;

fn create_request_signature(request: &NetworkRequest) -> String {
    let body_hash = request.body.as_ref()
        .map(|body| {
            if body.len() > 100 {
                format!("{}...{}", &body[..50], &body[body.len()-50..])
            } else {
                body.clone()
            }
        })
        .unwrap_or_default();
    
    let response_status = request.response.as_ref()
        .map(|r| r.status.to_string())
        .unwrap_or_else(|| "pending".to_string());
    
    format!("{}:{}:{}:{}", request.method, request.url, body_hash, response_status)
}

#[tauri::command]
async fn get_requests(
    store: tauri::State<'_, RequestStore>,
) -> Result<Vec<NetworkRequest>, String> {
    let requests = store.lock().map_err(|e| e.to_string())?;
    Ok(requests.clone())
}

#[tauri::command]
async fn clear_requests(store: tauri::State<'_, RequestStore>) -> Result<(), String> {
    let mut requests = store.lock().map_err(|e| e.to_string())?;
    requests.clear();
    Ok(())
}


async fn start_websocket_server(
    store: RequestStore,
    command_sender: CommandSender,
    dedup_cache: DeduplicationCache,
    app_handle: tauri::AppHandle,
) {
    let addr = "127.0.0.1:8085";
    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind WebSocket server");
    println!("WebSocket server listening on: {}", addr);

    loop {
        match listener.accept().await {
            Ok((stream, addr)) => {
                println!("New WebSocket connection from: {}", addr);

                // Emit connection event to frontend
                app_handle
                    .emit("websocket-connected", addr.to_string())
                    .ok();

                let store = store.clone();
                let dedup_cache = dedup_cache.clone();
                let command_receiver = command_sender.subscribe();
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(handle_connection(
                    stream,
                    store,
                    dedup_cache,
                    command_receiver,
                    app_handle,
                ));
            }
            Err(e) => {
                eprintln!("Failed to accept WebSocket connection: {}", e);
                // Continue listening despite errors
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    store: RequestStore,
    dedup_cache: DeduplicationCache,
    mut command_receiver: broadcast::Receiver<String>,
    app_handle: tauri::AppHandle,
) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket connection error: {}", e);
            return;
        }
    };

    let (ws_sender, mut ws_receiver) = ws_stream.split();
    let ws_sender = Arc::new(tokio::sync::Mutex::new(ws_sender));

    // Spawn a task to handle incoming commands and send them to the client
    let sender_clone = ws_sender.clone();
    let command_task = tokio::spawn(async move {
        while let Ok(command) = command_receiver.recv().await {
            let mut sender = sender_clone.lock().await;
            if sender.send(Message::Text(command)).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from the client
    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("Received WebSocket message: {}", text.len());
                
                // First try to parse as NetworkRequest (the original format)
                if let Ok(mut request) = serde_json::from_str::<NetworkRequest>(&text) {
                    if request.id.is_empty() {
                        request.id = Uuid::new_v4().to_string();
                    }

                    // Server-side deduplication check
                    let signature = create_request_signature(&request);
                    let current_time = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs();

                    let should_process = {
                        let mut cache = dedup_cache.lock().unwrap();
                        
                        // Clean up old entries (older than 5 minutes)
                        cache.retain(|_, &mut timestamp| current_time - timestamp < 300);
                        
                        // Check if we've seen this request recently (within 2 seconds)
                        if let Some(&last_seen) = cache.get(&signature) {
                            if current_time - last_seen < 2 {
                                println!("Server: Duplicate request detected, skipping: {} {}", request.method, request.url);
                                false
                            } else {
                                cache.insert(signature, current_time);
                                true
                            }
                        } else {
                            cache.insert(signature, current_time);
                            true
                        }
                    };

                    if should_process {
                        println!("Parsed request: {} {}", request.method, request.url);

                        {
                            let mut requests = store.lock().unwrap();
                            requests.push(request.clone());
                        }

                        // Emit event to frontend
                        if let Err(e) = app_handle.emit("new-request", &request) {
                            println!("Failed to emit new-request event: {}", e);
                        } else {
                            println!("Successfully emitted new-request event");
                        }
                    }
                } else {
                    println!(
                        "Failed to parse WebSocket message as NetworkRequest - Message length: {}",
                        text.len()
                    );
                    println!(
                        "First 200 chars: {}",
                        &text[..std::cmp::min(200, text.len())]
                    );
                }
            }
            Ok(Message::Close(_)) => {
                println!("WebSocket connection closed gracefully");
                break;
            }
            Ok(Message::Ping(ping)) => {
                // Respond to ping with pong for connection health
                let mut sender = ws_sender.lock().await;
                if let Err(e) = sender.send(Message::Pong(ping)).await {
                    eprintln!("Failed to send pong response: {}", e);
                    break;
                }
            }
            Ok(Message::Pong(_)) => {
                // Pong received, connection is healthy
                println!("WebSocket pong received");
            }
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
            _ => {
                println!("Received unexpected WebSocket message type");
            }
        }
    }
    
    // Clean up the command task when the connection ends
    command_task.abort();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let request_store: RequestStore = Arc::new(Mutex::new(Vec::new()));
    let dedup_cache: DeduplicationCache = Arc::new(Mutex::new(HashMap::new()));
    let (command_sender, _) = broadcast::channel(100);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(request_store.clone())
        .manage(command_sender.clone())
        .invoke_handler(tauri::generate_handler![
            get_requests,
            clear_requests
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let store = request_store.clone();
            let dedup_cache = dedup_cache.clone();
            let command_sender = command_sender.clone();

            // Use tauri's async runtime instead of tokio::spawn
            tauri::async_runtime::spawn(async move {
                start_websocket_server(store, command_sender, dedup_cache, app_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
