# Peanuts

## .pbj - the Peanuts Budget Journal format

Types of statements

- Opening and closing accounts
- Creating and archiving budgets
- Transactions
- Balance assertions
- Budget assignments
- Transfers
  - are those just "special" transactions?
- Aliases
- Repeating budget assignments
- Repeating transactions

Also: comments

### Opening and closing accounts

```
DATE open ACCOUNT BALANCE
```

```
2023-02-27 open N26 793,55
```

```
DATE close ACCOUNT
```

The closing date must be after the opening date. You can only use an account within the opening/closing time range. If you try to use it outside this, Peanuts will throw an error.

### Creating and archiving budgets

```
DATE budget BUDGET
```

```
2023-02-27 open N26 793,55
```

```
DATE archive BUDGET
```

### Budget assignments

```
DATE > BUDGET AMOUNT
```

### Transactions

```
DATE * ACCOUNT PAYEE BUDGET NOTE AMOUNT
DATE ! ACCOUNT PAYEE BUDGET NOTE AMOUNT
```