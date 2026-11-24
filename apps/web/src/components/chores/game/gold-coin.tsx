import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/** A shiny gold doubloon, sized to the text around it. */
export function GoldCoin({ className }: { className?: string }) {
  const id = React.useId()
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn(
        "inline-block size-[1.1em] shrink-0 align-[-0.15em]",
        className
      )}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff7c2" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#92400e" />
      <circle cx="12" cy="11.4" r="10.4" fill={`url(#${id}-face)`} />
      <circle
        cx="12"
        cy="11.4"
        r="7.4"
        fill="none"
        stroke="#b45309"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path
        d="M12 6.6 13.3 9.9 16.8 10 14.1 12.2 15.1 15.6 12 13.6 8.9 15.6 9.9 12.2 7.2 10 10.7 9.9Z"
        fill="#b45309"
        opacity="0.85"
      />
    </svg>
  )
}
