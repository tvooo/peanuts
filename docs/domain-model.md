# Peanuts — Domain Model & Calculations

This document describes every domain term Peanuts uses and how each derived value is
calculated, so the definitions can be reviewed independently of the code. It reflects the
current implementation in `src/models/` — file/line references are given so each claim can
be checked against the source.

> **Review note:** several calculations encode judgement calls (especially what counts as
> "income" and how transfers are treated). Those are called out in **⚖️ Convention** boxes.
> If you disagree with one, that's the thing to change.

---

## 0. Foundations

- **All amounts are integer cents.** `1234` means `12,34 €`. (`src/utils/formatting.ts`)
- **The file is the source of truth.** Everything below is derived in-memory from the
  JSON collections (`accounts`, `budgets`, `transactions`, `transaction_postings`,
  `assignments`, `transfers`, `goals`, `budget_categories`, …) via
  `Ledger.fromJSON` / `toJSON` (`src/models/Ledger.ts`).
- **"Future" means dated after the end of today.** Future-dated transactions and transfers
  are excluded from balances and activity until their date arrives
  (`Transaction.isFuture`, `Transfer.isFuture`).

---

## 1. Entities

### Account (`src/models/Account.ts`)
A real-world account holding money.

| Field | Meaning |
|---|---|
| `type` | `"budget"` or `"tracking"`. **Budget** accounts hold spendable money managed by the envelope budget. **Tracking** accounts (savings, investments, mortgage, etc.) are recorded for net-worth but are **excluded from budget calculations**. |
| `archived` | Hidden from the main lists; still counted in balances. |

Derived:
- **`balance`** = sum of all (non-future) transaction amounts on the account **plus**
  transfers into it (`+amount`) and out of it (`−amount`). (`getAllAccountBalances`,
  Ledger.ts:344)
- **`clearedBalance`** = same, but only counting transactions with `status === "cleared"`
  and each transfer leg whose own status (`fromStatus`/`toStatus`) is cleared.
- **`unclearedBalance`** = `balance − clearedBalance`.
- **`uncategorizedTransactionCount`** = number of the account's transactions with at least
  one posting that has no budget (drives the amber dot).

### Transaction (`src/models/Transaction.ts`)
A dated event on **one** account, made up of one or more postings.

| Field | Meaning |
|---|---|
| `account` | The account the money moved in/out of. |
| `payee` | Who it was with. |
| `postings` | One or more `TransactionPosting`s (the split lines). |
| `status` | `"open"` or `"cleared"`. |
| `date` | Transaction date. |

Derived:
- **`amount`** = **sum of its postings' amounts** (positive = money in, negative = money
  out). A transaction is _not_ stored with an amount of its own.
- **`isSplit`** = more than one posting.
- **`hasMissingCategory`** = has zero postings, or any posting without a budget.
- **`isFuture`** = dated after end of today.

### TransactionPosting (`src/models/Transaction.ts`)
One line of a transaction: an `amount` (cents, signed) assigned to a `budget` (envelope),
plus an optional `note`. A posting with no `budget` is "uncategorized".

> ⚖️ **Convention — what a posting's sign means.** A positive posting is money entering the
> account; a negative posting is money leaving. The posting's *budget* says which envelope
> is affected, **independent of whether it's the income envelope.** Income can be posted
> straight into a specific envelope (e.g. _vakantiegeld_ → Holiday) without going through
> "To Be Budgeted".

### Budget (envelope) (`src/models/Budget.ts`)
A spending category / envelope.

| Field | Meaning |
|---|---|
| `name` | Display name. |
| `budgetCategory` | Optional grouping (`BudgetCategory`), e.g. "Fixed costs". |
| `isToBeBudgeted` | Marks the single special **"To Be Budgeted"** envelope (see §2). |
| `isArchived`, `isFavorited` | List/visibility flags. |
| `goal` | The active (non-archived) `Goal` whose `budget` is this one, if any. |

### BudgetCategory (`src/models/Budget.ts`)
A named group of budgets. Display-only grouping.

### Assignment (`src/models/Assignment.ts`)
Money **budgeted into an envelope for a month**: a `budget`, a `date` (the month), and an
`amount`. This is the act of giving an envelope money; it does not move money between
accounts.

### Transfer (`src/models/Transfer.ts`)
An **internal move between two of your own accounts**: `fromAccount`, `toAccount`,
`amount`, independent `fromStatus`/`toStatus`, an optional `budget`, and a `date`.

- Stored in a **separate collection** (`ledger.transfers`) — transfers are **never** part
  of `ledger.transactions`.
- A transfer is **same-type** if both accounts are the same type (budget↔budget or
  tracking↔tracking) and **cross-type** otherwise (budget↔tracking).

> ⚖️ **Convention — transfers and the budget.** Same-type transfers carry **no budget
> activity** (moving cash between two budget accounts doesn't change any envelope).
> Cross-type transfers (e.g. budget account → savings) **do** affect budget activity: they
> count against `transfer.budget`, or against "To Be Budgeted" if no budget is set
> (`getAllBudgetValuesForMonth`, Ledger.ts:600–624).

### Goal (`src/models/Goal.ts`)
A target attached to a budget.

| Type | Tracks |
|---|---|
| `"available"` | The budget's **available balance** this month vs `targetAmount` (a savings target). |
| `"monthly_assignment"` | The **amount assigned this month** vs `targetAmount` (a recurring funding target). |

`progress` → `{ current, target, percentage, isComplete }`. `percentage` is clamped to
0–100 and never negative; `isComplete` is `current >= target`.

### BalanceAssertion (referenced in `transactionsAndBalancesForAccount`, Ledger.ts:457)
A statement that an account had a known balance on a date (a reconciliation marker shown in
the ledger). Not part of inflow/outflow.

### RecurringTemplate (`src/models/RecurringTemplate.ts`)
A schedule (RRULE) that materializes into ordinary `Transaction`s over time, each linked
back via `recurringTemplateId`. A `lastGeneratedDate` watermark tracks what has already been
created so generation is idempotent. See [recurring-transactions.md](./recurring-transactions.md)
for the full design.

---

## 2. "To Be Budgeted" (the income envelope)

`getInflowBudget()` returns the single budget with `isToBeBudgeted === true`
(Ledger.ts:219). It is the holding envelope for **income**: money you've received but not
yet assigned to spending envelopes.

> ⚖️ **Convention — income vs. direct-to-envelope.** "Inflow this month" in the
> Available-to-Budget breakdown is defined as **activity on the To Be Budgeted envelope**
> (`budgetActivityForMonth(inflowBudget, month)`). Money posted **directly** to another
> envelope (vakantiegeld → Holiday) is **not** counted in that "inflow" figure even though
> it is genuinely external income — because for *budgeting* purposes it never needed
> assigning. This is a deliberate distinction between "income to be allocated" and "money
> that arrived already allocated". (It is the crux of how the inflow/outflow report should
> treat such postings — see §4.)

---

## 3. Monthly budget math

All of the per-month figures come from one cached pass, `getAllBudgetValuesForMonth(date)`
(Ledger.ts:539), which returns, per budget: `{ available, activity, assigned }`. Wrappers:
`budgetActivityForMonth`, `budgetAssignedForMonth`, `budgetAvailableForMonth`
(Ledger.ts:678–690).

- **Activity (this month)** of a budget = sum of all postings to that budget from
  non-tracking, non-future transactions **dated in that month**, **plus** the effect of
  cross-type transfers targeting that budget in that month.
- **Assigned (this month)** of a budget = sum of `Assignment` amounts for that budget dated
  in that month.
- **Available (through end of month)**:
  - *Regular envelope:* `assigned-through-month + activity-through-month`, where
    "through-month" means everything dated before the end of that month (i.e. it **rolls
    over** from prior months).
  - *To Be Budgeted:* `total activity-through − total assigned-through to all other
    envelopes`. I.e. all income received so far minus everything handed out to envelopes.

### Available to budget (the big header number)
`AvailableToBudgetPopover` shows:

```
Available = budgetAvailableForMonth(ToBeBudgeted, thisMonth) − futureDeduction
```

where `futureDeduction = max(0, futureAssigned − futureInflow)` — i.e. if you've already
assigned more in future months than future income covers, that shortfall is withheld from
what's shown as available now. Components (all in the popover):
- **Rollover from last month** = `budgetAvailableForMonth(ToBeBudgeted, lastMonth)`
- **Inflow this month** = `budgetActivityForMonth(ToBeBudgeted, thisMonth)`
- **Assigned this month** = `assignedForMonth(thisMonth)` (sum of all assignments this month)
- **Assigned in the future** = `inflowAfterMonth − assignedAfterMonth` (Ledger.ts:485–530)

---

## 4. Reports

### Net Worth (`src/features/reports/NetWorthChart.tsx`)
For each month, the running total of **all** (non-future) transaction amounts across **all**
accounts up to that point — i.e. the sum of every account balance, including tracking
accounts. Transfers don't appear because they're internal (a transfer moves the same amount
out of one account and into another, netting to zero across accounts).

### Inflow / Outflow (`src/features/reports/InflowOutflowChart.tsx`) — current behaviour
For each month:
- **Inflow** = sum of `transaction.amount` for transactions where `amount > 0`,
- **Outflow** = sum of `|transaction.amount|` for transactions where `amount < 0`,

over transactions that are **non-future**, on **non-tracking** accounts, dated in that
month. **Transfers are excluded** (separate collection).

> ⚖️ **Open questions for review.** This "every positive vs. every negative transaction"
> definition is intentionally simple, but it conflates a few different things. Decide what
> each should do:
> 1. **Direct-to-envelope income** (vakantiegeld → Holiday): genuinely new money. ✅ counts
>    as inflow here, which you want.
> 2. **Reimbursements / pass-through envelopes**: money that flows into an envelope and back
>    out (e.g. shared expenses you get paid back for). Currently both the in and the out
>    are counted at full value, which can inflate both series.
> 3. **Internal moves modelled as plain transactions instead of transfers** (e.g. a mortgage
>    payment recorded as an expense on a budget account *and* a separate inflow on the
>    tracking mortgage account). The budget-account leg counts as outflow at full value
>    (principal + interest), even though only the interest is money truly leaving your
>    possession. Modelling the principal as a **Transfer** would exclude it.
> 4. **Tracking accounts** are excluded entirely, so external income/expense that lands on a
>    tracking account (e.g. investment dividends paid out) is not counted.
>
> There is no automatic way to tell an "internal move recorded as two transactions" apart
> from real external flow — so the cleanest lever is **how things are modelled** (transfer
> vs. transaction) rather than chart heuristics.

---

## 5. Sign & inclusion conventions at a glance

| Rule | Where |
|---|---|
| Positive amount = money **in**, negative = money **out**. | everywhere |
| Tracking accounts are **excluded** from all budget math and from inflow/outflow. | Ledger.ts:470, chart |
| Tracking accounts **are** included in net worth and account balances. | Ledger.ts:344 |
| Future-dated (after today) items are **excluded** until their date. | `isFuture` |
| Transfers are a **separate collection**; never inflow/outflow; they move balances between accounts. | `ledger.transfers` |
| Same-type transfers = no budget effect; cross-type transfers = budget effect. | Ledger.ts:600 |
| Income is normally posted to **To Be Budgeted**, but may be posted directly to an envelope. | §2 |
