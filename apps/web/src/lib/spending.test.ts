import { describe, expect, it } from "vitest"

import { ID_SEPARATOR, buildSpendingTree, flatten, verdict } from "./spending"
import type { SpendingRow } from "./spending"

let id = 0
function row(
  period: number,
  amount: number,
  category: string | null,
  key = "SHOP"
): SpendingRow {
  return {
    id: String(id++),
    period,
    date: `2026-0${period + 1}-15`,
    amount,
    text: key,
    description: null,
    key,
    label: null,
    category,
  }
}

describe("buildSpendingTree", () => {
  const rows = [
    // Two earlier months, then the one being looked at (period 2).
    row(0, 100, "Groceries", "REMA"),
    row(1, 300, "Groceries", "REMA"),
    row(2, 500, "Groceries", "REMA"),
    row(2, 50, "Groceries", "NETTO"),
    row(2, 80, "Pizza", "MULLES"),
    row(1, 999, "Car", "Q8"),
    row(2, 20, null, "MYSTERY"),
  ]

  it("nests groups, categories and shops with totals", () => {
    const { total, nodes } = buildSpendingTree({
      rows,
      periodHasData: [true, true, true],
      groupOf: new Map([
        ["Groceries", "Food"],
        ["Pizza", "Food"],
      ]),
    })
    expect(total.amount).toBe(650)
    expect(nodes.map((n) => [n.name, n.amount])).toEqual([
      ["Food", 630],
      ["Ungrouped", 20],
    ])
    const food = nodes[0]
    expect(food.children.map((c) => c.name)).toEqual(["Groceries", "Pizza"])
    const groceries = food.children[0]
    expect(groceries.children.map((c) => [c.name, c.amount])).toEqual([
      ["REMA", 500],
      ["NETTO", 50],
    ])
    expect(groceries.children[0].transactions).toHaveLength(1)
    expect(groceries.count).toBe(2)
  })

  it("compares with the previous period and the usual average", () => {
    const { nodes } = buildSpendingTree({
      rows,
      periodHasData: [true, true, true],
      groupOf: new Map(),
    })
    const groceries = nodes.find((n) => n.name === "Groceries")
    expect(groceries?.previous).toBe(300)
    expect(groceries?.usual).toBe(200)
    // Car had nothing this month, so it isn't listed, but counts in totals.
    expect(nodes.some((n) => n.name === "Car")).toBe(false)
  })

  it("counts quiet periods as 0 and skips periods without data", () => {
    const { nodes } = buildSpendingTree({
      rows: [row(2, 100, "Pizza")],
      periodHasData: [false, true, true],
      groupOf: new Map(),
    })
    expect(nodes[0].previous).toBe(0)
    expect(nodes[0].usual).toBe(0)
    const first = buildSpendingTree({
      rows: [row(0, 100, "Pizza")],
      periodHasData: [true],
      groupOf: new Map(),
    })
    expect(first.nodes[0].previous).toBeNull()
    expect(first.nodes[0].usual).toBeNull()
  })

  it("keeps ids intact when names contain slashes", () => {
    const { nodes } = buildSpendingTree({
      rows: [row(0, 1, "Fastfood/Restaurant", "A/S")],
      periodHasData: [true],
      groupOf: new Map(),
    })
    const shop = nodes[0].children[0]
    expect(shop.id.split(ID_SEPARATOR)).toEqual([
      "c:Fastfood/Restaurant",
      "s:A/S",
    ])
  })

  it("gives every node a unique id", () => {
    const { nodes } = buildSpendingTree({
      rows: [row(0, 1, "A", "X"), row(0, 1, "B", "X")],
      periodHasData: [true],
      groupOf: new Map(),
    })
    const ids = flatten(nodes).map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("verdict", () => {
  it("flags spending well over usual", () => {
    expect(verdict(1300, 1000)).toBe("over")
    expect(verdict(1100, 1000)).toBe("usual")
    // 50% over, but only 50 kr.
    expect(verdict(150, 100)).toBe("usual")
    expect(verdict(500, 1000)).toBe("under")
    expect(verdict(500, 0)).toBe("new")
    expect(verdict(500, null)).toBe("unknown")
  })
})
