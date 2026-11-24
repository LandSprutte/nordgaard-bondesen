import { createHash } from "node:crypto"

import { normalizeKey } from "./normalize-key"

/** One transaction row from the bank's CSV export. */
export type BankRow = {
  /** The account the row belongs to ("Exportkonto"). */
  account: string
  /** ISO date, e.g. "2026-10-01". */
  date: string
  /** Decimal string with "." separator. Negative = money out. */
  amount: string
  /** Account balance after this row, decimal string. */
  balance: string
  /** Raw "Tekst" column. */
  text: string
  /** Normalised text used to group similar rows. */
  key: string
  /** The other account involved, when known. */
  counterparty: string | null
  payer: string | null
  note: string | null
  receiverText: string | null
  /** Money moved between two accounts that are both in the export. */
  isInternalTransfer: boolean
  /** Stable id for de-duplicating re-uploaded rows. */
  fingerprint: string
}

const COLUMNS = {
  sender: "Afsenderkonto",
  account: "Exportkonto",
  receiver: "Modtagerkonto",
  date: "Dato",
  text: "Tekst",
  amount: "Beløb",
  balance: "Saldo",
  payer: "Indbetaler",
  note: "Supp. tekst til modtager",
  receiverText: "Tekst til modtager",
} as const

export class BankCsvError extends Error {}

/**
 * Decode the raw file. Danish bank exports are usually Windows-1252 / Latin-1,
 * but accept UTF-8 too in case the file was re-saved.
 */
export function decodeBankCsv(bytes: Uint8Array): string {
  let text: string
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes)
  }
  return text.replace(/^\uFEFF/, "")
}

/** Split `;`-separated CSV text into rows of fields, honouring double quotes. */
export function splitCsv(text: string, delimiter = ";"): Array<Array<string>> {
  const rows: Array<Array<string>> = []
  let row: Array<string> = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((value) => value.trim() !== ""))
}

/** "-1.551,00" -> "-1551.00" */
export function parseDanishAmount(value: string): string {
  const cleaned = value.trim().replace(/\./g, "").replace(",", ".")
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new BankCsvError(`Could not read amount "${value}"`)
  }
  return cleaned
}

/** "01-10-2026" -> "2026-10-01" */
export function parseDanishDate(value: string): string {
  const match = /^(\d{2})[-.](\d{2})[-.](\d{4})$/.exec(value.trim())
  if (!match) throw new BankCsvError(`Could not read date "${value}"`)
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

/** Parse a bank export (already decoded to text) into typed rows. */
export function parseBankCsv(text: string): Array<BankRow> {
  const [header, ...lines] = splitCsv(text)
  if (!header) throw new BankCsvError("The file is empty")

  const columnIndex = new Map(header.map((name, i) => [name.trim(), i]))
  const index = (name: string) => {
    const i = columnIndex.get(name)
    if (i === undefined) {
      throw new BankCsvError(
        `Missing column "${name}". Is this an export from the bank?`
      )
    }
    return i
  }
  const col = Object.fromEntries(
    Object.entries(COLUMNS).map(([field, name]) => [field, index(name)])
  ) as Record<keyof typeof COLUMNS, number>

  const occurrences = new Map<string, number>()

  const rows = lines.map((cells, lineNo): BankRow => {
    const get = (i: number) => cells[i] ?? ""
    try {
      const account = get(col.account).trim()
      if (!account) throw new BankCsvError("Missing Exportkonto")
      const sender = emptyToNull(get(col.sender))
      const receiver = emptyToNull(get(col.receiver))
      const date = parseDanishDate(get(col.date))
      const amount = parseDanishAmount(get(col.amount))
      const balance = parseDanishAmount(get(col.balance))
      const rawText = get(col.text).trim()

      // Outgoing rows carry the other side in Modtagerkonto, incoming in Afsenderkonto.
      const other = sender === account ? receiver : sender
      const counterparty = other === account ? null : other

      // Two otherwise identical rows in one file are both real, so count them.
      const base = [account, date, amount, balance, rawText].join("|")
      const occurrence = (occurrences.get(base) ?? 0) + 1
      occurrences.set(base, occurrence)

      return {
        account,
        date,
        amount,
        balance,
        text: rawText,
        key: normalizeKey(rawText),
        counterparty,
        payer: emptyToNull(get(col.payer)),
        note: emptyToNull(get(col.note)),
        receiverText: emptyToNull(get(col.receiverText)),
        isInternalTransfer: false,
        fingerprint: createHash("sha256")
          .update(`${base}|${occurrence}`)
          .digest("hex"),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // +2: header line, 1-based numbering.
      throw new BankCsvError(`Line ${lineNo + 2}: ${message}`)
    }
  })

  markInternalTransfers(rows)
  return rows
}

/**
 * Flag rows that move money between two accounts that are both in the export,
 * so they don't count as income or expenses.
 *
 * - Outgoing rows name the receiving account, so those are easy.
 * - Incoming rows often have no sender. Pair them with an outgoing row from
 *   another of our accounts on the same day, for the same amount, sent to it.
 */
export function markInternalTransfers(rows: Array<BankRow>): void {
  const own = new Set(rows.map((row) => row.account))

  for (const row of rows) {
    if (row.counterparty && own.has(row.counterparty)) {
      row.isInternalTransfer = true
    }
  }

  const unpairedOutgoing = rows.filter(
    (row) => row.isInternalTransfer && row.amount.startsWith("-")
  )
  const isCandidate = (out: BankRow, incoming: BankRow) =>
    out.counterparty === incoming.account &&
    out.date === incoming.date &&
    Number(out.amount) === -Number(incoming.amount)

  // First pass: the sender's "Tekst til modtager" is exactly what the receiving
  // account shows, which disambiguates same-day transfers of the same amount.
  // Second pass: fall back to date + amount alone.
  for (const strict of [true, false]) {
    for (const incoming of rows) {
      if (incoming.isInternalTransfer || incoming.amount.startsWith("-")) {
        continue
      }
      const match = unpairedOutgoing.findIndex(
        (out) =>
          isCandidate(out, incoming) &&
          (!strict || out.receiverText === incoming.text)
      )
      if (match === -1) continue
      incoming.isInternalTransfer = true
      unpairedOutgoing.splice(match, 1)
    }
  }
}
