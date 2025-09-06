import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLedger } from "@/utils/useLedger";
import { del, get } from "idb-keyval";
import { ChevronRight, FolderOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { db } from "../db";

export const OpenPage = () => {
  const { ledger, openLedger, fileHandle } = useLedger();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileSystemFileHandle[]>([]);

  useEffect(() => {
    if (ledger) {
      navigate("/budget");
    }
  }, [ledger]);

  useEffect(() => {
    get(`peanuts:ledgerFileHandle`).then((fileHandle) => {
      if (fileHandle) {
        setFiles([fileHandle]);
      } else {
        del(`peanuts:ledgerFileHandle`);
      }
    });
  }, []);

  return (
    <main className="flex grow items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Open or Create Ledger</CardTitle>
          <CardDescription>
            Deploy your new project in one-click.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-semibold">Recently opened</div>
          {files.map((fileHandle, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 hover:bg-mutedX rounded-md"
            >
              <div className="text-sm font-mono">{fileHandle.name}</div>
              <Button
                onClick={() => openLedger(fileHandle)}
                size="icon"
                variant="outline"
                className="ml-auto"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          ))}
        </CardContent>
        <CardFooter className="w-full">
          <div className="flex gap-2 w-full">
            <Button onClick={() => openLedger()}>
              <FolderOpen size={16} /> Open Ledger
            </Button>
            <Button
              onClick={async () => {
                await createEmptyLedger()
                // const data = await db
                //   .selectFrom("groceries")
                //   .select(["name", "quantity"])
                //   .orderBy("name", "asc")
                //   .execute();
                // console.log(data);
              }}
              className="ml-auto"
              variant="secondary"
            >
              <Plus size={16} /> New
            </Button>
          </div>
        </CardFooter>
      </Card>
    </main>
  );
};

async function createEmptyLedger() {
  await db.schema.dropTable("accounts").ifExists().execute();
  await db.schema
    .createTable("accounts")
    .ifNotExists()
    .addColumn("uuid", "text")
    .addColumn("name", "text")
    .addColumn("type", "text")
    .execute();

  // await db.
  // db.execute
  // console.log(accounts.getSQL())
  await db.insertInto("accounts").values([{ uuid: "123", name: "ABN Amro", type: 'budget' }]).execute();
  await db.insertInto("accounts").values([{ uuid: "1233", name: "bunq", type: "budget" }]).execute();

  const res = await db.selectFrom("accounts").selectAll().execute();
  // console.log(res);
}
