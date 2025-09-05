use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::Emitter;
use tokio::net::{TcpListener, TcpStream};
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

type RequestStore = Arc<Mutex<Vec<NetworkRequest>>>;

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

async fn start_websocket_server(store: RequestStore, app_handle: tauri::AppHandle) {
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
                let app_handle = app_handle.clone();
                tauri::async_runtime::spawn(handle_connection(stream, store, app_handle));
            }
            Err(e) => {
                eprintln!("Failed to accept WebSocket connection: {}", e);
                // Continue listening despite errors
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
        }
    }
}

async fn handle_connection(stream: TcpStream, store: RequestStore, app_handle: tauri::AppHandle) {
    let ws_stream = match accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("WebSocket connection error: {}", e);
            return;
        }
    };

    let (_, mut ws_receiver) = ws_stream.split();

    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                println!("Received WebSocket message: {}", text.len());
                match serde_json::from_str::<NetworkRequest>(&text) {
                    Ok(mut request) => {
                        if request.id.is_empty() {
                            request.id = Uuid::new_v4().to_string();
                        }

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
                    Err(e) => {
                        println!(
                            "Failed to parse JSON: {} - Message length: {}",
                            e,
                            text.len()
                        );
                        println!(
                            "First 200 chars: {}",
                            &text[..std::cmp::min(200, text.len())]
                        );
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Err(e) => {
                eprintln!("WebSocket error: {}", e);
                break;
            }
            _ => {}
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let request_store: RequestStore = Arc::new(Mutex::new(Vec::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(request_store.clone())
        .invoke_handler(tauri::generate_handler![get_requests, clear_requests])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            let store = request_store.clone();

            // Use tauri's async runtime instead of tokio::spawn
            tauri::async_runtime::spawn(async move {
                start_websocket_server(store, app_handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
