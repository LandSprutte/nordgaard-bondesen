const dkk = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
})

/** 1234.5 -> "1.234,50 kr." */
export function formatMoney(amount: number): string {
  return dkk.format(amount)
}

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number) as [number, number]
  return new Date(Date.UTC(year, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

/** "2026-10-01" -> "1 Oct" */
export function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
}

/** "92330003317536" -> "9233 0003317536" (reg. no. + account no.) */
export function formatAccountNumber(number: string): string {
  return /^\d{14}$/.test(number)
    ? `${number.slice(0, 4)} ${number.slice(4)}`
    : number
}

export function accountDisplayName(account: {
  number: string
  name: string | null
}): string {
  return account.name ?? `Account ••${account.number.slice(-4)}`
}

const percentFormat = new Intl.NumberFormat("da-DK", {
  style: "percent",
  maximumFractionDigits: 1,
})

/** 0.123 -> "12,3 %"; with `sign`, positive values get a "+". */
export function formatPercent(
  value: number,
  { sign = false }: { sign?: boolean } = {}
): string {
  const text = percentFormat.format(value)
  return sign && value > 0 ? `+${text}` : text
}
