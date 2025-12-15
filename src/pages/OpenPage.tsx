import { del, get, set } from "idb-keyval";
import { ChevronRight, FolderOpen, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { RecentFile } from "@/App";
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

export const OpenPage = () => {
  const { ledger, openLedger, fileHandle } = useLedger();
  const navigate = useNavigate();
  const [files, setFiles] = useState<RecentFile[]>([]);

  const removeFile = async (recentFileToRemove: RecentFile) => {
    const updated = files.filter((f) => f.fileHandle.name !== recentFileToRemove.fileHandle.name);
    setFiles(updated);
    if (updated.length > 0) {
      await set(`peanuts:recentFileHandles`, updated);
    } else {
      await del(`peanuts:recentFileHandles`);
    }
  };

  useEffect(() => {
    if (ledger) {
      navigate("/budget");
    }
  }, [navigate, ledger]);

  useEffect(() => {
    get(`peanuts:recentFileHandles`).then((recentFiles: RecentFile[] | undefined) => {
      if (recentFiles && recentFiles.length > 0) {
        setFiles(recentFiles);
      }
    });
  }, []);

  return (
    <main className="flex grow items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Open or Create Ledger</CardTitle>
          <CardDescription>Manage your budget using the envelope method.</CardDescription>
        </CardHeader>
        <CardContent>
          {files.length > 0 ? (
            <>
              <div className="text-sm font-semibold mb-2">Recently opened</div>
              {files.map((recentFile, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 hover:bg-muted rounded-md">
                  <div className="flex-1 min-w-0">
                    {recentFile.ledgerName && (
                      <div className="text-sm font-medium truncate">{recentFile.ledgerName}</div>
                    )}
                    <div className="text-xs font-mono text-muted-foreground truncate">
                      {recentFile.fileHandle.name}
                    </div>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(recentFile);
                    }}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0"
                  >
                    <X size={14} />
                  </Button>
                  <Button
                    onClick={() => openLedger(recentFile.fileHandle)}
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 shrink-0"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <p>No recent files</p>
              <p className="text-xs mt-1">
                Open an existing ledger or create a new one to get started
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="w-full">
          <div className="flex gap-2 w-full">
            <Button onClick={() => openLedger()}>
              <FolderOpen size={16} /> Open Ledger
            </Button>
            <Button
              onClick={async () => {
                await createEmptyLedger();
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
