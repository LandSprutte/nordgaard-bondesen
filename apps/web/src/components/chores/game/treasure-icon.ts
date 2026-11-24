/** A fitting emoji for a treasure, guessed from its name (English or Danish). */
const ICONS: Array<[RegExp, string]> = [
  [/slik|candy|sweets|chocolate|chokolade|bolsje/i, "🍬"],
  [/is\b|ice ?cream|softice/i, "🍦"],
  [/lego/i, "🧱"],
  [/tivoli|land|park|tur|trip|zoo/i, "🎢"],
  [/pizza/i, "🍕"],
  [/burger|mcd|restaurant|spise ude/i, "🍔"],
  [/film|movie|bio|cinema/i, "🎬"],
  [/game|spil|playstation|switch|xbox|minecraft|roblox/i, "🎮"],
  [/skærm|screen|ipad|tablet|tv/i, "📱"],
  [/bog|book/i, "📚"],
  [/legetøj|toy|bamse/i, "🧸"],
  [/penge|money|kroner|kr\b|cash/i, "💰"],
  [/sleepover|overnat/i, "🏕️"],
  [/kage|cake|dessert/i, "🍰"],
]

export function treasureIcon(title: string): string {
  return ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? "💎"
}
