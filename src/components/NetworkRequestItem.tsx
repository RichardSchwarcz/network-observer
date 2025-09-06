import { NetworkRequest } from "@/types";

interface NetworkRequestItemProps {
  request: NetworkRequest;
  isSelected: boolean;
  onSelect: (request: NetworkRequest) => void;
}

export function NetworkRequestItem({
  request,
  isSelected,
  onSelect,
}: NetworkRequestItemProps) {
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getStatusStyle = (status?: number) => {
    if (!status) return "text-gray-500";
    if (status >= 200 && status < 300) return "status-200";
    if (status >= 300 && status < 400) return "status-300";
    if (status >= 400) return "status-400";
    return "text-gray-500";
  };

  const hasGraphQLErrors = (responseBody?: string): boolean => {
    if (!responseBody) return false;
    try {
      const parsed = JSON.parse(responseBody);
      return Array.isArray(parsed.errors) && parsed.errors.length > 0;
    } catch {
      return false;
    }
  };

  return (
    <div
      onClick={() => onSelect(request)}
      className={`hover:bg-muted/50 cursor-pointer border-b p-3 transition-all duration-150 ${
        isSelected
          ? "bg-muted border-l-primary border-l-2"
          : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium">
            {request.method}
          </span>
          <span
            className={`status-indicator ${getStatusStyle(request.response?.status)}`}
          >
            {request.response?.status || "Pending"}
          </span>
          {request.response?.status &&
            hasGraphQLErrors(request.response.body) && (
              <span className="bg-destructive/10 text-destructive border-destructive/20 rounded border px-1.5 py-0.5 text-xs font-medium">
                GQL ERROR
              </span>
            )}
        </div>
        <span className="text-muted-foreground text-xs">
          {formatTimestamp(request.timestamp)}
        </span>
      </div>
      <div
        className="text-foreground mb-1 truncate text-sm font-medium"
        title={request.url}
      >
        {request.url}
      </div>
      {request.duration && (
        <div className="text-muted-foreground text-xs">
          {request.duration}ms
        </div>
      )}
    </div>
  );
}
