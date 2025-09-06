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
      className={`p-3 linear-border border-b linear-hover cursor-pointer transition-all duration-150 ${
        isSelected
          ? "bg-blue-50 border-l-2 border-l-blue-500 linear-shadow-sm"
          : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 linear-text-xs font-medium bg-gray-100 text-gray-700 rounded-md">
            {request.method}
          </span>
          <span
            className={`status-indicator ${getStatusStyle(request.response?.status)}`}
          >
            {request.response?.status || "Pending"}
          </span>
          {request.response?.status &&
            hasGraphQLErrors(request.response.body) && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded border border-red-200">
                GQL ERROR
              </span>
            )}
        </div>
        <span className="linear-text-xs linear-text-muted">
          {formatTimestamp(request.timestamp)}
        </span>
      </div>
      <div
        className="linear-text-sm text-gray-800 truncate font-medium mb-1"
        title={request.url}
      >
        {request.url}
      </div>
      {request.duration && (
        <div className="linear-text-xs linear-text-muted">
          {request.duration}ms
        </div>
      )}
    </div>
  );
}
