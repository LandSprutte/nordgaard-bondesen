import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { CheckIcon, Loader2Icon } from "lucide-react"

export type SaveState = "idle" | "saving" | "saved" | "error"

/** Save a value and report progress; refreshes route data afterwards. */
export function useAutoSave() {
  const router = useRouter()
  const [state, setState] = React.useState<SaveState>("idle")
  const save = React.useCallback(
    async (fn: () => Promise<unknown>) => {
      setState("saving")
      try {
        await fn()
        setState("saved")
        await router.invalidate()
      } catch (error) {
        console.error("[settings] save failed", error)
        setState("error")
      }
    },
    [router]
  )
  return { state, save }
}

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <Loader2Icon
        className="size-4 animate-spin text-muted-foreground"
        aria-label="Saving"
      />
    )
  }
  if (state === "saved") {
    return <CheckIcon className="size-4 text-emerald-600" aria-label="Saved" />
  }
  if (state === "error") {
    return (
      <span role="alert" className="text-xs text-destructive">
        Not saved
      </span>
    )
  }
  return null
}
