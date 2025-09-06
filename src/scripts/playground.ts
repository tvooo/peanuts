// import { db } from "../db";

import { Database } from "../schema";

import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

const dialect = new SqliteDialect({
  database: new SQLite("./playground.sqlite"),
});

// Database interface is passed to Kysely's constructor, and from now on, Kysely
// knows your database structure.
// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
// to communicate with your database.
export const db = new Kysely<Database>({
  dialect,
});

const main = async () => {
  await db.schema.dropTable("accounts").ifExists().execute();
  await db.schema
    .createTable("accounts")
    .ifNotExists()
    .addColumn("uuid", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .execute();
  
  await db.schema
    .createTable("payees")
    .ifNotExists()
    .addColumn("uuid", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
  
  await db.schema
    .createTable("budget_categories")
    .ifNotExists()
    .addColumn("uuid", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .execute();
  
  await db.schema
    .createTable("budgets")
    .ifNotExists()
    .addColumn("uuid", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("budget_category_uuid", "text", (col) => col.notNull().references('budget_categories.uuid'))
    .execute();

  
  await db
    .insertInto("accounts")
    .values([
      { uuid: "123", name: "ABN Amro", type: "budget" },
      { uuid: "1233", name: "bunq", type: "budget" },
    ])
    .execute();

  await db
    .insertInto("payees")
    .values([
      {
        uuid: "p1",
        name: "Apple",
      },
      {
        uuid: "p2",
        name: "Friedhats",
      },
      {
        uuid: "p3",
        name: "BecTim",
      },
    ])
    .execute();
  
  await db
    .insertInto("budget_categories")
    .values([
      {
        uuid: "c1",
        name: "Obligations",
      },
      {
        uuid: "c2",
        name: "Finance",
      },
      {
        uuid: "c3",
        name: "Fun & Hobbies",
      },
    ])
    .execute();

  await db
    .insertInto("budgets")
    .values([
      {
        uuid: "b1",
        name: "Banking",
        budget_category_uuid: "c2",
      },
      {
        uuid: "b2",
        name: "Investing",
        budget_category_uuid: "c2",
      },
      {
        uuid: "b3",
        name: "Phone",
        budget_category_uuid: "c1",
      },
      {
        uuid: "b4",
        name: "Fitness",
        budget_category_uuid: "c3",
      },
      {
        uuid: "b5",
        name: "Coffee",
        budget_category_uuid: "c3",
      },
      {
        uuid: "b6",
        name: "Dining out & Takeout",
        budget_category_uuid: "c3",
      },
      {
        uuid: "b7",
        name: "Entertainment (Games, Music)",
        budget_category_uuid: "c3",
      },
    ])
    .execute();

  const res = await db.selectFrom("accounts").selectAll().execute();
  console.log(res);

  const res2 = await db.selectFrom("payees").selectAll().execute();
  console.log(res2);
  
  const cats = await db.selectFrom("budget_categories").selectAll().execute();
  console.log(cats);
  
  const budgets = await db.selectFrom("budgets").selectAll().execute();
  console.log(budgets);
};

main();