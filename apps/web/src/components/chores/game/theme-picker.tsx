import {
  THEME_LIST,
  setTheme,
  useVoyageTheme,
} from "@/components/chores/game/themes"
import { cn } from "@workspace/ui/lib/utils"

/** Lets whoever is holding the device pick which world the voyage is in. */
export function ThemePicker() {
  const current = useVoyageTheme()
  return (
    <div
      role="group"
      aria-label="Vælg verden"
      className="flex gap-1 rounded-2xl border bg-card p-1 shadow-sm"
    >
      {THEME_LIST.map((theme) => {
        const active = theme.id === current.id
        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={active}
            title={theme.label}
            onClick={() => setTheme(theme.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold transition-[background-color,translate] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:-translate-y-0.5 hover:bg-muted"
            )}
          >
            <span aria-hidden className="text-lg leading-none">
              {theme.emoji}
            </span>
            <span className={cn(!active && "sr-only sm:not-sr-only")}>
              {theme.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
