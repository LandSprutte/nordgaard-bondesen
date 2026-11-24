/** A fitting emoji for a chore, guessed from its title (English or Danish). */
const ICONS: Array<[RegExp, string]> = [
  [/bath|toilet|bad|toilet/i, "🛁"],
  [/floor|hoover|vacuum|gulv|støvsug|sweep|fej/i, "🧹"],
  [/dish|opvask|dishwasher|service/i, "🍽️"],
  [/laundry|clothes|vasketøj|tøj|fold/i, "🧺"],
  [/trash|garbage|bin|skrald|affald|recycl/i, "🗑️"],
  [/plant|garden|have|lawn|græs|weed|ukrudt/i, "🌿"],
  [/dog|cat|pet|hund|kat|fish|fisk/i, "🐾"],
  [/bed|seng/i, "🛏️"],
  [/window|vindue/i, "🪟"],
  [/cook|dinner|lunch|aftensmad|mad|bake|bag/i, "🍳"],
  [/car|bil/i, "🚗"],
  [/shop|groceries|indkøb|handle/i, "🛒"],
  [/dust|støv|wipe|tør af/i, "🧽"],
  [/room|værelse|tidy|rydde|ryd/i, "🧸"],
  [/homework|lektier|read|læs/i, "📚"],
]

export function questIcon(title: string): string {
  return ICONS.find(([pattern]) => pattern.test(title))?.[1] ?? "📜"
}
