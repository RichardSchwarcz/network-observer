import { NetworkRequest } from "@/types";
import { NetworkRequestItem } from "./NetworkRequestItem";

interface NetworkRequestListProps {
  requests: NetworkRequest[];
  selectedRequest: NetworkRequest | null;
  onSelectRequest: (request: NetworkRequest) => void;
  searchFilter: string;
  onSearchChange: (filter: string) => void;
  onClear: () => void;
}

export function NetworkRequestList({
  requests,
  selectedRequest,
  onSelectRequest,
  searchFilter,
  onSearchChange,
  onClear,
}: NetworkRequestListProps) {
  const filteredRequests = requests.filter((req) => {
    const searchTerm = searchFilter.toLowerCase();
    return (
      req.url.toLowerCase().includes(searchTerm) ||
      req.method.toLowerCase().includes(searchTerm) ||
      (req.response?.status.toString().includes(searchTerm) ?? false)
    );
  });

  return (
    <div className="flex flex-col overflow-hidden bg-white">
      <div className="p-4 linear-border border-b bg-gray-50/50 h-18">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by URL, method, or status..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-3 py-2 linear-text-sm linear-border border rounded-md linear-focus transition-all duration-150 bg-white"
          />
          <button
            onClick={onClear}
            className="px-4 py-2 linear-text-sm font-medium bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 linear-focus transition-all duration-150"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center linear-text-muted">
            <div className="text-3xl mb-3">📡</div>
            <div className="linear-text-sm">
              {requests.length === 0
                ? "No requests yet. Make sure your React Native app is sending data to localhost:8085"
                : "No requests match your filter"}
            </div>
          </div>
        ) : (
          <div>
            {filteredRequests
              .slice()
              .reverse()
              .map((request) => (
                <NetworkRequestItem
                  key={request.id}
                  request={request}
                  isSelected={selectedRequest?.id === request.id}
                  onSelect={onSelectRequest}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
