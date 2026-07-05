import { differenceInCalendarDays } from "date-fns";
import type { Account } from "@/models/Account";
import type { Budget } from "@/models/Budget";
import type { Ledger } from "@/models/Ledger";
import type { Payee } from "@/models/Payee";
import type { Transaction } from "@/models/Transaction";
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
  | { kind: "manual"; transaction: Transaction };

/**
 * Check whether a statement row already exists in the ledger.
 *
 * Exact duplicates are found via the import id. Beyond that, a manually
 * entered transaction (no import id) with the same amount within a few days
 * is offered as a match so importing doesn't double-book it; `claimed` lets
 * the caller ensure each existing transaction is matched by at most one row.
 */
export function findDuplicate(
  ledger: Ledger,
  account: Account,
  row: StatementRow,
  claimed: Set<string>
): DuplicateMatch | null {
  const candidates = ledger.transactions.filter((t) => t.account === account);

  const imported = candidates.find((t) => t.importId === row.importId);
  if (imported) return { kind: "imported", transaction: imported };

  let bestManual: Transaction | null = null;
  let bestDistance = Infinity;
  for (const t of candidates) {
    if (t.importId || claimed.has(t.id)) continue;
    if (t.amount !== row.amount || !t.date) continue;
    const distance = Math.abs(differenceInCalendarDays(t.date, row.date));
    if (distance <= MANUAL_MATCH_WINDOW_DAYS && distance < bestDistance) {
      bestManual = t;
      bestDistance = distance;
    }
  }
  if (bestManual) return { kind: "manual", transaction: bestManual };

  return null;
}
