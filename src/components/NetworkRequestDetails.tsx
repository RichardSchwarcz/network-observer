import { NetworkRequest } from "@/types";
import { ContentBlock } from "./ContentBlock";
import { JSONTree } from "react-json-tree";

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
}

export function NetworkRequestDetails({ request }: NetworkRequestDetailsProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

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

  const theme = {
    scheme: "light",
    base00: "transparent",
    base01: "#f9fafb",
    base02: "#f3f4f6",
    base03: "#d1d5db",
    base04: "#9ca3af",
    base05: "#6b7280",
    base06: "#374151",
    base07: "#111827",
    base08: "#dc2626",
    base09: "#ea580c",
    base0A: "#d97706",
    base0B: "#059669",
    base0C: "#0891b2",
    base0D: "#2563eb",
    base0E: "#7c3aed",
    base0F: "#be185d",
  };

  return (
    <div className="h-full flex flex-col">
      {/* Request Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-800 rounded">
            {request.method}
          </span>
          <span
            className={`text-lg font-medium ${getStatusColor(request.response?.status)}`}
          >
            {request.response?.status || "Pending"}
          </span>
        </div>

        <div className="text-xs text-gray-500 mt-1">
          {formatTimestamp(request.timestamp)}
          {request.duration && ` • ${request.duration}ms`}
        </div>
      </div>

      {/* Request Details */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Request URL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">Request URL</h3>
            <button
              onClick={() => copyToClipboard(request.url)}
              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
              title="Copy to clipboard"
            >
              Copy
            </button>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden">
            <pre className="font-mono whitespace-pre-wrap break-all overflow-x-auto">
              {request.url}
            </pre>
          </div>
        </div>

        {/* Request Headers */}
        {Object.entries(request.headers).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">
                Request Headers
              </h3>
              <button
                onClick={() =>
                  copyToClipboard(JSON.stringify(request.headers, null, 2))
                }
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                title="Copy to clipboard"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden">
              <div className="overflow-x-auto font-mono text-sm">
                <JSONTree
                  data={request.headers}
                  theme={theme}
                  invertTheme={false}
                  shouldExpandNodeInitially={() => true}
                  hideRoot={true}
                  sortObjectKeys={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Request Body */}
        {request.body && (
          <ContentBlock title="Request Body" content={request.body} />
        )}

        {/* Response Headers */}
        {request.response &&
          Object.entries(request.response.headers).length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Response Headers
                </h3>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(request.response!.headers, null, 2),
                    )
                  }
                  className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
              </div>
              <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden">
                <div className="overflow-x-auto font-mono text-sm">
                  <JSONTree
                    data={request.response.headers}
                    theme={theme}
                    invertTheme={false}
                    shouldExpandNodeInitially={() => true}
                    hideRoot={true}
                    sortObjectKeys={false}
                  />
                </div>
              </div>
            </div>
          )}

        {/* Response Body */}
        {request.response?.body && (
          <ContentBlock title="Response Body" content={request.response.body} />
        )}
      </div>
    </div>
  );
}
