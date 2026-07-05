# Recurring Transactions

How scheduled / recurring transactions work in Peanuts.

## Model

A **`RecurringTemplate`** (`src/models/RecurringTemplate.ts`) describes a
repeating transaction:

| Field | Meaning |
| --- | --- |
| `rruleString` | The recurrence rule, e.g. `FREQ=MONTHLY;BYMONTHDAY=1` (parsed with [`rrule`](https://github.com/jkbrzt/rrule)). |
| `startDate` | When the schedule begins. Used as the RRULE `dtstart`, so it also anchors interval-based rules (e.g. "every 2 weeks"). |
| `endDate` | Optional. No occurrences are generated after this date. |
| `lastGeneratedDate` | **Watermark.** The occurrence date of the most recently materialized transaction. `null` means nothing has been generated yet. |
| `account`, `amount`, `budget`, `payee`, `note` | The payload copied into each generated transaction. |

Generated transactions are ordinary `Transaction`s linked back to their template
via `recurringTemplateId`. Once created, they are owned by the user — editing,
re-dating, clearing, or deleting one never causes it to be regenerated.

`nextScheduledDate` (a stored field) and per-run advancement of it were
**removed**. The next upcoming date shown in the UI is now a computed getter,
`RecurringTemplate.nextOccurrence` (the first occurrence on or after today,
clamped to `endDate`).

## Generation

All generation goes through `processRecurringTemplates(ledger, now?)`
(`src/utils/recurringTransactions.ts`).

### Invariant

After a run, for every template the ledger contains exactly one transaction per
occurrence in the half-open range `(lastGeneratedDate, horizon]`, where:

- **`horizon`** = the first occurrence **strictly after today** — the single
  upcoming instance the user should see, and
- occurrences are clamped to `endDate`.

`lastGeneratedDate` is the **single source of truth** for what has run.
Generation never inspects existing transactions to decide what to create — it
only walks the schedule forward from the watermark. This is what makes it
correct and idempotent.

### Algorithm

```
horizon = first occurrence strictly after endOfDay(now)   // null => schedule exhausted, skip
cursor  = lastGeneratedDate ?? (startDate - 1 day)         // so the first occurrence is included
loop:
    occ = first occurrence strictly after cursor
    stop if occ is null, or occ > horizon, or (endDate && occ > endDate)
    create a transaction at occ (linked via recurringTemplateId)
    lastGeneratedDate = occ
    cursor = occ
if anything was created: ledger.incrementVersion()   // marks dirty -> auto-saved
```

### Behaviour

- **Repeated runs on the same day create nothing.** After a run the watermark
  equals the horizon, so the next run's loop terminates immediately. *(This is
  the fix for the bug where a new future transaction was created on every load.)*
- **Backfill.** Opening the app after a gap creates every missed past
  occurrence, then the single next upcoming one.
- **Always one ahead.** Because `horizon` is the next occurrence after today,
  there is always exactly one upcoming generated transaction (and never more
  than one).
- **User edits stick.** Deleting or moving a generated transaction does not
  regenerate it — the watermark has already passed that occurrence.
- **Schedule changes** affect generation from the watermark forward; they do not
  retroactively delete already-generated transactions.

## When it runs

- **On load:** from `App.tsx`, inside the auto-save effect, *after* the MobX
  save reaction is established and after `markClean()`. Order matters: running it
  afterwards means the `incrementVersion()` from generation marks the ledger
  dirty and gets persisted by auto-save. (The `useRecurringTransactions` hook no
  longer does the initial run, precisely to avoid running before the reaction
  exists.)
- **Across midnight:** `useRecurringTransactions` (`src/hooks/`) polls once a
  minute and re-runs generation when the calendar day changes, so a
  long-running session still picks up newly-due occurrences.

## Persistence & schema

`lastGeneratedDate` is serialized as a plain `YYYY-MM-DD` string
(`last_generated_date`) via the shared `serializeDate`/`deserializeDate` helpers.

The **v3 migration** (`src/models/migrations.ts`) converts existing ledgers:
for each template it seeds `last_generated_date` from the latest date among that
template's existing transactions (or `null` if none) and drops the obsolete
`next_scheduled_date`. This guarantees no existing instance is regenerated and
none is skipped.

> **Note on ledgers affected by the old bug:** a buggy ledger may already hold
> several surplus future transactions (one per future occurrence). After
> migration the watermark sits at the latest of them, so no *new* ones are
> generated, but you should delete the surplus future instances by hand.

## Tests

- `src/utils/recurringTransactions.test.ts` — generation, including the
  idempotency regression test, backfill, the one-ahead invariant, `endDate`,
  and "deleting a generated transaction does not regenerate it".
- `src/models/RecurringTemplate.test.ts` — `calculateNextOccurrence` across
  frequencies and exhausted schedules.
- `src/models/migrations.test.ts` — v3 watermark seeding.

Tests pass a fixed `now` to `processRecurringTemplates` for determinism.
