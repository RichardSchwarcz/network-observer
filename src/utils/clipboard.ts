export interface CopyState {
  [key: string]: boolean;
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    } catch (fallbackError) {
      console.error("Fallback copy method failed:", fallbackError);
      return false;
    }
  }
};

export const useCopyWithFeedback = () => {
  const [copiedStates, setCopiedStates] = React.useState<CopyState>({});

  const copyWithFeedback = async (
    text: string,
    key: string
  ): Promise<boolean> => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedStates((prev) => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
    return success;
  };

  const isCopied = (key: string) => copiedStates[key] || false;

  return { copyWithFeedback, isCopied };
};

// React import for the hook
import * as React from "react";
