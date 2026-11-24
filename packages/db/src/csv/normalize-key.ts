/**
 * Turn the bank's "Tekst" column into a stable key so the same merchant or
 * payment always lands in the same bucket, e.g.
 *
 *   "Debitkort DK COMPASS GROUP D" -> "COMPASS GROUP D"
 *   "Spotify P477C389CF"           -> "SPOTIFY"
 *   "Debitkort DK Q8 ODDER, 8084"  -> "Q8 ODDER"
 */
export function normalizeKey(text: string): string {
  let key = text.replace(/\s+/g, " ").trim()

  // Card payment prefixes: "Debitkort DK ...", "Visa/Dankort ...", "Dankort-nota ..."
  key = key.replace(
    /^(debitkort( dk| udl\.?)?|visa\/dankort|dankort-nota)\s+/i,
    ""
  )

  // Trailing terminal / branch numbers: "Q8 ODDER, 8084"
  key = key.replace(/,\s*\d+$/, "")

  // Trailing reference codes that change every month: "Spotify P477C389CF"
  key = key.replace(/\s+(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{6,}$/i, "")

  key = key.trim().toUpperCase()
  return key === "" ? text.trim().toUpperCase() || "(EMPTY)" : key
}
