import { NetworkIcon } from "./icons/NetworkIcon";

interface EmptyStateProps {
  type: "requests" | "details" | "filtered";
  title?: string;
  description?: string;
}

export function EmptyState({ type, title, description }: EmptyStateProps) {
  const getContent = () => {
    switch (type) {
      case "requests":
        return {
          title: title || "Ready to capture requests",
          description:
            description ||
            "Connect your React Native app to localhost:8085 to start monitoring network traffic.",
          icon: <NetworkIcon className="text-muted-foreground/50 h-20 w-20" />,
          steps: [
            "Install the network interceptor in your React Native app",
            "Configure it to send data to localhost:8085",
            "Make some network requests to see them here",
          ],
        };
      case "details":
        return {
          title: title || "Select a request to view details",
          description:
            description ||
            "Click on any request from the list to see headers, body, and response details.",
          icon: (
            <div className="bg-muted/30 flex h-20 w-20 items-center justify-center rounded-2xl">
              <svg
                className="text-muted-foreground/50 h-10 w-10"
                viewBox="0 0 24 24"
                fill="none"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 9h6m-6 4h4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ),
          steps: [],
        };
      case "filtered":
        return {
          title: title || "No matching requests",
          description:
            description ||
            "Try adjusting your search terms or clearing the filter to see all requests.",
          icon: (
            <div className="bg-muted/30 flex h-20 w-20 items-center justify-center rounded-2xl">
              <svg
                className="text-muted-foreground/50 h-10 w-10"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="m21 21-4.35-4.35"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11h6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ),
          steps: [],
        };
    }
  };

  const content = getContent();

  return (
    <div className="bg-card flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-6">{content.icon}</div>

      <h2 className="text-foreground mb-3 text-xl font-semibold">
        {content.title}
      </h2>

      <p className="text-muted-foreground mb-8 max-w-md leading-relaxed">
        {content.description}
      </p>

      {content.steps.length > 0 && (
        <div className="bg-muted/30 max-w-lg rounded-xl p-6">
          <h3 className="text-foreground mb-4 font-medium">Getting started:</h3>
          <ol className="space-y-3 text-left">
            {content.steps.map((step, index) => (
              <li
                key={index}
                className="text-muted-foreground flex items-start gap-3 text-sm"
              >
                <span className="bg-primary/10 text-primary mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
