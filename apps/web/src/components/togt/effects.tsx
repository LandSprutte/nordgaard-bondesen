import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

function prefersLessMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const COIN_SVG = `<svg viewBox="0 0 32 32" width="26" height="26"><circle cx="16" cy="16" r="15" fill="#a86c12"/><circle cx="16" cy="15" r="14" fill="#f5b820"/><circle cx="16" cy="15" r="10.5" fill="#ffcf3f" stroke="#c98a14" stroke-width="1.5"/><path d="M16 8.6l1.9 4 4.3.5-3.2 2.9.9 4.3-3.9-2.2-3.9 2.2.9-4.3-3.2-2.9 4.3-.5z" fill="#c4560f"/></svg>`

/** Gold coins flying from a button into the wallet. */
export function flyCoins(from: Element, to: Element | null, count: number) {
  if (!to || prefersLessMotion()) return
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  const x = a.left + a.width / 2
  const y = a.top
  for (let i = 0; i < count; i++) {
    const coin = document.createElement("div")
    coin.className = "tg-fly"
    coin.innerHTML = COIN_SVG
    const startX = x - 13 + (Math.random() * 40 - 20)
    const startY = y - 13 + (Math.random() * 20 - 10)
    Object.assign(coin.style, { left: `${startX}px`, top: `${startY}px` })
    document.body.appendChild(coin)
    const dx = b.left + b.width / 2 - 13 - startX
    const dy = b.top + b.height / 2 - 13 - startY
    const lift = -60 - Math.random() * 60
    coin
      .animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          {
            transform: `translate(${dx * 0.35}px, ${lift}px) scale(1.15)`,
            offset: 0.35,
          },
          { transform: `translate(${dx}px, ${dy}px) scale(0.5)`, opacity: 0.3 },
        ],
        {
          duration: 900,
          delay: i * 60,
          easing: "cubic-bezier(.3,.7,.4,1)",
          fill: "backwards",
        }
      )
      .finished.finally(() => coin.remove())
  }
}

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
