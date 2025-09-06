import { JSONTree } from "react-json-tree";

interface ContentBlockProps {
  title: string;
  content: string;
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

export function ContentBlock({ title, content }: ContentBlockProps) {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
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

  const jsonData = tryParseJson(content);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <button
          onClick={() => copyToClipboard(content)}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors"
          title="Copy to clipboard"
        >
          Copy
        </button>
      </div>
      <div className="bg-gray-50 rounded-md p-3 text-sm overflow-hidden">
        {jsonData ? (
          <div className="overflow-x-auto font-mono text-sm">
            <JSONTree
              data={jsonData}
              theme={theme}
              invertTheme={false}
              shouldExpandNodeInitially={() => true}
              hideRoot={true}
              sortObjectKeys={false}
            />
          </div>
        ) : (
          <pre className="font-mono whitespace-pre-wrap break-all overflow-x-auto">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}
