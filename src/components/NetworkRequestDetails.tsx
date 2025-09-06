import { NetworkRequest } from "@/types";
import { ContentBlock } from "./ContentBlock";
import { useState, useEffect, useRef } from "react";

interface NetworkRequestDetailsProps {
  request: NetworkRequest;
}

export function NetworkRequestDetails({ request }: NetworkRequestDetailsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copiedSections, setCopiedSections] = useState<Record<string, boolean>>(
    {},
  );
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const globalMatchIndexRef = useRef(0);

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

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  const handleScroll = () => {
    if (containerRef.current) {
      setShowScrollTop(containerRef.current.scrollTop > 200);
    }
  };

  const countMatches = (text: string, searchTerm: string): number => {
    if (!searchTerm.trim()) return 0;
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "gi",
    );
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) {
      return text;
    }

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (regex.test(part)) {
        const currentGlobalIndex = globalMatchIndexRef.current;
        globalMatchIndexRef.current++;
        return (
          <mark
            key={`${currentGlobalIndex}-${index}`}
            className={`transition-colors ${
              currentGlobalIndex === currentMatchIndex
                ? "bg-orange-300 text-black"
                : "bg-yellow-300 text-black"
            }`}
            data-search-match={currentGlobalIndex}
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  const navigateToMatch = (direction: "next" | "prev") => {
    if (totalMatches === 0) return;

    let newIndex;
    if (direction === "next") {
      newIndex =
        currentMatchIndex >= totalMatches - 1 ? 0 : currentMatchIndex + 1;
    } else {
      newIndex =
        currentMatchIndex <= 0 ? totalMatches - 1 : currentMatchIndex - 1;
    }

    setCurrentMatchIndex(newIndex);

    // Use setTimeout to ensure DOM is updated after re-render
    setTimeout(() => {
      if (containerRef.current) {
        const targetMark = containerRef.current.querySelector(
          `mark[data-search-match="${newIndex}"]`,
        );
        if (targetMark) {
          targetMark.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }
      }
    }, 100);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  useEffect(() => {
    const containerElement = containerRef.current;
    if (containerElement) {
      containerElement.addEventListener("scroll", handleScroll);
      return () => containerElement.removeEventListener("scroll", handleScroll);
    }
  }, []);

  // Count total matches when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setTotalMatches(0);
      setCurrentMatchIndex(0);
      return;
    }

    let total = 0;
    // Count matches in URL
    total += countMatches(request.url, searchTerm);
    // Count matches in method
    total += countMatches(request.method, searchTerm);
    // Count matches in headers
    if (Object.keys(request.headers).length > 0) {
      total += countMatches(
        JSON.stringify(request.headers, null, 2),
        searchTerm,
      );
    }
    // Count matches in request body
    if (request.body) {
      total += countMatches(request.body, searchTerm);
    }
    // Count matches in response headers
    if (request.response && Object.keys(request.response.headers).length > 0) {
      total += countMatches(
        JSON.stringify(request.response.headers, null, 2),
        searchTerm,
      );
    }
    // Count matches in response body
    if (request.response?.body) {
      total += countMatches(request.response.body, searchTerm);
    }

    setTotalMatches(total);
    setCurrentMatchIndex(0);
  }, [searchTerm, request]);

  // Reset global match index at the start of each render
  globalMatchIndexRef.current = 0;

  return (
    <div className="h-full flex flex-col relative">
      {/* Search Bar */}
      {showSearch && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2">
            <div className="flex items-center gap-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search in details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onBlur={() => {
                  if (!searchTerm.trim()) {
                    setShowSearch(false);
                  }
                }}
              />
              {totalMatches > 0 && (
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                    {currentMatchIndex + 1} of {totalMatches}
                  </span>
                  <button
                    onClick={() => navigateToMatch("prev")}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Previous match"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => navigateToMatch("next")}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Next match"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 px-1">
              Press Esc to close
            </div>
          </div>
        </div>
      )}

      {/* Request Header */}
      <div className="p-4 border-b border-gray-200 h-18 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 text-sm font-medium bg-gray-200 text-gray-800 rounded">
              {highlightText(request.method, searchTerm)}
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
            <pre className="font-mono whitespace-pre-wrap break-all overflow-x-auto pr-12">
              {highlightText(request.url, searchTerm)}
            </pre>
          </div>
        </div>

        {/* Request Headers */}
        {Object.entries(request.headers).length > 0 && (
          <ContentBlock
            title="Request Headers"
            content={JSON.stringify(request.headers, null, 2)}
            searchTerm={searchTerm}
          />
        )}

        {/* Request Body */}
        {request.body && (
          <ContentBlock
            title="Request Body"
            content={request.body}
            searchTerm={searchTerm}
          />
        )}

        {/* Response Headers */}
        {request.response &&
          Object.entries(request.response.headers).length > 0 && (
            <ContentBlock
              title="Response Headers"
              content={JSON.stringify(request.response.headers, null, 2)}
              searchTerm={searchTerm}
            />
          )}

        {/* Response Body */}
        {request.response?.body && (
          <ContentBlock
            title="Response Body"
            content={request.response.body}
            searchTerm={searchTerm}
          />
        )}
      </div>

      {/* Scroll to Top Button - Linear.app style */}
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
