import { JSONTree } from "react-json-tree";
import { useState } from "react";

interface ContentBlockProps {
  title: string;
  content: string;
  searchTerm?: string;
}

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

export function ContentBlock({
  title,
  content,
  searchTerm = "",
}: ContentBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const tryParseJson = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(
      `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-300 text-black">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const jsonData = tryParseJson(content);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      </div>

      <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden relative">
        <div className="absolute top-2 right-2 z-30">
          <button
            onClick={() => copyToClipboard(content)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors bg-white rounded border border-gray-200 hover:border-gray-300 shadow-sm"
            title="Copy to clipboard"
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
          {copied && (
            <div className="absolute top-full right-0 mt-1 px-2 py-1 text-xs bg-gray-800 text-white rounded shadow-lg z-50 whitespace-nowrap">
              Copied!
            </div>
          )}
        </div>

        <div className="pr-12">
          {jsonData ? (
            <div className="overflow-x-auto font-mono text-sm">
              <JSONTree
                data={jsonData}
                theme={theme}
                invertTheme={false}
                shouldExpandNodeInitially={() => true}
                hideRoot={true}
                sortObjectKeys={false}
                getItemString={(_type, _data, _itemType, itemString) => {
                  if (!searchTerm.trim()) return <span>{itemString}</span>;
                  const regex = new RegExp(
                    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                    "gi",
                  );
                  const parts = itemString.split(regex);
                  return (
                    <span>
                      {parts.map((part, index) =>
                        regex.test(part) ? (
                          <mark
                            key={index}
                            className="bg-yellow-300 text-black"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  );
                }}
                labelRenderer={(keyPath, _nodeType, _expanded, _expandable) => {
                  const key = keyPath[0];
                  const keyString = String(key);
                  if (!searchTerm.trim()) return <span>{keyString}:</span>;
                  const regex = new RegExp(
                    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                    "gi",
                  );
                  const parts = keyString.split(regex);
                  return (
                    <span>
                      {parts.map((part, index) =>
                        regex.test(part) ? (
                          <mark
                            key={index}
                            className="bg-yellow-300 text-black"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        ),
                      )}
                      :
                    </span>
                  );
                }}
                valueRenderer={(displayValue, _rawValue, ..._keyPath) => {
                  const valueString = String(displayValue);
                  if (!searchTerm.trim()) return <span>{valueString}</span>;
                  const regex = new RegExp(
                    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
                    "gi",
                  );
                  const parts = valueString.split(regex);
                  return (
                    <span>
                      {parts.map((part, index) =>
                        regex.test(part) ? (
                          <mark
                            key={index}
                            className="bg-yellow-300 text-black"
                          >
                            {part}
                          </mark>
                        ) : (
                          part
                        ),
                      )}
                    </span>
                  );
                }}
              />
            </div>
          ) : (
            <pre className="font-mono whitespace-pre-wrap break-all overflow-x-auto">
              {highlightText(content, searchTerm)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
