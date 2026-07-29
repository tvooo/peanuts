import { describe, expect, it } from "vitest";
import { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Ledger } from "@/models/Ledger";
import { Payee } from "@/models/Payee";
import { Transaction, TransactionPosting } from "@/models/Transaction";
import { Transfer } from "@/models/Transfer";
import { parseAsnStatement } from "./asnBank";
import { parseCsv } from "./csv";
import { parseGlsStatement } from "./glsBank";
import { parseStatementFile } from "./index";
import { findDuplicate, resolvePayee, suggestBudget } from "./matching";
import { ImportIdBuilder } from "./types";
import { parseAmountCents, parseDayMonthYear } from "./values";

describe("parseCsv", () => {
  it("parses quoted fields with embedded delimiters", () => {
    const rows = parseCsv('a,"b,c",d\ne,f,g', ",");
    expect(rows).toEqual([
      ["a", "b,c", "d"],
      ["e", "f", "g"],
    ]);
  });

  it("supports single-quote quoting (ASN dialect)", () => {
    const rows = parseCsv("1,'jansen, co',2", ",", "'");
    expect(rows).toEqual([["1", "jansen, co", "2"]]);
  });

  it("preserves newlines inside quoted fields", () => {
    const rows = parseCsv('a;"line1\nline2";b', ";");
    expect(rows).toEqual([["a", "line1\nline2", "b"]]);
  });

  it("handles CRLF and skips blank lines", () => {
    const rows = parseCsv("a,b\r\n\r\nc,d\r\n", ",");
    expect(rows).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseAmountCents", () => {
  it("parses dot-decimal amounts (ASN)", () => {
    expect(parseAmountCents("238.45", ".")).toBe(23845);
    expect(parseAmountCents("-43.90", ".")).toBe(-4390);
    expect(parseAmountCents("-43.9", ".")).toBe(-4390);
    expect(parseAmountCents("120", ".")).toBe(12000);
  });

  it("parses comma-decimal amounts (GLS)", () => {
    expect(parseAmountCents("-52,93", ",")).toBe(-5293);
    expect(parseAmountCents("1284", ",")).toBe(128400);
    expect(parseAmountCents("-39,2", ",")).toBe(-3920);
    expect(parseAmountCents("1.234,56", ",")).toBe(123456);
  });

  it("rejects garbage", () => {
    expect(() => parseAmountCents("abc", ".")).toThrow();
  });
});

describe("parseDayMonthYear", () => {
  it("parses with and without leading zeros", () => {
    expect(parseDayMonthYear("21-01-2020", "-")).toEqual(new Date(2020, 0, 21));
    expect(parseDayMonthYear("3-4-2020", "-")).toEqual(new Date(2020, 3, 3));
    expect(parseDayMonthYear("17.12.2025", ".")).toEqual(new Date(2025, 11, 17));
  });
});

describe("ImportIdBuilder", () => {
  it("disambiguates identical (date, amount) pairs", () => {
    const builder = new ImportIdBuilder("gls");
    expect(builder.next("2025-12-17", -5293)).toBe("PNT:gls:2025-12-17:-5293:1");
    expect(builder.next("2025-12-17", -5293)).toBe("PNT:gls:2025-12-17:-5293:2");
    expect(builder.next("2025-12-17", -100)).toBe("PNT:gls:2025-12-17:-100:1");
  });
});

const ASN_SAMPLE = [
  "21-01-2020,NL01ASNB0123456789,NL01BANK0123456789,'jansen',,,,EUR,122800.83,EUR,-43.90,21-01-2020,21-01-2020,8810,OVB,90043054,'factuur 9234820','huur januari',42",
  "22-01-2020,NL01ASNB0123456789,,'',,,,EUR,122756.93,EUR,-12.50,22-01-2020,22-01-2020,8810,BEA,90043055,'','Albert Heijn 1234 AMSTERDAM>Betaalautomaat 12:34',42",
].join("\r\n");

describe("parseAsnStatement", () => {
  it("parses the comma/single-quote dialect", () => {
    const statement = parseAsnStatement(ASN_SAMPLE);
    expect(statement.format).toBe("asn");
    expect(statement.accountIban).toBe("NL01ASNB0123456789");
    expect(statement.rows).toHaveLength(2);

    const [first, second] = statement.rows;
    expect(first.date).toEqual(new Date(2020, 0, 21));
    expect(first.amount).toBe(-4390);
    expect(first.rawPayee).toBe("jansen");
    expect(first.counterIban).toBe("NL01BANK0123456789");
    expect(first.memo).toBe("factuur 9234820 · huur januari");
    expect(first.importId).toBe("PNT:asn:2020-01-21:90043054");

    // Card payment: empty counterparty name, merchant extracted from the
    // description before ">"
    expect(second.rawPayee).toBe("Albert Heijn 1234 AMSTERDAM");
    expect(second.counterIban).toBeNull();
  });

  it("parses the CSV 2004 dialect (semicolon, double quotes)", () => {
    const csv2004 =
      '21-01-2020;"NL01ASNB0123456789";"NL01BANK0123456789";"jansen";"";"";"";"EUR";122800.83;"EUR";-43.90;21-01-2020;21-01-2020;8810;"OVB";90043054;"factuur 9234820";"huur; januari";42';
    const statement = parseAsnStatement(csv2004);
    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0].amount).toBe(-4390);
    expect(statement.rows[0].memo).toBe("factuur 9234820 · huur; januari");
  });

  it("tolerates a header row and an appended category column", () => {
    const header =
      "Boekingsdatum,Opdrachtgeversrekening,Tegenrekeningnummer,Naam tegenrekening,Adres,Postcode,Plaats,Valutasoort rekening,Saldo rekening voor mutatie,Valutasoort mutatie,Transactiebedrag,Journaaldatum,Valutadatum,Interne transactiecode,Globale transactiecode,Volgnummer transactie,Betalingskenmerk,Omschrijving,Afschriftnummer,Categorie";
    const row =
      "21-01-2020,NL01ASNB0123456789,NL01BANK0123456789,'jansen',,,,EUR,122800.83,EUR,-43.90,21-01-2020,21-01-2020,8810,OVB,90043054,'','huur','42','Wonen'";
    const statement = parseAsnStatement(`${header}\n${row}`);
    expect(statement.rows).toHaveLength(1);
    expect(statement.rows[0].amount).toBe(-4390);
    expect(statement.rows[0].rawPayee).toBe("jansen");
  });

  it("accepts comma-decimal amounts in case the export is localized", () => {
    const csv2004Row =
      '21-01-2020;"NL01ASNB0123456789";"NL01BANK0123456789";"jansen";"";"";"";"EUR";122800,83;"EUR";-43,90;21-01-2020;21-01-2020;8810;"OVB";90043054;"";"huur";42';
    const statement = parseAsnStatement(csv2004Row);
    expect(statement.rows[0].amount).toBe(-4390);
  });

  it("rejects non-ASN content", () => {
    expect(() => parseAsnStatement("Datum,Bedrag\n01-01-2020,12.00")).toThrow();
  });
});

const GLS_HEADER =
  "Bezeichnung Auftragskonto;IBAN Auftragskonto;BIC Auftragskonto;Bankname Auftragskonto;Buchungstag;Valutadatum;Name Zahlungsbeteiligter;IBAN Zahlungsbeteiligter;BIC (SWIFT-Code) Zahlungsbeteiligter;Buchungstext;Verwendungszweck;Betrag;Waehrung;Saldo nach Buchung;Bemerkung;Gekennzeichneter Umsatz;Glaeubiger ID;Mandatsreferenz";

const GLS_SAMPLE = `﻿${GLS_HEADER}
GLS Konto;DE89370400440532013000;GENODEM1GLS;GLS Gemeinschaftsbank eG;17.12.2025;17.12.2025;Max Mustermann ;DE89370400440532013000;GENODEM1GLS;Basislastschrift;Miete;-52,93;EUR;28764,28;;;;
GLS Konto;DE89370400440532013000;GENODEM1GLS;GLS Gemeinschaftsbank eG;15.12.2025;15.12.2025;REWE SAGT DANKE;;GENODEM1GLS;Kartenzahlung girocard;Kauf;-20;EUR;28948,7;;;;`;

describe("parseGlsStatement", () => {
  it("parses the current Atruvia format with BOM", () => {
    const statement = parseGlsStatement(GLS_SAMPLE);
    expect(statement.format).toBe("gls");
    expect(statement.accountIban).toBe("DE89370400440532013000");
    expect(statement.rows).toHaveLength(2);

    const [first, second] = statement.rows;
    expect(first.date).toEqual(new Date(2025, 11, 17));
    expect(first.amount).toBe(-5293);
    expect(first.rawPayee).toBe("Max Mustermann");
    expect(first.memo).toBe("Basislastschrift · Miete");
    expect(first.importId).toBe("PNT:gls:2025-12-17:-5293:1");

    // Amount without decimals, empty counterparty IBAN
    expect(second.amount).toBe(-2000);
    expect(second.counterIban).toBeNull();
  });

  it("parses the legacy format with preamble and Soll/Haben", () => {
    const legacy = [
      '"GLS Gemeinschaftsbank eG"',
      '"Umsatzanzeige"',
      "",
      '"Buchungstag";"Valuta";"Auftraggeber/Zahlungsempfänger";"Empfänger/Zahlungspflichtiger";"Konto-Nr.";"IBAN";"BLZ";"BIC";"Vorgang/Verwendungszweck";"Kundenreferenz";"Währung";"Umsatz";"Soll/Haben"',
      '"03.05.2021";"03.05.2021";"REWE MARKT GMBH";"";"";"DE12345678901234567890";"";"GENODEM1GLS";"Kartenzahlung\nREWE SAGT DANKE";"";"EUR";"23,45";"S"',
      '"04.05.2021";"04.05.2021";"ARBEITGEBER GMBH";"";"";"";"";"";"Gehalt Mai";"";"EUR";"2.500,00";"H"',
      '"Anfangssaldo";"";"";"";"";"";"";"";"";"";"EUR";"1.000,00";"H"',
    ].join("\n");

    const statement = parseGlsStatement(legacy);
    expect(statement.rows).toHaveLength(2);
    expect(statement.rows[0].amount).toBe(-2345);
    expect(statement.rows[0].rawPayee).toBe("REWE MARKT GMBH");
    expect(statement.rows[0].memo).toBe("Kartenzahlung REWE SAGT DANKE");
    expect(statement.rows[1].amount).toBe(250000);
  });
});

describe("parseStatementFile", () => {
  it("auto-detects formats from raw bytes", () => {
    const encode = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;
    expect(parseStatementFile(encode(ASN_SAMPLE)).format).toBe("asn");
    expect(parseStatementFile(encode(GLS_SAMPLE)).format).toBe("gls");
    expect(() => parseStatementFile(encode("hello world"))).toThrow();
  });
});

function makeLedger() {
  const ledger = new Ledger();
  const account = new Account({ ledger, id: null });
  account.name = "Checking";
  ledger.accounts.push(account);
  return { ledger, account };
}

function addAccount(ledger: Ledger, name: string) {
  const account = new Account({ ledger, id: null });
  account.name = name;
  ledger.accounts.push(account);
  return account;
}

function addTransfer(
  ledger: Ledger,
  opts: {
    date: Date;
    /** Always positive; the direction comes from from/to */
    amount: number;
    fromAccount: Account;
    toAccount: Account;
    fromImportId?: string;
    toImportId?: string;
  }
) {
  const transfer = new Transfer({ ledger, id: null });
  transfer.date = opts.date;
  transfer.amount = opts.amount;
  transfer.fromAccount = opts.fromAccount;
  transfer.toAccount = opts.toAccount;
  transfer.fromImportId = opts.fromImportId ?? null;
  transfer.toImportId = opts.toImportId ?? null;
  ledger.transfers.push(transfer);
  return transfer;
}

function addTransaction(
  ledger: Ledger,
  account: Account,
  opts: { date: Date; amount: number; payee?: Payee; budget?: Budget; importId?: string }
) {
  const posting = new TransactionPosting({ ledger, id: null });
  posting.amount = opts.amount;
  posting.budget = opts.budget ?? null;
  ledger.transactionPostings.push(posting);
  const transaction = new Transaction({ ledger, id: null });
  transaction.account = account;
  transaction.date = opts.date;
  transaction.payee = opts.payee ?? null;
  transaction.importId = opts.importId ?? null;
  transaction.postings.push(posting);
  ledger.transactions.push(transaction);
  return transaction;
}

describe("resolvePayee", () => {
  it("matches learned import aliases first", () => {
    const { ledger } = makeLedger();
    const payee = new Payee({ ledger, id: null });
    payee.name = "Albert Heijn";
    payee.importNames = ["ALBERT HEIJN 1234 AMSTERDAM"];
    ledger.payees.push(payee);

    expect(resolvePayee(ledger, "albert heijn 1234  amsterdam")).toEqual({
      payee,
      confidence: "alias",
    });
  });

  it("matches exact names case-insensitively", () => {
    const { ledger } = makeLedger();
    const payee = new Payee({ ledger, id: null });
    payee.name = "Max Mustermann";
    ledger.payees.push(payee);

    expect(resolvePayee(ledger, "MAX  MUSTERMANN")).toEqual({ payee, confidence: "exact" });
  });

  it("fuzzy-matches when the payee name is contained in the raw name", () => {
    const { ledger } = makeLedger();
    const rewe = new Payee({ ledger, id: null });
    rewe.name = "REWE";
    const ah = new Payee({ ledger, id: null });
    ah.name = "Albert Heijn";
    ledger.payees.push(rewe, ah);

    expect(resolvePayee(ledger, "REWE SAGT DANKE 4401")).toEqual({
      payee: rewe,
      confidence: "fuzzy",
    });
    expect(resolvePayee(ledger, "Unknown Shop")).toBeNull();
  });
});

describe("suggestBudget", () => {
  it("suggests the most recently used budget for a payee", () => {
    const { ledger, account } = makeLedger();
    const payee = new Payee({ ledger, id: null });
    ledger.payees.push(payee);
    const budget = new Budget({ ledger, id: null });
    budget.name = "Groceries";
    ledger._budgets.push(budget);
    addTransaction(ledger, account, { date: new Date(2025, 0, 1), amount: -100, payee, budget });
    ledger.buildPayeeBudgetMap();

    expect(suggestBudget(ledger, payee)).toBe(budget);
    expect(suggestBudget(ledger, null)).toBeNull();
  });
});

describe("findDuplicate", () => {
  const row = {
    date: new Date(2025, 11, 17),
    amount: -5293,
    rawPayee: "Max",
    counterIban: null,
    memo: "",
    importId: "PNT:gls:2025-12-17:-5293:1",
  };

  it("finds transactions already imported with the same id", () => {
    const { ledger, account } = makeLedger();
    const existing = addTransaction(ledger, account, {
      date: new Date(2025, 11, 17),
      amount: -5293,
      importId: row.importId,
    });

    expect(findDuplicate(ledger, account, row, new Set())).toEqual({
      kind: "imported",
      transaction: existing,
    });
  });

  it("matches manually entered transactions within the date window", () => {
    const { ledger, account } = makeLedger();
    const manual = addTransaction(ledger, account, {
      date: new Date(2025, 11, 15), // two days off
      amount: -5293,
    });

    expect(findDuplicate(ledger, account, row, new Set())).toEqual({
      kind: "manual",
      transaction: manual,
    });
    // ...but not when another statement row already claimed it
    expect(findDuplicate(ledger, account, row, new Set([manual.id]))).toBeNull();
  });

  it("ignores different amounts and far-away dates", () => {
    const { ledger, account } = makeLedger();
    addTransaction(ledger, account, { date: new Date(2025, 11, 17), amount: -9999 });
    addTransaction(ledger, account, { date: new Date(2025, 10, 1), amount: -5293 });

    expect(findDuplicate(ledger, account, row, new Set())).toBeNull();
  });

  it("finds transfers already imported on this account's side", () => {
    const { ledger, account } = makeLedger();
    const savings = addAccount(ledger, "Savings");
    const transfer = addTransfer(ledger, {
      date: new Date(2025, 11, 17),
      amount: 5293,
      fromAccount: account,
      toAccount: savings,
      fromImportId: row.importId,
    });

    expect(findDuplicate(ledger, account, row, new Set())).toEqual({
      kind: "imported-transfer",
      transfer,
    });
  });

  it("matches manually entered transfers using the account's signed amount", () => {
    const { ledger, account } = makeLedger();
    const savings = addAccount(ledger, "Savings");
    const outgoing = addTransfer(ledger, {
      date: new Date(2025, 11, 16),
      amount: 5293,
      fromAccount: account,
      toAccount: savings,
    });

    expect(findDuplicate(ledger, account, row, new Set())).toEqual({
      kind: "manual-transfer",
      transfer: outgoing,
    });
    // ...but not when another statement row already claimed it
    expect(findDuplicate(ledger, account, row, new Set([outgoing.id]))).toBeNull();
    // ...and not for the receiving account, where the same transfer is an inflow
    expect(findDuplicate(ledger, savings, row, new Set())).toBeNull();
  });

  it("matches the other side of a transfer that was imported from one account", () => {
    const { ledger, account } = makeLedger();
    const savings = addAccount(ledger, "Savings");
    const transfer = addTransfer(ledger, {
      date: new Date(2025, 11, 17),
      amount: 5293,
      fromAccount: account,
      toAccount: savings,
      // Already imported from the checking statement
      fromImportId: row.importId,
    });
    // The savings statement lists the same movement as an inflow, with its own id
    const savingsRow = { ...row, amount: 5293, importId: "PNT:gls:2025-12-17:5293:1" };

    expect(findDuplicate(ledger, savings, savingsRow, new Set())).toEqual({
      kind: "manual-transfer",
      transfer,
    });

    transfer.markImported(savings, savingsRow.importId);
    expect(findDuplicate(ledger, savings, savingsRow, new Set())).toEqual({
      kind: "imported-transfer",
      transfer,
    });
    expect(transfer.fromStatus).toBe("open");
    expect(transfer.toStatus).toBe("cleared");
  });

  it("prefers an exact transaction match over a transfer at the same distance", () => {
    const { ledger, account } = makeLedger();
    const savings = addAccount(ledger, "Savings");
    const manual = addTransaction(ledger, account, {
      date: new Date(2025, 11, 17),
      amount: -5293,
    });
    addTransfer(ledger, {
      date: new Date(2025, 11, 17),
      amount: 5293,
      fromAccount: account,
      toAccount: savings,
    });

    expect(findDuplicate(ledger, account, row, new Set())).toEqual({
      kind: "manual",
      transaction: manual,
    });
  });
});
