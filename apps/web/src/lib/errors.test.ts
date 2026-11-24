import { describe, expect, it } from "vitest"

import { errorMessage } from "@/lib/errors"

describe("errorMessage", () => {
  it("keeps a plain server message", () => {
    expect(errorMessage(new Error("Du kan ikke fjerne dig selv."))).toBe(
      "Du kan ikke fjerne dig selv."
    )
  })

  it("picks the first validation message", () => {
    const zod = JSON.stringify([
      { message: "Kodeordet skal være mindst 8 tegn." },
    ])
    expect(errorMessage(new Error(zod))).toBe(
      "Kodeordet skal være mindst 8 tegn."
    )
  })

  it("hides database errors", () => {
    const prisma = "\nInvalid `tx.weekChore.findUniqueOrThrow()` invocation"
    expect(errorMessage(new Error(prisma), "Nej")).toBe("Nej")
  })

  it("falls back for non-errors", () => {
    expect(errorMessage("boom", "Nej")).toBe("Nej")
  })
})
