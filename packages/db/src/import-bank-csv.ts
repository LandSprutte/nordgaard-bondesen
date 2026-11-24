import { decodeBankCsv, parseBankCsv } from "./csv"
import type { BankRow } from "./csv"
import type { PrismaClient } from "./generated/prisma/client"

export type ImportResult = {
  importId: string
  rowCount: number
  /** Rows not seen before. Re-uploading the same file gives 0. */
  createdCount: number
  accounts: Array<string>
  newKeys: Array<string>
}

/**
 * Import a bank CSV export. Safe to run repeatedly with overlapping files:
 * rows already in the family's books are skipped.
 */
export async function importBankCsv(
  prisma: PrismaClient,
  familyId: string,
  file: { name: string; bytes: Uint8Array }
): Promise<ImportResult> {
  const rows = parseBankCsv(decodeBankCsv(file.bytes))
  const accounts = [...new Set(rows.map((row) => row.account))]

  return prisma.$transaction(async (tx) => {
    await tx.account.createMany({
      data: accounts.map((number) => ({ familyId, number })),
      skipDuplicates: true,
    })

    const existingKeys = new Set(
      (
        await tx.textKey.findMany({
          where: { familyId, key: { in: rows.map((row) => row.key) } },
          select: { key: true },
        })
      ).map((k) => k.key)
    )
    const newKeys = keyDefaults(rows).filter((k) => !existingKeys.has(k.key))
    await tx.textKey.createMany({
      data: newKeys.map((k) => ({ ...k, familyId })),
      skipDuplicates: true,
    })

    const batch = await tx.import.create({
      data: {
        familyId,
        fileName: file.name,
        rowCount: rows.length,
        createdCount: 0,
      },
    })

    const { count } = await tx.transaction.createMany({
      data: rows.map((row) => ({
        familyId,
        accountNumber: row.account,
        date: new Date(`${row.date}T00:00:00Z`),
        amount: row.amount,
        balance: row.balance,
        text: row.text,
        key: row.key,
        counterparty: row.counterparty,
        payer: row.payer,
        note: row.note,
        receiverText: row.receiverText,
        isInternalTransfer: row.isInternalTransfer,
        fingerprint: row.fingerprint,
        importId: batch.id,
      })),
      skipDuplicates: true,
    })

    await tx.import.update({
      where: { id: batch.id },
      data: { createdCount: count },
    })

    // Keep each account's balance at its newest known value.
    for (const latest of latestRowPerAccount(rows)) {
      const date = new Date(`${latest.date}T00:00:00Z`)
      await tx.account.updateMany({
        where: {
          familyId,
          number: latest.account,
          OR: [{ balanceDate: null }, { balanceDate: { lte: date } }],
        },
        data: { balance: latest.balance, balanceDate: date },
      })
    }

    return {
      importId: batch.id,
      rowCount: rows.length,
      createdCount: count,
      accounts,
      newKeys: newKeys.map((k) => k.key),
    }
  })
}

/** New keys start as transfers when every row with that key was one. */
function keyDefaults(rows: Array<BankRow>) {
  const byKey = new Map<string, boolean>()
  for (const row of rows) {
    byKey.set(row.key, (byKey.get(row.key) ?? true) && row.isInternalTransfer)
  }
  return [...byKey].map(([key, isTransfer]) => ({ key, isTransfer }))
}

/** The last row (by date, then file order) for each account. */
export function latestRowPerAccount(rows: Array<BankRow>): Array<BankRow> {
  const latest = new Map<string, BankRow>()
  for (const row of rows) {
    const current = latest.get(row.account)
    if (!current || row.date >= current.date) latest.set(row.account, row)
  }
  return [...latest.values()]
}
