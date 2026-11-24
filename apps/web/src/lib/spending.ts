/**
 * Spending broken down into a tree: category group → category → shop (bank
 * text) → transactions, with each node compared to the previous period and
 * to what's usual (the average of earlier periods).
 */

import { UNCATEGORISED, UNGROUPED } from "@/lib/budget"

/** Joins the parts of a node id. Can't appear in names, unlike "/". */
export const ID_SEPARATOR = "\u001f"

export type SpendingRow = {
  id: string
  /** Index into the periods: 0 = oldest, last = the period being looked at. */
  period: number
  date: string
  /** Money spent, as a positive number. */
  amount: number
  text: string
  description: string | null
  key: string
  label: string | null
  category: string | null
}

export type SpendingTransaction = Pick<
  SpendingRow,
  "id" | "date" | "amount" | "text" | "description"
>

export type SpendingNode = {
  /**
   * Unique within the tree: the path from the top, e.g. group "Food",
   * category "Groceries", shop "REMA 1000", joined by ID_SEPARATOR.
   */
  id: string
  level: "group" | "category" | "shop"
  name: string
  /** Spent in the period. */
  amount: number
  /** Spent in the period before, or null when there's no data for it. */
  previous: number | null
  /** Average of the earlier periods that have data, or null if none. */
  usual: number | null
  /** Number of transactions in the period. */
  count: number
  children: Array<SpendingNode>
  /** Shops only: the period's transactions, newest first. */
  transactions: Array<SpendingTransaction>
}

/** Spending at least this much over usual counts as "over". */
export const OVER_RATIO = 1.2
/** …and at least this many kroner, so tiny amounts don't raise alarms. */
export const OVER_MIN = 100

export type Verdict = "over" | "under" | "usual" | "new" | "unknown"

/** How spending compares to what's usual. */
export function verdict(amount: number, usual: number | null): Verdict {
  if (usual === null) return "unknown"
  if (usual === 0) return amount >= OVER_MIN ? "new" : "usual"
  if (amount >= usual * OVER_RATIO && amount - usual >= OVER_MIN) return "over"
  if (amount <= usual / OVER_RATIO && usual - amount >= OVER_MIN) return "under"
  return "usual"
}

type Builder = {
  id: string
  level: SpendingNode["level"]
  name: string
  sums: Array<number>
  count: number
  children: Map<string, Builder>
  transactions: Array<SpendingTransaction>
}

function builder(
  id: string,
  level: SpendingNode["level"],
  name: string,
  periods: number
): Builder {
  return {
    id,
    level,
    name,
    sums: Array.from({ length: periods }, () => 0),
    count: 0,
    children: new Map(),
    transactions: [],
  }
}

/**
 * Builds the tree. `periodHasData[i]` says whether period i has any
 * transactions at all, so a quiet month counts as 0 rather than unknown.
 * Without groups the tree starts at categories.
 */
export function buildSpendingTree({
  rows,
  periodHasData,
  groupOf,
}: {
  rows: Array<SpendingRow>
  periodHasData: Array<boolean>
  /** Category → group. Empty when no groups are set up. */
  groupOf: Map<string, string>
}): { total: SpendingNode; nodes: Array<SpendingNode> } {
  const n = periodHasData.length
  const current = n - 1
  const useGroups = groupOf.size > 0
  const root = builder("all", "group", "All spending", n)

  const child = (
    parent: Builder,
    level: SpendingNode["level"],
    name: string
  ) => {
    let node = parent.children.get(name)
    if (!node) {
      const prefix = parent === root ? "" : `${parent.id}${ID_SEPARATOR}`
      node = builder(`${prefix}${level[0]}:${name}`, level, name, n)
      parent.children.set(name, node)
    }
    return node
  }

  for (const row of rows) {
    const category = row.category ?? UNCATEGORISED
    const top = useGroups
      ? child(root, "group", groupOf.get(category) ?? UNGROUPED)
      : root
    const path = [
      root,
      ...(useGroups ? [top] : []),
      child(top, "category", category),
    ]
    const shop = child(path[path.length - 1], "shop", row.label ?? row.key)
    path.push(shop)
    for (const node of path) {
      node.sums[row.period] += row.amount
      if (row.period === current) node.count++
    }
    if (row.period === current) {
      shop.transactions.push({
        id: row.id,
        date: row.date,
        amount: row.amount,
        text: row.text,
        description: row.description,
      })
    }
  }

  const earlier = periodHasData
    .slice(0, current)
    .flatMap((has, i) => (has ? [i] : []))

  const finish = (b: Builder): SpendingNode => ({
    id: b.id,
    level: b.level,
    name: b.name,
    amount: b.sums[current],
    previous: n > 1 && periodHasData[current - 1] ? b.sums[current - 1] : null,
    usual:
      earlier.length > 0
        ? earlier.reduce((sum, i) => sum + b.sums[i], 0) / earlier.length
        : null,
    count: b.count,
    // Only what was spent in this period; the rest is still in the totals.
    children: [...b.children.values()]
      .filter((c) => c.sums[current] > 0)
      .map(finish)
      .sort((a, z) => z.amount - a.amount || a.name.localeCompare(z.name)),
    transactions: b.transactions.sort(
      (a, z) => z.date.localeCompare(a.date) || z.amount - a.amount
    ),
  })

  const total = finish(root)
  return { total, nodes: total.children }
}

/** Every node in the tree, depth first. */
export function flatten(nodes: Array<SpendingNode>): Array<SpendingNode> {
  return nodes.flatMap((node) => [node, ...flatten(node.children)])
}
