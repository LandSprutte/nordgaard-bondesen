import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

type Toast = { id: number; content: React.ReactNode }

/** A message that slides up from the bottom for a couple of seconds. */
export function useToast() {
  const [toast, setToast] = React.useState<Toast | null>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (!toast) return
    setShown(true)
    const timer = setTimeout(() => setShown(false), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  const show = React.useCallback((content: React.ReactNode) => {
    setToast((prev) => ({ id: (prev?.id ?? 0) + 1, content }))
  }, [])

  const element = (
    <div
      className={cn("tg-toast", shown && "is-shown")}
      role="status"
      aria-live="polite"
    >
      {toast?.content}
    </div>
  )
  return { show, element }
}

/** Restarts a one-shot CSS animation class each time `play` goes up. */
export function useReplay<T extends HTMLElement>(
  play: number,
  className: string
) {
  const ref = React.useRef<T>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!play || !el) return
    el.classList.remove(className)
    void el.offsetWidth
    el.classList.add(className)
  }, [play, className])
  return ref
}
