import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { NetworkRequest, AsyncStorageOperation } from "@/types";
import { NetworkRequestList } from "@/components/NetworkRequestList";
import { NetworkRequestDetails } from "@/components/NetworkRequestDetails";
import { ResizableLayout } from "@/components/ResizableLayout";

function App() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(
    null,
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [activeTab, _setActiveTab] = useState<"requests" | "asyncstorage">(
    "requests",
  );
  const [asyncStorageData, setAsyncStorageData] = useState<
    Record<string, string | null>
  >({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [newKey, setNewKey] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const loadAsyncStorageData = async () => {
    try {
      const data = await invoke<Record<string, string | null>>(
        "get_async_storage_data",
      );
      setAsyncStorageData(data);
    } catch (error) {
      console.error("Failed to load AsyncStorage data:", error);
    }
  };

  const sendAsyncStorageCommand = async (
    type: string,
    key?: string,
    value?: string,
  ) => {
    try {
      await invoke("send_async_storage_command", { type, key, value });
    } catch (error) {
      console.error("Failed to send AsyncStorage command:", error);
    }
  };

  const handleAsyncStorageSet = async (key: string, value: string) => {
    await sendAsyncStorageCommand("setItem", key, value);
    await loadAsyncStorageData();
  };

  const handleAsyncStorageRemove = async (key: string) => {
    await sendAsyncStorageCommand("removeItem", key);
    await loadAsyncStorageData();
  };

  const handleAsyncStorageClear = async () => {
    if (
      window.confirm("Are you sure you want to clear all AsyncStorage data?")
    ) {
      await sendAsyncStorageCommand("clear");
      await loadAsyncStorageData();
    }
  };

  const handleAddNew = async () => {
    if (newKey.trim() && newValue.trim()) {
      await sendAsyncStorageCommand("setItem", newKey.trim(), newValue.trim());
      setNewKey("");
      setNewValue("");
      await loadAsyncStorageData();
    }
  };

  const refreshAsyncStorage = async () => {
    await sendAsyncStorageCommand("getAllData");
  };

  useEffect(() => {
    // Load initial requests
    loadRequests();
    loadAsyncStorageData();

    // Listen for new requests from WebSocket
    const unlistenRequests = listen<NetworkRequest>("new-request", (event) => {
      setRequests((prev) => [...prev, event.payload]);
      setIsListening(true);
    });

    // Listen for AsyncStorage operations
    const unlistenAsyncStorage = listen<AsyncStorageOperation>(
      "async-storage-operation",
      (event) => {
        console.log("AsyncStorage operation:", event.payload);
        if (event.payload.type === "getAllData") {
          setAsyncStorageData((prev) => {
            return { ...prev };
          });
        }
        loadAsyncStorageData();
      },
    );

    // Listen for WebSocket connections
    const unlistenConnection = listen<string>(
      "websocket-connected",
      (event) => {
        console.log("WebSocket client connected:", event.payload);
        setIsListening(true);
        // Refresh AsyncStorage data when a new client connects
        setTimeout(() => refreshAsyncStorage(), 1000);
      },
    );

    return () => {
      unlistenRequests.then((fn) => fn());
      unlistenAsyncStorage.then((fn) => fn());
      unlistenConnection.then((fn) => fn());
    };
  }, []);

  const loadRequests = async () => {
    try {
      const reqs = await invoke<NetworkRequest[]>("get_requests");
      setRequests(reqs);
    } catch (error) {
      console.error("Failed to load requests:", error);
    }
  };

  const clearRequests = async () => {
    try {
      await invoke("clear_requests");
      setRequests([]);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Failed to clear requests:", error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Global Header */}
      <div className="bg-white linear-border border-b linear-shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Network Observer
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                  isListening
                    ? "bg-green-500 shadow-sm shadow-green-200"
                    : "bg-gray-400"
                }`}
              ></div>
              <span className="linear-text-sm linear-text-muted font-medium">
                {isListening ? "Connected" : "Waiting for connections..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "requests" ? (
        <ResizableLayout
          leftPanel={
            <NetworkRequestList
              requests={requests}
              selectedRequest={selectedRequest}
              onSelectRequest={setSelectedRequest}
              searchFilter={searchFilter}
              onSearchChange={setSearchFilter}
              onClear={clearRequests}
            />
          }
          rightPanel={
            selectedRequest ? (
              <NetworkRequestDetails request={selectedRequest} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-2xl mb-2">📡</div>
                  <div>Select a request to view details</div>
                </div>
              </div>
            )
          }
          initialLeftWidth={35}
          minLeftWidth={25}
          maxLeftWidth={70}
        />
      ) : (
        <div className="flex-1 bg-white overflow-hidden">
          <div className="h-full flex flex-col">
            {/* AsyncStorage Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  AsyncStorage Manager
                </h1>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${isListening ? "bg-green-500" : "bg-gray-400"}`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {isListening
                      ? "Connected to React Native app"
                      : "Waiting for connections..."}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={refreshAsyncStorage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Refresh
                </button>
                <button
                  onClick={handleAsyncStorageClear}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Clear All
                </button>
              </div>

              {/* Add New Item */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddNew}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* AsyncStorage Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {Object.keys(asyncStorageData).length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-2xl mb-2">📱</div>
                    <div className="text-lg font-medium mb-2">
                      No AsyncStorage data yet
                    </div>
                    <div>
                      Connect your React Native app to view and manage
                      AsyncStorage data
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(asyncStorageData).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {key}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingKey(key);
                              setEditingValue(value || "");
                            }}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleAsyncStorageRemove(key)}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => copyToClipboard(value || "")}
                            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      {editingKey === key ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                            rows={4}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                handleAsyncStorageSet(key, editingValue);
                                setEditingKey(null);
                                setEditingValue("");
                              }}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingKey(null);
                                setEditingValue("");
                              }}
                              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-md p-3 text-sm overflow-hidden">
                          <pre className="font-mono whitespace-pre-wrap break-all overflow-x-auto">
                            {value || "null"}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
