import { differenceInCalendarDays } from "date-fns";
import type { Account } from "@/models/Account";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import type { Payee } from "@/models/Payee";
import type { Transaction } from "@/models/Transaction";
import type { Transfer } from "@/models/Transfer";
import type { StatementRow } from "./types";

/** How many days a manually entered transaction may differ from the bank's booking date */
const MANUAL_MATCH_WINDOW_DAYS = 5;

export function normalizePayeeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export type PayeeMatchConfidence = "alias" | "exact" | "fuzzy";

export interface PayeeMatch {
  payee: Payee;
  confidence: PayeeMatchConfidence;
}

/**
 * Resolve a raw counterparty name from a statement to a known payee.
 *
 * 1. `alias`: the raw name was previously confirmed for this payee during an
 *    import (Payee.importNames).
 * 2. `exact`: the normalized raw name equals a payee's name.
 * 3. `fuzzy`: a payee's name occurs inside the raw name (banks append
 *    location/branch suffixes, e.g. "ALBERT HEIJN 1376 UTRECHT").
 *    The longest matching payee name wins.
 */
export function resolvePayee(ledger: Ledger, rawPayee: string): PayeeMatch | null {
  const normalized = normalizePayeeName(rawPayee);
  if (!normalized) return null;

  for (const payee of ledger.payees) {
    if (payee.importNames.some((n) => normalizePayeeName(n) === normalized)) {
      return { payee, confidence: "alias" };
    }
  }

  for (const payee of ledger.payees) {
    if (normalizePayeeName(payee.name) === normalized) {
      return { payee, confidence: "exact" };
    }
  }

  let best: Payee | null = null;
  let bestLength = 0;
  for (const payee of ledger.payees) {
    const name = normalizePayeeName(payee.name);
    // Require some substance so "V&D" doesn't match everything containing "v"
    if (name.length < 4) continue;
    if (normalized.includes(name) && name.length > bestLength) {
      best = payee;
      bestLength = name.length;
    }
  }
  if (best) return { payee: best, confidence: "fuzzy" };

  return null;
}

/** Suggest a budget for a resolved payee based on its most recent transaction. */
export function suggestBudget(ledger: Ledger, payee: Payee | null): Budget | null {
  if (!payee) return null;
  return ledger.getLastBudgetForPayee(payee.id) ?? null;
}

export type DuplicateMatch =
  /** Already imported: an existing transaction carries the same import id */
  | { kind: "imported"; transaction: Transaction }
  /** Likely the same transaction, entered manually before the import */
  | { kind: "manual"; transaction: Transaction }
  /** Already imported: this account's side of a transfer carries the same import id */
  | { kind: "imported-transfer"; transfer: Transfer }
  /** Likely the same movement, entered manually as a transfer before the import */
  | { kind: "manual-transfer"; transfer: Transfer };

/** True for the matches that mean "this row is already in the ledger, skip it". */
export function isAlreadyImported(match: DuplicateMatch | null): boolean {
  return match?.kind === "imported" || match?.kind === "imported-transfer";
}

/**
 * Check whether a statement row already exists in the ledger.
 *
 * Exact duplicates are found via the import id. Beyond that, a manually
 * entered transaction or transfer (no import id) with the same amount within
 * a few days is offered as a match so importing doesn't double-book it;
 * `claimed` lets the caller ensure each existing entry is matched by at most
 * one row.
 *
 * Transfers are matched from the perspective of `account`: only the side that
 * this statement belongs to is considered, since the other account's statement
 * carries a different import id for the same transfer.
 */
export function findDuplicate(
  ledger: Ledger,
  account: Account,
  row: StatementRow,
  claimed: Set<string>
): DuplicateMatch | null {
  const transactions = ledger.transactions.filter((t) => t.account === account);
  const transfers = ledger.transfers.filter((t) => t.sideFor(account) !== null);

  const imported = transactions.find((t) => t.importId === row.importId);
  if (imported) return { kind: "imported", transaction: imported };

  const importedTransfer = transfers.find((t) => t.importIdFor(account) === row.importId);
  if (importedTransfer) return { kind: "imported-transfer", transfer: importedTransfer };

  let bestManual: DuplicateMatch | null = null;
  let bestDistance = Infinity;

  const consider = (date: Date | null, match: DuplicateMatch) => {
    if (!date) return;
    const distance = Math.abs(differenceInCalendarDays(date, row.date));
    if (distance <= MANUAL_MATCH_WINDOW_DAYS && distance < bestDistance) {
      bestManual = match;
      bestDistance = distance;
    }
  };

  for (const t of transactions) {
    if (t.importId || claimed.has(t.id)) continue;
    if (t.amount !== row.amount) continue;
    consider(t.date, { kind: "manual", transaction: t });
  }

  for (const t of transfers) {
    if (t.importIdFor(account) || claimed.has(t.id)) continue;
    if (t.signedAmountFor(account) !== row.amount) continue;
    consider(t.date, { kind: "manual-transfer", transfer: t });
  }

  return bestManual;
}
