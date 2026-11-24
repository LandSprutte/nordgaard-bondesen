import { describe, expect, it } from "vitest"

import { OTHER_GROUPS, groupSlices } from "./group-pie-chart"
import { UNGROUPED } from "@/lib/budget"

const names = (groups: Array<{ name: string }>) => groups.map((g) => g.name)

describe("groupSlices", () => {
  it("gives up to six groups their own colour", () => {
    const all = ["A", "B", "C", "D", "E", "F"]
    const { slices } = groupSlices(
      all.map((name) => ({ name, expenses: 100 })),
      all
    )
    expect(slices.map((s) => s.id)).toEqual([
      "slot1",
      "slot2",
      "slot3",
      "slot4",
      "slot5",
      "slot6",
    ])
  })

  it("keeps a group's colour when the sizes change", () => {
    const all = ["Bolig", "Fun & games", "Mad"]
    const october = groupSlices(
      [
        { name: "Mad", expenses: 900 },
        { name: "Fun & games", expenses: 100 },
      ],
      all
    )
    const november = groupSlices(
      [
        { name: "Mad", expenses: 100 },
        { name: "Fun & games", expenses: 900 },
        { name: "Bolig", expenses: 50 },
      ],
      all
    )
    const idOf = (r: ReturnType<typeof groupSlices>, name: string) =>
      r.slices.find((s) => s.name === name)?.id

    expect(idOf(october, "Fun & games")).toBe(idOf(november, "Fun & games"))
    expect(idOf(october, "Mad")).toBe(idOf(november, "Mad"))
    expect(idOf(november, "Bolig")).toBe("slot1")
  })

  it("puts Ungrouped last and leaves out groups without expenses", () => {
    const { slices } = groupSlices(
      [
        { name: UNGROUPED, expenses: 500 },
        { name: "Fun & games", expenses: 272 },
        { name: "Løn", expenses: 0 },
      ],
      ["Fun & games", "Løn"]
    )
    expect(names(slices)).toEqual(["Fun & games", UNGROUPED])
  })

  it("folds the smallest groups into Other when there are too many", () => {
    const all = ["A", "B", "C", "D", "E", "F", "G", "H"]
    const { slices, config } = groupSlices(
      all.map((name, i) => ({ name, expenses: (i + 1) * 100 })),
      all
    )
    // Five largest keep a colour; the rest share "Other groups".
    expect(names(slices)).toEqual(["D", "E", "F", "G", "H", OTHER_GROUPS])
    expect(slices.at(-1)).toMatchObject({ value: 600, groups: ["C", "B", "A"] })
    expect(Object.keys(config)).toHaveLength(6)
  })
})
