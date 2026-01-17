# CLAUDE.md

## Project Overview

Peanuts is a personal finance web app for envelope budgeting. Runs entirely in-browser using the File System Access API with JSON file storage.

**Tech Stack:** React 18 + TypeScript + Vite + MobX + React Router 7 + Radix UI + Tailwind CSS

## Commands

```bash
npm run dev    # Dev server on port 4434
npm run build  # Production build
npm start      # Preview production build
```

## Architecture

### MobX State Management

Models in `src/models/` extend `Model` base class with MobX decorators (`@observable`, `@action`, `@computed`).

**Ledger** (`src/models/Ledger.ts`) is the root container. Access via `useLedger()` hook. Components must use `observer()` from `mobx-react-lite`.

**Key Models:**
- **Account**: `type` ("budget" | "tracking"), `archived` flag. Tracking accounts excluded from budget calculations.
- **Transaction** / **TransactionPosting**: Transactions with line items allocating to budgets/payees
- **Budget** / **Assignment**: Envelopes and monthly allocations
- **Transfer**: Inter-account movements (processed in App.tsx)

### File System

Uses File System Access API. File handle managed in `App.tsx`, provided via `LedgerContext`. Serialization via `Ledger.fromJSON()` / `toJSON()`.

### Routes (`src/App.tsx`)

`/` OpenPage | `/budget` BudgetPage | `/ledger/:accountName` AccountPage | `/subscriptions` | `/payees`

### Components

- **Pages** (`src/pages/`): Route components with `observer()` + `useLedger()`
- **Features** (`src/features/`): Domain components (BudgetTable, TransactionsTable, modals)
- **UI** (`src/components/ui/`): Radix UI wrappers with Tailwind
- **Combobox**: cmdk-based filterable select with keyboard nav

### Formatting (`src/utils/formatting.ts`)

All amounts stored in **cents**. `formatCurrency(12345)` → `"123,45 €"`

## Config Notes

- Path alias: `@` → `./src/`
- MobX decorators require Babel plugins configured in `vite.config.ts`
