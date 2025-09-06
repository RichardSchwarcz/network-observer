import { useCopyWithFeedback } from "@/utils/clipboard";

interface CopyButtonProps {
  text: string;
  copyKey: string;
  className?: string;
  size?: "sm" | "md";
  title?: string;
}

export function CopyButton({
  text,
  copyKey,
  className = "",
  size = "sm",
  title = "Copy to clipboard",
}: CopyButtonProps) {
  const { copyWithFeedback, isCopied } = useCopyWithFeedback();

  const handleCopy = () => {
    copyWithFeedback(text, copyKey);
  };

  const sizeClasses = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const buttonClasses = size === "sm" ? "p-1.5" : "p-2";

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className={`${buttonClasses} text-muted-foreground hover:text-foreground bg-background hover:border-ring rounded border shadow-sm transition-colors ${className}`}
        title={title}
      >
        <svg
          className={sizeClasses}
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

      {isCopied(copyKey) && (
        <div className="bg-popover text-popover-foreground absolute top-full right-0 z-50 mt-1 rounded border px-2 py-1 text-xs whitespace-nowrap shadow-lg">
          Copied!
        </div>
      )}
    </div>
  );
}
