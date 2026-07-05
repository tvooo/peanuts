import { format } from "date-fns";
import { parseCsv } from "./csv";
import type { ParsedStatement, StatementRow } from "./types";
import { ImportIdBuilder, StatementParseError } from "./types";
import { parseAmountCentsFlexible, parseDayMonthYear } from "./values";

/**
 * ASN Bank (NL) transaction export.
 *
 * Per ASN's "Bestandsbeschrijving export bestand ASN Online Bankieren":
 * 19 fields, no header row, dates as dd-mm-jjjj (leading zeros not
 * guaranteed), amounts with a dot decimal separator and sign for
 * debit/credit. Two dialects: "CSV" (comma-delimited, single-quoted text)
 * and "CSV 2004" (semicolon-delimited, double-quoted text).
 *
 * The current online banking additionally offers "Met kolomtitels in de
 * eerste rij" (header row, skipped) and "Met categorie-omschrijving", which
 * appends ASN's own category as a 20th column.
 *
 * Fields used (0-based): 0 booking date, 1 own IBAN, 2 counterparty IBAN,
 * 3 counterparty name, 10 amount, 15 sequence number, 16 payment reference,
 * 17 description.
 */

const FIELD_COUNT = 19;
const FIELD_COUNT_WITH_CATEGORY = 20;
const DATE_PATTERN = /^\d{1,2}-\d{1,2}-\d{4}$/;

const DIALECTS = [
  { delimiter: ",", quote: "'" }, // "CSV"
  { delimiter: ";", quote: '"' }, // "CSV 2004"
];

function parseRows(text: string): string[][] | null {
  for (const dialect of DIALECTS) {
    const rows = parseCsv(text, dialect.delimiter, dialect.quote);
    if (rows.length === 0) continue;
    // Tolerate a header line some tools prepend; the documented format has none
    const dataRows = DATE_PATTERN.test(rows[0][0]?.trim() ?? "") ? rows : rows.slice(1);
    if (dataRows.length === 0) continue;
    if (
      dataRows.every(
        (r) =>
          (r.length === FIELD_COUNT || r.length === FIELD_COUNT_WITH_CATEGORY) &&
          DATE_PATTERN.test(r[0].trim())
      )
    ) {
      return dataRows;
    }
  }
  return null;
}

export function looksLikeAsnStatement(text: string): boolean {
  return parseRows(text) !== null;
}

export function parseAsnStatement(text: string): ParsedStatement {
  const dataRows = parseRows(text);
  if (!dataRows) {
    throw new StatementParseError("Not a recognizable ASN Bank export");
  }

  const idBuilder = new ImportIdBuilder("asn");
  const rows: StatementRow[] = dataRows.map((fields) => {
    const date = parseDayMonthYear(fields[0], "-");
    const dateIso = format(date, "yyyy-MM-dd");
    const amount = parseAmountCentsFlexible(fields[10]);

    // Card/contactless payments leave the counterparty name empty; the
    // merchant is then the part of the description before ">".
    let rawPayee = fields[3].trim();
    if (!rawPayee) {
      rawPayee = fields[17].split(">")[0].trim();
    }

    const reference = fields[16].trim();
    const description = fields[17].trim();
    const memo = [reference, description].filter(Boolean).join(" · ");

    // The sequence number (Volgnummer transactie) uniquely identifies the
    // booking; fall back to date+amount occurrence counting if absent.
    const sequenceNumber = fields[15].trim();
    const importId = sequenceNumber
      ? `PNT:asn:${dateIso}:${sequenceNumber}`
      : idBuilder.next(dateIso, amount);

    return {
      date,
      amount,
      rawPayee,
      counterIban: fields[2].trim() || null,
      memo,
      importId,
    };
  });

  return {
    format: "asn",
    accountIban: dataRows[0]?.[1]?.trim() || null,
    rows,
  };
}
