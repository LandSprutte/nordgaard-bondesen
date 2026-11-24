import { describe, expect, it } from "vitest"

import { decodeBankCsv, parseBankCsv, splitCsv } from "./parse-bank-csv"
import { normalizeKey } from "./normalize-key"

const HEADER =
  '"Afsenderkonto";"Exportkonto";"Modtagerkonto";"Dato";"Tekst";"Beløb";"Saldo";"Indbetaler";"Supp. tekst til modtager";"Tekst til modtager";'

// Synthetic rows in the bank's format (main account 1111, budget 2222, savings 3333).
const SAMPLE = [
  HEADER,
  '"1111";"1111";"";01-10-2026;"BS TRYG";-789,42; 65434,82;"";"MOTORKØRETØJSFORSIKRING; gælder til 01.11";"";',
  '"1111";"1111";"2222";01-10-2026;"Budget";-5000,00; 60434,82;"";"";"Lønkonto";',
  '"";"2222";"2222";01-10-2026;"Lønkonto"; 5000,00; 93359,76;"";"";"Lønkonto";',
  '"1111";"1111";"";01-10-2026;"Spotify P477C389CF";-119,00; 60315,82;"";"";"";',
  '"1111";"1111";"";02-10-2026;"Debitkort DK COMPASS GROUP D";-29,00; 60286,82;"";"";"";',
  '"1111";"1111";"";02-10-2026;"Debitkort DK COMPASS GROUP D";-29,00; 60286,82;"";"";"";',
  '"DK99";"1111";"1111";09-10-2026;"Overførsel"; 1.103,00; 61389,82;"";"";"";',
  // Two same-day +2000 deposits into savings; only the second came from 1111.
  '"";"3333";"3333";01-10-2026;"Fra AM"; 2000,00; 48598,00;"";"";"";',
  '"";"3333";"3333";01-10-2026;"Fra Stjernekonto"; 2000,00; 50598,00;"";"";"Fra Stjernekonto";',
  '"1111";"1111";"3333";01-10-2026;"Til Ferie konto";-2000,00; 59389,82;"";"";"Fra Stjernekonto";',
].join("\r\n")

function latin1(text: string): Uint8Array {
  return Uint8Array.from(text, (char) => char.charCodeAt(0))
}

describe("decodeBankCsv", () => {
  it("decodes Latin-1 exports", () => {
    expect(decodeBankCsv(latin1("Beløb"))).toBe("Beløb")
  })

  it("decodes UTF-8 with BOM", () => {
    const bytes = new TextEncoder().encode("﻿Beløb")
    expect(decodeBankCsv(bytes)).toBe("Beløb")
  })
})

describe("splitCsv", () => {
  it("keeps delimiters inside quotes and handles escaped quotes", () => {
    expect(splitCsv('"a;b";"say ""hi""";3\r\n')).toEqual([
      ["a;b", 'say "hi"', "3"],
    ])
  })
})

describe("parseBankCsv", () => {
  const rows = parseBankCsv(decodeBankCsv(latin1(SAMPLE)))

  it("parses every row with Danish numbers and dates", () => {
    expect(rows).toHaveLength(10)
    expect(rows[0]).toMatchObject({
      account: "1111",
      date: "2026-10-01",
      amount: "-789.42",
      balance: "65434.82",
      key: "BS TRYG",
      counterparty: null,
      note: "MOTORKØRETØJSFORSIKRING; gælder til 01.11",
    })
    expect(rows[6]?.amount).toBe("1103.00")
  })

  it("uses the other account as counterparty", () => {
    expect(rows[1]?.counterparty).toBe("2222")
    expect(rows[6]?.counterparty).toBe("DK99")
  })

  it("flags transfers between exported accounts, including the receiving side", () => {
    expect(rows[1]?.isInternalTransfer).toBe(true)
    expect(rows[2]?.isInternalTransfer).toBe(true)
    expect(rows[6]?.isInternalTransfer).toBe(false)
  })

  it("pairs same-day transfers of equal amounts by the receiver text", () => {
    expect(rows[7]).toMatchObject({ text: "Fra AM", isInternalTransfer: false })
    expect(rows[8]).toMatchObject({
      text: "Fra Stjernekonto",
      isInternalTransfer: true,
    })
    expect(rows[9]?.isInternalTransfer).toBe(true)
  })

  it("gives identical rows different, stable fingerprints", () => {
    expect(rows[4]?.fingerprint).not.toBe(rows[5]?.fingerprint)
    const again = parseBankCsv(decodeBankCsv(latin1(SAMPLE)))
    expect(again.map((r) => r.fingerprint)).toEqual(
      rows.map((r) => r.fingerprint)
    )
  })

  it("explains which column is missing", () => {
    expect(() => parseBankCsv("Dato;Tekst\n01-10-2026;x")).toThrow(
      /Missing column "Afsenderkonto"/
    )
  })

  it("reports the line of a bad value", () => {
    const bad = `${HEADER}\r\n"1111";"1111";"";2026-10-01;"X";-1,00;1,00;"";"";"";`
    expect(() => parseBankCsv(bad)).toThrow(/Line 2: Could not read date/)
  })
})

describe("normalizeKey", () => {
  it.each([
    ["Debitkort DK COMPASS GROUP D", "COMPASS GROUP D"],
    ["Spotify P477C389CF", "SPOTIFY"],
    ["Debitkort DK Q8 ODDER, 8084", "Q8 ODDER"],
    ["MobilePay: Coop App", "MOBILEPAY: COOP APP"],
    ["1PASSWORD", "1PASSWORD"],
    ["BS AKADEMIKERNES A-KASSE", "BS AKADEMIKERNES A-KASSE"],
    ["Debitkort DK L@VBJERG SUPERM", "L@VBJERG SUPERM"],
    ["LØNOVERFØRSEL", "LØNOVERFØRSEL"],
  ])("%s -> %s", (text, key) => {
    expect(normalizeKey(text)).toBe(key)
  })
})
