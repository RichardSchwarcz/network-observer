import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./App.css";
import { NetworkRequest } from "@/types";
import { NetworkRequestList } from "@/components/NetworkRequestList";
import { NetworkRequestDetails } from "@/components/NetworkRequestDetails";
import { ResizableLayout } from "@/components/ResizableLayout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmptyState } from "@/components/EmptyState";

function App() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(
    null
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
      }
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

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      {/* Global Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt="Network Observer"
              className="border-border h-6 w-6 rounded-full border bg-stone-200"
            />
            <h1 className="text-foreground text-xl font-semibold">
              Network Observer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full transition-colors duration-200 ${
                  isListening
                    ? "bg-green-500 shadow-sm shadow-green-200"
                    : "bg-muted-foreground/50"
                }`}
              ></div>
              <span className="text-muted-foreground text-sm font-medium">
                {isListening ? "Connected" : "Waiting for connections..."}
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
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
            <EmptyState type="details" />
          )
        }
        initialLeftWidth={35}
        minLeftWidth={25}
        maxLeftWidth={70}
      />
    </div>
  );
}

export default App;
