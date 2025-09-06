import { NetworkRequest } from "@/types";
import { ContentBlock } from "./ContentBlock";
import { useScrollManager } from "@/hooks/useScrollManager";
import { CopyButton } from "./CopyButton";

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
}

export function NetworkRequestDetails({ request }: NetworkRequestDetailsProps) {
  const { containerRef, showScrollTop, scrollToTop } = useScrollManager();

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
    <div className="bg-card relative flex h-full flex-col">
      {/* Request Header */}
      <div className="bg-muted/50 h-18 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-sm font-medium">
              {request.method}
            </span>
            <span
              className={`text-lg font-medium ${getStatusColor(request.response?.status)}`}
            >
              {request.response?.status || "Pending"}
            </span>
          </div>
          <div className="text-muted-foreground text-xs">
            {formatTimestamp(request.timestamp)}
            {request.duration && ` • ${request.duration}ms`}
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div ref={containerRef} className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* Request URL */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-foreground text-lg font-medium">Request URL</h3>
          </div>
          <div className="bg-muted relative overflow-hidden rounded-md p-3 text-sm">
            <div className="absolute top-2 right-2 z-30">
              <CopyButton
                text={request.url}
                copyKey="request-url"
                title="Copy URL"
              />
            </div>
            <div className="pr-12">
              <div className="overflow-x-auto font-mono break-all whitespace-pre-wrap">
                {request.url}
              </div>
            </div>
          </div>
        </div>

        {/* Request Headers */}
        {Object.entries(request.headers).length > 0 && (
          <ContentBlock
            title="Request Headers"
            content={JSON.stringify(request.headers, null, 2)}
          />
        )}

        {/* Request Body */}
        {request.body && (
          <ContentBlock title="Request Body" content={request.body} />
        )}

        {/* Response Headers */}
        {request.response &&
          Object.entries(request.response.headers).length > 0 && (
            <ContentBlock
              title="Response Headers"
              content={JSON.stringify(request.response.headers, null, 2)}
            />
          )}

        {/* Response Body */}
        {request.response?.body && (
          <ContentBlock title="Response Body" content={request.response.body} />
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="bg-background hover:border-ring text-muted-foreground hover:text-foreground fixed right-8 bottom-8 z-20 flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all duration-200 hover:shadow-xl"
          title="Scroll to top"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
