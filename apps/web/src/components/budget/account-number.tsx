import * as React from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { formatAccountNumber } from "@/lib/format"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

/**
 * An account number that stays blurred until the eye button is clicked,
 * so it isn't readable over someone's shoulder.
 */
export function AccountNumber({
  number,
  className,
}: {
  number: string
  className?: string
}) {
  const [visible, setVisible] = React.useState(false)
  const lastFour = number.slice(-4)

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span
        className={cn(
          "font-mono tabular-nums transition-[filter] duration-150",
          !visible && "blur-xs select-none"
        )}
        aria-hidden={!visible}
      >
        {formatAccountNumber(number)}
      </span>
      {!visible && (
        <span className="sr-only">Account number ending in {lastFour}</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-pressed={visible}
        aria-label={
          visible
            ? `Hide account number ending in ${lastFour}`
            : `Show account number ending in ${lastFour}`
        }
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </span>
  )
}
