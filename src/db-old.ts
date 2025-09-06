// import { sqlite3 } from "@sqlite.org/sqlite-wasm";

// const p = sqlite3.wasm.allocFromTypedArray(arrayBuffer);
// const db = new sqlite3.oo1.DB();
// const rc = sqlite3.capi.sqlite3_deserialize(
//   db.pointer,
//   "main",
//   p,
//   arrayBuffer.byteLength,
//   arrayBuffer.byteLength,
//   sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
//   // Optionally:
//   // | sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE
// );
// db.checkRc(rc);

import sqlite3InitModule, { Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { sqlite as $ } from 'litdb';
import { Account } from "./schema";

const log = console.log;
// const error = console.error;

const start = (sqlite3: Sqlite3Static) => {
  console.log("Running SQLite3 version", sqlite3.version.libVersion);
  const db = new sqlite3.oo1.DB(":memory:", "ct");
  db.exec($.schema.createTable(Account));
  // db.exec($.schema.createTable(Payee));
  // db.exec($.schema.createTable(Budget));
  // db.exec($.schema.createTable(Transaction));
  // db.exec($.schema.createTable(TransactionPosting));
  // db.exec($.schema.createTable(BudgetAssignment));
  
  const q = $`INSERT INTO Account (uuid, name, kind) VALUES (${"1"}, ${"ABN AMRO"}, ${"budgetttt"})`
  
  db.exec(
    { sql: q.sql, bind: q.params}
  );
  db.exec(`INSERT INTO Account (uuid, name, kind) VALUES (?,?,?)`, { bind: ["2", "Tim's bank account", "bank"] });
  // db.exec(`INSERT INTO Payee (uuid, name) VALUES ("2", "Tim")`);
  // db.exec(`INSERT INTO Budget (uuid, name, group) VALUES ("3", "Coffee", "Misc")`);
  // db.exec(`INSERT INTO Transaction (uuid, accountUuid, status) VALUES ("4", "1", "open")`);
  // db.exec(`INSERT INTO TransactionPosting (uuid, transactionUuid, amount, payeeUuid, budgetUuid, comment) VALUES ("5", "4", 100, "2", "3", "Coffee")`);
  // db.exec(`INSERT INTO BudgetAssignment (uuid, fromBudgetUuid, toBudgetUuid, amount) VALUES ("6", "3", "3", 100)`);

  // console.log(db.selectArrays($.from(Account).toString()))

  if (db !== null) {
    db.exec("CREATE TABLE IF NOT EXISTS t(a,b)");
    try {
      log("Create a table...\n");
      db.exec("CREATE TABLE IF NOT EXISTS t(a,b)");
      //Equivalent:
      db.exec({
        sql: "CREATE TABLE IF NOT EXISTS t(a,b)",
        // ... numerous other options ...
      });
      // SQL can be either a string or a byte array
      // or an array of strings which get concatenated
      // together as-is (so be sure to end each statement
      // with a semicolon).

      log("Insert some data using exec()...\n");
      let i;
      for (i = 20; i <= 25; ++i) {
        db.exec({
          sql: "insert into t(a,b) values (?,?)",
          // bind by parameter index...
          bind: [i, i * 2],
        });
        db.exec({
          sql: "insert into t(a,b) values ($a,$b)",
          // bind by parameter name...
          bind: { $a: i * 10, $b: i * 20 },
        });
      }
      log("Query data with exec() without a callback...\n");
      // eslint-disable-next-line prefer-const
      let rows: any = [];
      db.exec({
        sql: "select a, b from t order by a limit 3",
        rowMode: "object",
        resultRows: rows,
      });
      db.exec({
        sql: "select * from Account",
        callback: (result) => {
          console.log(result)
        }
      })
      log("Result rows:\n" + JSON.stringify(rows, null, 2));
    } catch (e) {
      // if(e instanceof sqlite3.SQLite3Error){
      //   log("Got expected exception from db.transaction():",e.message);
      //   log("count(*) from t =",db.selectValue("select count(*) from t"));
      // }else{
      //   throw e;
      // }
      log("error is:" + e);
      throw e;
    }
  }
};

const initializeSQLite = async () => {
  try {
    // log("Loading and initializing SQLite3 module...");
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    // log("Done initializing. Running demo...");
    start(sqlite3);
  } catch (err) {
    // error("Initialization error:", err.name, err.message);
  }
};

initializeSQLite();