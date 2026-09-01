import { format } from "date-fns";
import { parseCsv, stripBom } from "./csv";
import type { ParsedStatement, StatementRow } from "./types";
import { ImportIdBuilder, StatementParseError } from "./types";
import { parseAmountCents, parseDayMonthYear } from "./values";

/**
 * DKB (Deutsche Kreditbank) CSV export ("Umsätze exportieren").
 *
 * Two generations are supported, both located by header names:
 *
 * - Current (2023+ banking): UTF-8 with BOM, comma- or semicolon-delimited,
 *   account preamble (`"Girokonto";"DE…"`, "Kontostand vom …"), header
 *   starts with "Buchungsdatum", dates as dd.MM.yy, signed "Betrag (€)"
 *   with decimal comma (a trailing "€" may appear). The counterparty
 *   depends on direction: "Zahlungsempfänger*in" for outflows,
 *   "Zahlungspflichtige*r" for inflows.
 * - Legacy (pre-2023): ISO-8859-1, semicolon-delimited, "Kontonummer:"
 *   preamble, counterparty in "Auftraggeber / Begünstigter", signed
 *   "Betrag (EUR)", dates as dd.MM.yyyy.
 */

const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.(\d{2}|\d{4})$/;

interface DkbLayout {
  rows: string[][];
  header: string[];
  headerIndex: number;
  isLegacy: boolean;
}

function findLayout(text: string): DkbLayout | null {
  // The current export ships with either delimiter; try both
  for (const delimiter of [";", ","]) {
    const rows = parseCsv(text, delimiter);
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const cells = rows[i].map((c) => c.trim());
      if (cells.includes("Buchungsdatum") && cells.includes("Umsatztyp")) {
        return { rows, header: cells, headerIndex: i, isLegacy: false };
      }
      if (cells.includes("Buchungstag") && cells.includes("Auftraggeber / Begünstigter")) {
        return { rows, header: cells, headerIndex: i, isLegacy: true };
      }
    }
  }
  return null;
}

/**
 * The account IBAN appears in the preamble: `"Girokonto";"DE…"` in the
 * current format, `"Kontonummer:";"DE… / Girokonto"` in the legacy one.
 */
function findAccountIban(preambleRows: string[][]): string | null {
  for (const row of preambleRows) {
    for (const rawCell of row) {
      const match = rawCell.replace(/\s+/g, "").match(/^[A-Z]{2}\d{2}[A-Z0-9]{8,30}/);
      if (match) return match[0];
    }
  }
  return null;
}

export function looksLikeDkbStatement(text: string): boolean {
  return findLayout(stripBom(text)) !== null;
}

export function parseDkbStatement(text: string): ParsedStatement {
  const layout = findLayout(stripBom(text));
  if (!layout) {
    throw new StatementParseError("Not a recognizable DKB export");
  }

  const { rows: csvRows, header, headerIndex, isLegacy } = layout;
  const col = (name: string) => header.indexOf(name);
  const cell = (fields: string[], name: string) => {
    const index = col(name);
    return index >= 0 ? (fields[index] ?? "").trim() : "";
  };

  const dateColumn = isLegacy ? "Buchungstag" : "Buchungsdatum";
  const dataRows = csvRows.slice(headerIndex + 1).filter((fields) => {
    if (!DATE_PATTERN.test((fields[col(dateColumn)] ?? "").trim())) return false;
    // Pending rows ("Vorgemerkt") may still change or disappear; skip them
    return isLegacy || cell(fields, "Status") !== "Vorgemerkt";
  });

  const idBuilder = new ImportIdBuilder("dkb");
  const rows: StatementRow[] = dataRows.map((fields) => {
    const date = parseDayMonthYear(cell(fields, dateColumn), ".");
    const dateIso = format(date, "yyyy-MM-dd");

    let amount: number;
    let rawPayee: string;
    let counterIban: string | null;
    let memo: string;

    if (isLegacy) {
      amount = parseAmountCents(cell(fields, "Betrag (EUR)"), ",");
      rawPayee = cell(fields, "Auftraggeber / Begünstigter");
      counterIban = null;
      const bookingType = cell(fields, "Buchungstext");
      const reference = cell(fields, "Verwendungszweck").replace(/\s+/g, " ").trim();
      memo = [bookingType, reference].filter(Boolean).join(" · ");
    } else {
      amount = parseAmountCents(cell(fields, "Betrag (€)").replace(/\s*€$/, ""), ",");
      rawPayee =
        amount > 0 ? cell(fields, "Zahlungspflichtige*r") : cell(fields, "Zahlungsempfänger*in");
      counterIban = cell(fields, "IBAN") || null;
      memo = cell(fields, "Verwendungszweck").replace(/\s+/g, " ").trim();
    }

    return {
      date,
      amount,
      rawPayee,
      counterIban,
      memo,
      // The DKB CSV carries no unique booking reference, so ids count
      // occurrences of (date, amount) within the file, YNAB-style.
      importId: idBuilder.next(dateIso, amount),
    };
  });

  return {
    format: "dkb",
    accountIban: findAccountIban(csvRows.slice(0, headerIndex)),
    rows,
  };
}
