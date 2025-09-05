import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";

interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  response?: NetworkResponse;
  timestamp: number;
  duration?: number;
}

interface NetworkResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body?: string;
}

function App() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(
    null,
  );
  const [searchFilter, setSearchFilter] = useState("");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Load initial requests
    loadRequests();

    // Listen for new requests from WebSocket
    const unlistenRequests = listen<NetworkRequest>("new-request", (event) => {
      setRequests((prev) => [...prev, event.payload]);
      setIsListening(true);
    });

    // Listen for WebSocket connections
    const unlistenConnection = listen<string>(
      "websocket-connected",
      (event) => {
        console.log("WebSocket client connected:", event.payload);
        setIsListening(true);
      },
    );

    return () => {
      unlistenRequests.then((fn) => fn());
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

  const filteredRequests = requests.filter((req) => {
    const searchTerm = searchFilter.toLowerCase();
    return (
      req.url.toLowerCase().includes(searchTerm) ||
      req.method.toLowerCase().includes(searchTerm) ||
      (req.response?.status.toString().includes(searchTerm) ?? false)
    );
  });

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusColor = (status?: number) => {
    if (!status) return "text-gray-500";
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 300 && status < 400) return "text-yellow-600";
    if (status >= 400) return "text-red-600";
    return "text-gray-500";
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900">
              Network Observer
            </h1>
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${isListening ? "bg-green-500" : "bg-gray-400"}`}
              ></div>
              <span className="text-sm text-gray-600">
                {isListening
                  ? "Listening on port 8085"
                  : "Waiting for connections..."}
              </span>
            </div>
          </div>

          {/* Search and Clear */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filter by URL, method, or status..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={clearRequests}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Request List */}
        <div className="flex-1 overflow-y-auto">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {requests.length === 0
                ? "No requests yet. Make sure your React Native app is sending data to localhost:8085"
                : "No requests match your filter"}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                    selectedRequest?.id === request.id
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded">
                        {request.method}
                      </span>
                      <span
                        className={`text-sm font-medium ${getStatusColor(request.response?.status)}`}
                      >
                        {request.response?.status || "Pending"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(request.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600 truncate">
                    {request.url}
                  </div>
                  {request.duration && (
                    <div className="mt-1 text-xs text-gray-500">
                      {request.duration}ms
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <div className="flex-1 bg-white">
        {selectedRequest ? (
          <div className="h-full flex flex-col">
            {/* Request Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-800 rounded">
                  {selectedRequest.method}
                </span>
                <span
                  className={`text-lg font-medium ${getStatusColor(selectedRequest.response?.status)}`}
                >
                  {selectedRequest.response?.status || "Pending"}{" "}
                  {selectedRequest.response?.status_text}
                </span>
              </div>
              <div className="text-sm text-gray-600 break-all">
                {selectedRequest.url}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatTimestamp(selectedRequest.timestamp)}
                {selectedRequest.duration && ` • ${selectedRequest.duration}ms`}
              </div>
            </div>

            {/* Request Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Request Headers */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Request Headers
                </h3>
                <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                  {Object.entries(selectedRequest.headers).length > 0 ? (
                    Object.entries(selectedRequest.headers).map(
                      ([key, value]) => (
                        <div key={key} className="mb-1">
                          <span className="text-gray-600">{key}:</span> {value}
                        </div>
                      ),
                    )
                  ) : (
                    <span className="text-gray-500">No headers</span>
                  )}
                </div>
              </div>

              {/* Request Body */}
              {selectedRequest.body && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Request Body
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap">
                    {selectedRequest.body}
                  </div>
                </div>
              )}

              {/* Response Headers */}
              {selectedRequest.response && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Response Headers
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3 text-sm font-mono">
                    {Object.entries(selectedRequest.response.headers).length >
                    0 ? (
                      Object.entries(selectedRequest.response.headers).map(
                        ([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="text-gray-600">{key}:</span>{" "}
                            {value}
                          </div>
                        ),
                      )
                    ) : (
                      <span className="text-gray-500">No headers</span>
                    )}
                  </div>
                </div>
              )}

              {/* Response Body */}
              {selectedRequest.response?.body && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Response Body
                  </h3>
                  <div className="bg-gray-50 rounded-md p-3 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {selectedRequest.response.body}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📡</div>
              <div>Select a request to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
