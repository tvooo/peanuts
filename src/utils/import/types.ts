import type { Amount } from "@/utils/types";

export type StatementFormat = "asn" | "gls" | "dkb";

export const FORMAT_LABELS: Record<StatementFormat, string> = {
  asn: "ASN Bank",
  gls: "GLS Bank",
  dkb: "DKB",
};

/** A single transaction parsed from a bank statement file. */
export interface StatementRow {
  /** Booking date at local midnight */
  date: Date;
  /** Signed amount in cents (negative = outflow) */
  amount: Amount;
  /** Counterparty name as it appears in the statement (may be empty) */
  rawPayee: string;
  /** Counterparty IBAN, if present */
  counterIban: string | null;
  /** Description / payment reference */
  memo: string;
  /**
   * Stable identifier for duplicate detection. Derived from the statement
   * data so re-importing an overlapping export produces the same id.
   */
  importId: string;
}

export interface ParsedStatement {
  format: StatementFormat;
  /** IBAN of the account the statement belongs to, if the format provides it */
  accountIban: string | null;
  rows: StatementRow[];
}

export class StatementParseError extends Error {}

/**
 * Builds YNAB-style import ids: `PNT:<format>:<yyyy-mm-dd>:<amount>:<n>`
 * where n counts occurrences of the same (date, amount) pair within one
 * file. As long as a bank export contains whole days, the same transaction
 * gets the same id even when two exported date ranges overlap.
 */
export class ImportIdBuilder {
  private counts = new Map<string, number>();

  constructor(private format: StatementFormat) {}

  next(dateIso: string, amount: Amount): string {
    const key = `${dateIso}:${amount}`;
    const n = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, n);
    return `PNT:${this.format}:${key}:${n}`;
  }
}
