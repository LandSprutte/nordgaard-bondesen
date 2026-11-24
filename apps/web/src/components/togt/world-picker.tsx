import {
  THEME_LIST,
  setTheme,
  useVoyageTheme,
} from "@/components/chores/game/themes"

/** Lets whoever holds the device pick which world the game is in. */
export function WorldPicker() {
  const current = useVoyageTheme()
  return (
    <div className="tg-picker" role="group" aria-label="Vælg verden">
      {THEME_LIST.map((theme) => (
        <button
          key={theme.id}
          type="button"
          aria-pressed={theme.id === current.id}
          title={theme.label}
          onClick={() => setTheme(theme.id)}
        >
          <span aria-hidden className="tg-pi">
            {theme.emoji}
          </span>
          <span className="tg-pl">{theme.label}</span>
        </button>
      ))}
    </div>
  )
}
