// import { SQLocal } from "sqlocal";

// export const db = new SQLocal("database.sqlite3");

import { Kysely } from "kysely";
import { SQLocalKysely } from "sqlocal/kysely";
import { Database } from "./schema";

export const { dialect, overwriteDatabaseFile } = new SQLocalKysely(
  "database.sqlite3"
);
export const db = new Kysely<Database>({ dialect });
// export const overwriteDB = overwriteDatabaseFile;

// export const openDB = () => {

// }

// import { drizzle } from "drizzle-orm/sqlite-proxy";
// import { SQLocalDrizzle } from "sqlocal/drizzle";

// const { driver, batchDriver } = new SQLocalDrizzle("omgdatabase.sqlite3");
// export const db = drizzle(driver, batchDriver);