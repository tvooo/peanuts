import { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Ledger } from "@/models/Ledger";

const ledger = new Ledger();
ledger.accounts = [new Account("dkb", 43891), new Account("asn", 54159)];
ledger.budgets = [
  new Budget("software"),
  new Budget("coffee"),
  new Budget("insurance"),
  new Budget("entertainment"),
  new Budget("inflow"),
  new Budget("misc"),
  new Budget("investing"),
];

const transactions = `
2023-07-03 > dkb wuertt insurance -4839
2023-07-03 > dkb Reflect.app software -1411
2023-07-03 > dkb apple software -2999
2023-07-03 > dkb apple software -2549
2023-07-03 > dkb apple software -1000
2023-07-05 > dkb apple software -99
2023-07-06 > dkb audible entertainment -932

2023-07-01 > asn bectim inflow 70000
2023-07-01 > asn bectim inflow 10000
2023-07-01 > asn thevillage coffee -1325
2023-07-01 > asn wc misc -70
2023-07-03 > asn rockingchair coffee -415
2023-07-04 > asn tr investing -30000
2023-07-06 > asn blommers coffee -4615
`;

const assignments = `
2023-07-01 + coffee 10000
2023-07-01 + insurance 5000
2023-07-01 + investing 30000
2023-07-01 + software 10000
`;

ledger.aliases.set('dkb', 'DKB')
ledger.aliases.set("asn", "ASN Bank");
ledger.aliases.set("software", "Software & Hosting");
ledger.aliases.set("insurance", "Insurance & Banking");
ledger.aliases.set("coffee", "Coffee");
ledger.aliases.set("entertainment", "Books, Entertainment");

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
    t.postings.forEach(p => {
        p.budget.processPosting(p)
    })
})

export { ledger };
