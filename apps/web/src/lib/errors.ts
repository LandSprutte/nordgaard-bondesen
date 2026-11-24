/**
 * A message from a failed server call that's fit to show: the first
 * validation message, the server's own message, or a generic one for
 * anything technical.
 */
export function errorMessage(
  err: unknown,
  fallback = "Det gik galt. Prøv igen."
): string {
  const message = err instanceof Error ? err.message.trim() : ""
  if (!message) return fallback
  if (message.startsWith("[")) {
    try {
      const issues = JSON.parse(message) as Array<{ message?: string }>
      return issues[0]?.message ?? fallback
    } catch {
      return fallback
    }
  }
  // Database and other internal errors aren't for users.
  if (message.includes("\n") || /invocation|prisma/i.test(message))
    return fallback
  return message
}
