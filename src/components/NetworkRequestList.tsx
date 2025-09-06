import { NetworkRequest } from "@/types";
import { NetworkRequestItem } from "./NetworkRequestItem";
import { EmptyState } from "./EmptyState";

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
    <div className="bg-card flex flex-col overflow-hidden">
      <div className="bg-muted/50 h-18 border-b p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by URL, method, or status..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            className="focus:ring-ring bg-background text-foreground flex-1 rounded-md border px-3 py-2 text-sm transition-all duration-150 focus:ring-2 focus:outline-none"
          />
          <button
            onClick={onClear}
            className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 focus:ring-ring rounded-md border px-4 py-2 text-sm font-medium transition-all duration-150 focus:ring-2 focus:outline-none"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <EmptyState type={requests.length === 0 ? "requests" : "filtered"} />
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
