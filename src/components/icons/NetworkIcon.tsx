interface NetworkIconProps {
  className?: string;
}

export function NetworkIcon({ className = "w-16 h-16" }: NetworkIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Satellite dish */}
      <ellipse
        cx="32"
        cy="30"
        rx="20"
        ry="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-30"
      />
      <ellipse
        cx="32"
        cy="30"
        rx="15"
        ry="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-50"
      />
      <ellipse
        cx="32"
        cy="30"
        rx="10"
        ry="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="opacity-70"
      />

      {/* Center point */}
      <circle cx="32" cy="30" r="2" fill="currentColor" />

      {/* Base */}
      <line
        x1="32"
        y1="30"
        x2="32"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="26"
        y1="50"
        x2="38"
        y2="50"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Signal waves */}
      <path
        d="M20 16 L24 12 M44 12 L48 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-60"
      />
      <path
        d="M16 20 L20 16 M44 16 L48 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="opacity-40"
      />
    </svg>
  );
}
