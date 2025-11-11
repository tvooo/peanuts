# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peanuts is a personal finance web application for budget management using the envelope budgeting method. It uses a custom file format (.pbj - Peanuts Budget Journal) and runs entirely in the browser using the File System Access API.

**Tech Stack:** React 18 + TypeScript + Vite + MobX + React Router 7 + Radix UI + Tailwind CSS

## Development Commands

```bash
# Start development server on port 4434
npm run dev

# Build for production
npm run build

# Preview production build
npm start

# Lint (currently disabled - exits 0)
npm run lint
```

## Architecture

### State Management (MobX)

All domain models extend the `Model` base class in `src/models/Model.ts` and use MobX decorators:
- `@observable` for reactive properties
- `@action` for mutations
- `@computed` for derived values

The `Ledger` class (`src/models/Ledger.ts`) is the root container holding all application data in observable collections (accounts, transactions, budgets, payees, etc.). Access it via the `useLedger()` hook in components.

**Key Pattern:** Components must be wrapped with `observer()` from `mobx-react-lite` to reactively re-render on observable changes.

### Domain Models

All models are in `src/models/`:
- **Ledger**: Root container with all collections and computed queries (e.g., `budgetAvailableForMonth()`). Budget calculation methods automatically exclude tracking accounts.
- **Account**: Bank/tracking accounts with `type` ("budget" | "tracking"), `archived` flag, and computed balance. Tracking accounts are excluded from budget calculations.
- **Transaction**: Financial transactions with associated postings
- **TransactionPosting**: Line items that allocate amounts to budgets and payees
- **Budget**: Budget envelopes with optional category grouping
- **Assignment**: Monthly budget allocations (budget + month + amount)
- **Transfer**: Inter-account money movements. Processed in App.tsx to properly update account balances (subtract from source, add to destination).
- **RecurringTransaction**: Subscription tracking
- **Payee**: Transaction counterparties
- **BalanceAssertion**: Balance verification records (not a Model subclass)

Models maintain bidirectional references (e.g., transactions reference accounts, accounts hold balance state).

### Routing

React Router 7 with routes defined in `src/App.tsx`:
- `/` - OpenPage (file picker)
- `/budget` - BudgetPage (envelope management)
- `/subscriptions` - SubscriptionsPage
- `/ledger` - LedgerPage (source view)
- `/ledger/:accountName` - AccountPage (account transactions)
- `/payees` - PayeesPage

### File System Integration

Uses native **File System Access API** (not Electron):
- Users pick `.pbj` or `.json` files via `window.showOpenFilePicker()`
- Files are saved via `fileHandle.createWritable()`
- Recent files cached in IndexedDB using `idb-keyval`
- Single-file JSON format for serialization (`Ledger.fromJSON()` / `toJSON()`)

The file handle is managed in `App.tsx` and provided via `LedgerContext`.

### PACO Parser (src/paco/)

Custom parser combinator library for the .pbj format:
- **tokenize.ts**: Lexer that converts text into typed tokens
- **parsers/base.ts**: Functional parser combinators (`seq`, `or`, `optional`, `apply`, `validate`)
- **parsers/date.ts**: Date parsing logic
- **parsers/data.ts**: Grammar data (keywords, months, weekdays)

**Current State:** Tokenizer and combinators are implemented but full .pbj grammar parsing is incomplete. The app currently uses JSON serialization.

### YNAB Import (scripts/convert-ynab-export.ts)

Converts YNAB budget exports to Peanuts JSON format:
- Parses TSV files (Register.tsv and Plan.tsv) from YNAB exports
- Converts accounts, budgets, payees, transactions, transfers, and assignments
- Detects tracking accounts (off-budget accounts with no categories)
- Handles amount conversion (euros to cents) and date parsing
- See `scripts/README.md` for usage and limitations

**Key Dependencies:**
- `cuid` for ID generation
- `date-fns` for date parsing

### Component Patterns

**Page Components** (`src/pages/`): Top-level routes, wrapped with `observer()`, use `useLedger()` hook

**Feature Components** (`src/features/budget/`): Domain-specific components like `BudgetTable`, `TransactionsTable`, modals for CRUD operations

**UI Components** (`src/components/ui/`): Radix UI wrappers styled with Tailwind CSS

**Shared Components** (`src/components/`):
- **Combobox**: Generic filterable combobox built with cmdk and Radix Popover. Supports keyboard navigation, create-new functionality, and custom filtering.
- **Sidebar**: Displays accounts in two collapsible sections (active and archived). Tracking accounts shown with Eye icon and muted styling.

**Common Patterns:**
- Modal dialogs use Radix Dialog with state tied to data (e.g., `budget` state controls dialog open/close)
- Inline editing in tables (click to edit, toggle between display/form rows)
- Type guards for polymorphic data (`isTransaction`, `isBalanceAssertion`)
- Transaction editing uses amber background with inline Done button and FormInput/FormSelect components

### Formatting Utilities

All located in `src/utils/formatting.ts`:
- `formatCurrency(n)`: Converts cents to euros (e.g., `12345` → `"123,45 €"`)
- `formatDate(d)`: Formats as `dd.MM.yyyy`
- `formatDateIsoShort(d)`: Formats as `yyyy-MM-dd`
- `formatMonth(d)`: Formats as `MMM yyyy`

**Important:** All monetary amounts are stored in cents (Balance and Amount types).

## Babel Configuration

MobX decorators require Babel plugins in `vite.config.ts`:
- `@babel/plugin-proposal-decorators` (2023-05 version)
- `@babel/plugin-transform-class-properties`
- `@babel/plugin-transform-class-static-block`

When adding new models with decorators, ensure Vite's React plugin uses these Babel plugins.

## Path Aliases

TypeScript and Vite both configured with `@` → `./src/` path alias. Use `@/components/...` for imports.

## .pbj Format Reference

From `README.md`:

```
Open account:    DATE open ACCOUNT BALANCE
Close account:   DATE close ACCOUNT
Budget create:   DATE budget BUDGET
Budget archive:  DATE archive BUDGET
Assignment:      DATE > BUDGET AMOUNT
Transaction:     DATE * ACCOUNT PAYEE BUDGET NOTE AMOUNT
                 DATE ! ACCOUNT PAYEE BUDGET NOTE AMOUNT (cleared)
Balance assert:  DATE = ACCOUNT BALANCE
Transfer:        DATE transfer FROM TO AMOUNT
Recurring:       DATE (ev|every) PERIOD ACCOUNT ...
Alias:           DATE alias SHORT FULL
```

## Recent Changes

- Migrated from Next.js to Vite
- Removed SQLite/sqlocal dependency
- Simplified to JSON-only format (parser in progress)
- Added tracking account support (on-budget vs off-budget accounts)
- Added account archiving functionality with dedicated sidebar section
- Implemented generic Combobox component using cmdk for payee selection
- Fixed transfer balance calculations to properly add/subtract from accounts
- Created YNAB import script (`scripts/convert-ynab-export.ts`) to convert YNAB TSV exports to Peanuts JSON format
- Improved transaction editing UI with consistent styling and alignment
- Added visual indicators (Eye icon) for tracking accounts and Archive icon for archived accounts
