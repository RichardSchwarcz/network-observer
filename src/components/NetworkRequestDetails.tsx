import { NetworkRequest } from "@/types";
import { ContentBlock } from "./ContentBlock";
import { useState } from "react";
import { useScrollManager } from "@/hooks/useScrollManager";

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
}

export function NetworkRequestDetails({ request }: NetworkRequestDetailsProps) {
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>(
    {},
  );

  const { containerRef, showScrollTop, scrollToTop } = useScrollManager();

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSections((prev) => ({ ...prev, [sectionId]: true }));
      setTimeout(() => {
        setCopiedSections((prev) => ({ ...prev, [sectionId]: false }));
      }, 2000);
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

  return (
    <div className="h-full flex flex-col relative">
      {/* Request Header */}
      <div className="p-4 border-b border-gray-200 h-18 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-800 rounded">
              {request.method}
            </span>
            <span
              className={`text-lg font-medium ${getStatusColor(request.response?.status)}`}
            >
              {request.response?.status || "Pending"}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {formatTimestamp(request.timestamp)}
            {request.duration && ` • ${request.duration}ms`}
          </div>
        </div>
      </div>

      {/* Request Details */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Request URL */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">Request URL</h3>
          </div>
          <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden relative">
            <div className="absolute top-2 right-2 z-30">
              <button
                onClick={() => copyToClipboard(request.url, "url")}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded border border-gray-200 hover:border-gray-300 shadow-sm"
                title="Copy URL"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              {copiedSections.url && (
                <div className="absolute top-full right-0 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg z-50 whitespace-nowrap">
                  Copied!
                </div>
              )}
            </div>
            <div className="pr-12">
              <div className="font-mono whitespace-pre-wrap break-all overflow-x-auto">
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
          className="fixed bottom-8 right-8 w-10 h-10 bg-white border border-gray-200 hover:border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-gray-600 hover:text-gray-800 z-20"
          title="Scroll to top"
        >
          <svg
            className="w-5 h-5"
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
