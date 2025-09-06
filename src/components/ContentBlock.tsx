import { JSONTree } from "react-json-tree";
import { useTheme } from "@/hooks/useTheme";
import { CopyButton } from "./CopyButton";

interface ContentBlockProps {
  title: string;
  content: string;
}

const lightTheme = {
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

const darkTheme = {
  scheme: "dark",
  base00: "transparent",
  base01: "#1f2937",
  base02: "#374151",
  base03: "#4b5563",
  base04: "#6b7280",
  base05: "#9ca3af",
  base06: "#d1d5db",
  base07: "#f9fafb",
  base08: "#f87171",
  base09: "#fb923c",
  base0A: "#fbbf24",
  base0B: "#34d399",
  base0C: "#22d3ee",
  base0D: "#60a5fa",
  base0E: "#a78bfa",
  base0F: "#f472b6",
};

export function ContentBlock({ title, content }: ContentBlockProps) {
  const { theme } = useTheme();

  const tryParseJson = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const jsonData = tryParseJson(content);
  const jsonTheme = theme === "dark" ? darkTheme : lightTheme;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-foreground text-lg font-medium">{title}</h3>
      </div>

      <div className="bg-muted relative overflow-hidden rounded-md p-3 text-sm">
        <div className="absolute top-2 right-2 z-30">
          <CopyButton
            text={content}
            copyKey={`content-${title.toLowerCase().replace(/\s+/g, "-")}`}
            title="Copy to clipboard"
          />
        </div>

        <div className="pr-12">
          {jsonData ? (
            <div className="overflow-x-auto font-mono text-sm">
              <JSONTree
                data={jsonData}
                theme={jsonTheme}
                invertTheme={false}
                shouldExpandNodeInitially={() => true}
                hideRoot={true}
                sortObjectKeys={false}
              />
            </div>
          ) : (
            <div className="text-foreground overflow-x-auto font-mono break-all whitespace-pre-wrap">
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
