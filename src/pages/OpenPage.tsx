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
  window.alert("Creating new ledger is not implemented yet.");
}
