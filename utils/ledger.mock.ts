import { Budget } from "@/models/Budget";
import { Ledger } from "@/models/Ledger";

const ledger = new Ledger();
// ledger.accounts = [new Account("dkb", 43891), new Account("asn", 54159)];
ledger._budgets = [
  new Budget("software", "Misc"),
  new Budget("coffee", "Enjoying Life"),
  new Budget("insurance", "Finances"),
  new Budget("entertainment", "Enjoying Life"),
  new Budget("inflow"),
  new Budget("misc", "Misc"),
  new Budget("investing", "Finances"),
  new Budget("watch2023", "Purchases", true),
  new Budget("watch-or-not", "Purchases", true),
  new Budget("glasses", "Purchases"),
];

const accounts = `
2023-06-30 open dkb 43891
2023-06-30 open asn 54159
`;

const transactions = `
2023-07-03 > dkb wuertt insurance -4839
2023-07-03 > dkb Reflect.app software -1411
2023-07-03 > dkb apple software -2999
2023-07-03 > dkb apple software -2549
2023-07-03 > dkb apple software -1000
2023-07-07 > dkb apple software -99
2023-07-06 > dkb audible entertainment -932

2023-07-01 > asn bectim inflow 70000
2023-07-01 > asn bectim inflow 10000
2023-07-01 > asn thevillage coffee -1325
2023-07-01 > asn wc misc -70
2023-07-03 > asn rockingchair coffee -415
2023-07-04 > asn tr investing -30000
2023-07-06 > asn blommers coffee -4615

2023-07-10 > asn hallofframe glasses -76000

2023-08-01 > asn bectim inflow 70000
2023-08-01 > asn bectim inflow 10000
`;

const assignments = `
2023-06-30 + watch2023 68000
2023-06-30 + investing 22500
2023-06-30 + glasses 7550

2023-07-01 + coffee 10000
2023-07-01 + insurance 5000
2023-07-01 + investing 30000
2023-07-01 + software 10000
2023-07-01 + glasses 7500
2023-07-01 + misc 1000
2023-07-01 + entertainment 1000

2023-07-01 + watch-or-not 15500

2023-08-01 + watch-or-not 15500
2023-08-01 + insurance 5000
2023-08-01 + investing 30000
2023-08-01 + misc 1000
`;

ledger.aliases.set('dkb', 'DKB')
ledger.aliases.set("asn", "ASN Bank");
ledger.aliases.set("software", "Software & Hosting");
ledger.aliases.set("insurance", "Insurance & Banking");
ledger.aliases.set("coffee", "Coffee");
ledger.aliases.set("entertainment", "Books, Entertainment");
ledger.aliases.set("apple", " Apple");
ledger.aliases.set("wuertt", "Wuerttembergische");
ledger.aliases.set("audible", "Audible");
ledger.aliases.set("investing", "Investing");
ledger.aliases.set("misc", "Miscellaneous");
ledger.aliases.set("watch-or-not", "The Watch/Invest pledge");
ledger.aliases.set("watch2023", "New  Watch (2023)");
ledger.aliases.set("glasses", "Glasses");
ledger.aliases.set("hallofframe", "Hall of Frame");

ledger.aliases.set("bectim", "Beccy & Tim");
ledger.aliases.set("thevillage", "The Village");
ledger.aliases.set("rockingchair", "Rocking Chair");
ledger.aliases.set("wc", "WC");
ledger.aliases.set("tr", "Trade Republic");


accounts
  .split("\n")
  .map((t) => t.trim())
  .filter((t) => t !== "")
  .forEach((t) => ledger.addAccountStatement(t));

transactions
  .split("\n")
  .map((t) => t.trim())
  .filter((t) => t !== "")
  .forEach((t) => ledger.addTransactionStatement(t));

assignments
  .split("\n")
  .map((t) => t.trim())
  .filter((t) => t !== "")
  .forEach((t) => ledger.addAssignmentStatement(t));

// ledger.addTransaction(
//   new Transaction(new Date(), ledger.accounts[0], [
//     new TransactionPosting("Apple", ledger.budgets[0], 99, "iCloud+"),
//   ])
// );
// ledger.addTransaction(
//   new Transaction(new Date(), ledger.accounts[0], [
//     new TransactionPosting("The Village", ledger.budgets[1], 1299),
//   ])
// );

ledger.transactions.forEach(t => {
    t.account.processTransaction(t)
    // t.budgets.forEach((b) => b.processTransaction(t));
    // t.postings.forEach(p => {
    //     p.budget.processPosting(p)
    // })
})

export { ledger };
