import { format } from "date-fns";
import { parseCsv } from "./csv";
import type { ParsedStatement, StatementRow } from "./types";
import { ImportIdBuilder, StatementParseError } from "./types";
import { parseAmountCents, parseDayMonthYear } from "./values";

/**
 * GLS Bank (DE) CSV export ("Umsätze exportieren"), the standard
 * Atruvia/VR-banking format. Semicolon-delimited with a header row.
 *
 * Two generations are supported, both located by header names rather than
 * column positions (Atruvia ships 18- and 19-column variants):
 *
 * - Current (post-2022): UTF-8 with BOM, header starts with "Bezeichnung
 *   Auftragskonto", counterparty in "Name Zahlungsbeteiligter", signed
 *   "Betrag" with decimal comma (trailing zeros may be dropped: "-20",
 *   "-39,2").
 * - Legacy eBanking: ISO-8859-1, a metadata preamble before the header row
 *   (found by scanning for "Buchungstag"), unsigned "Umsatz" plus a
 *   "Soll/Haben" column ("S" = debit), multi-line "Vorgang/Verwendungszweck".
 */

const DATE_PATTERN = /^\d{1,2}\.\d{1,2}\.\d{4}$/;

interface GlsLayout {
  header: string[];
  headerIndex: number;
  isLegacy: boolean;
}

function findLayout(rows: string[][]): GlsLayout | null {
  // The legacy format has a preamble; scan the first rows for the header
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const cells = rows[i].map((c) => c.trim());
    if (!cells.includes("Buchungstag")) continue;
    if (cells.includes("Name Zahlungsbeteiligter")) {
      return { header: cells, headerIndex: i, isLegacy: false };
    }
    if (cells.includes("Soll/Haben") && cells.includes("Umsatz")) {
      return { header: cells, headerIndex: i, isLegacy: true };
    }
  }
  return null;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function looksLikeGlsStatement(text: string): boolean {
  return findLayout(parseCsv(stripBom(text), ";")) !== null;
}

export function parseGlsStatement(text: string): ParsedStatement {
  const csvRows = parseCsv(stripBom(text), ";");
  const layout = findLayout(csvRows);
  if (!layout) {
    throw new StatementParseError("Not a recognizable GLS Bank export");
  }

  const { header, headerIndex, isLegacy } = layout;
  const col = (name: string) => header.indexOf(name);
  const cell = (fields: string[], name: string) => {
    const index = col(name);
    return index >= 0 ? (fields[index] ?? "").trim() : "";
  };

  // Data rows are the ones whose booking date parses; this skips the legacy
  // format's Anfangssaldo/Endsaldo footer lines.
  const dataRows = csvRows
    .slice(headerIndex + 1)
    .filter((fields) => DATE_PATTERN.test((fields[col("Buchungstag")] ?? "").trim()));

  const idBuilder = new ImportIdBuilder("gls");
  const rows: StatementRow[] = dataRows.map((fields) => {
    const date = parseDayMonthYear(cell(fields, "Buchungstag"), ".");
    const dateIso = format(date, "yyyy-MM-dd");

    let amount: number;
    let rawPayee: string;
    let counterIban: string | null;
    let memo: string;

    if (isLegacy) {
      const unsigned = parseAmountCents(cell(fields, "Umsatz"), ",");
      amount = cell(fields, "Soll/Haben").toUpperCase() === "S" ? -unsigned : unsigned;
      rawPayee =
        cell(fields, "Auftraggeber/Zahlungsempfänger") ||
        cell(fields, "Empfänger/Zahlungspflichtiger") ||
        cell(fields, "Zahlungsempfänger");
      counterIban = cell(fields, "IBAN") || null;
      // Multi-line field; collapse embedded line breaks
      memo = cell(fields, "Vorgang/Verwendungszweck").replace(/\s+/g, " ").trim();
    } else {
      amount = parseAmountCents(cell(fields, "Betrag"), ",");
      rawPayee = cell(fields, "Name Zahlungsbeteiligter");
      counterIban = cell(fields, "IBAN Zahlungsbeteiligter") || null;
      const bookingType = cell(fields, "Buchungstext");
      const reference = cell(fields, "Verwendungszweck").replace(/\s+/g, " ").trim();
      memo = [bookingType, reference].filter(Boolean).join(" · ");
    }

    return {
      date,
      amount,
      rawPayee,
      counterIban,
      memo,
      // The GLS CSV carries no unique booking reference, so ids count
      // occurrences of (date, amount) within the file, YNAB-style.
      importId: idBuilder.next(dateIso, amount),
    };
  });

  return {
    format: "gls",
    accountIban: dataRows[0] ? cell(dataRows[0], "IBAN Auftragskonto") || null : null,
    rows,
  };
}
