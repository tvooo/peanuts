"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Ledger } from "@/models/Ledger";
import { LedgerContext } from "@/utils/useLedger";
import { set } from "idb-keyval";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AccountPage } from "./pages/AccountPage";
import BudgetPage from "./pages/BudgetPage";
import { LedgerPage } from "./pages/LedgerPage";
import { OpenPage } from "./pages/OpenPage";
import { PayeesPage } from "./pages/PayeesPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null
  );
  const [ledger, setLedger] = useState<Ledger | null>(null);

  useEffect(() => {
    async function doit() {
      if (!fileHandle) {
        return;
      }

      const file = await fileHandle.getFile();

      if (file.name.endsWith("json") || file.name.endsWith("pbj")) {
        console.log("JSON file detected");
        const l = await Ledger.fromJSON(await file.text());
        l.name = "Tim's budget";
        l.fileName = fileHandle.name;
        l.transactions.forEach((t) => {
          // Only process transactions that are not in the future
          if (!t.isFuture) {
            t.account?.processTransaction(t);
          }
        });
        l.transfers.forEach((t) => {
          // Only process transfers that are not in the future
          if (!t.isFuture) {
            // Subtract from source account
            if (t.fromAccount) {
              t.fromAccount.processTransaction({ amount: -t.amount } as any);
            }
            // Add to destination account
            if (t.toAccount) {
              t.toAccount.processTransaction({ amount: t.amount } as any);
            }
          }
        });
        setLedger(l);

        return;
      }
    }
    doit();
  }, [fileHandle]);

  return (
    <LedgerContext.Provider
      value={{
        ledger,
        openLedger: async (fh?: FileSystemFileHandle) => {
          if (fh) {
            await verifyPermission(fh, true);
            if (fh) {
              setFileHandle(fh as FileSystemFileHandle);
            }
            return;
          }
          else {
            const result = await window.showOpenFilePicker();
            const [fileHandle] = result;
            setFileHandle(fileHandle);
            await set(`peanuts:ledgerFileHandle`, fileHandle);
          }

          
        },
        fileHandle,
      }}
    >
      <SidebarProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<OpenPage />} />
            <Route path="/budget" element={<BudgetPage />} />
            <Route path="/subscriptions" element={<SubscriptionsPage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/ledger/:accountName" element={<AccountPage />} />
            <Route path="/payees" element={<PayeesPage />} />
          </Routes>
        </BrowserRouter>
      </SidebarProvider>
    </LedgerContext.Provider>
  );
}

async function verifyPermission(
  fileHandle: FileSystemFileHandle,
  readWrite: boolean
) {
  if (!fileHandle) {
    return false;
  }
  const options: FileSystemHandlePermissionDescriptor = {};
  if (readWrite) {
    options.mode = "readwrite";
  }
  // Check if permission was already granted. If so, return true.
  if ((await fileHandle.queryPermission(options)) === "granted") {
    return true;
  }
  // Request permission. If the user grants permission, return true.
  if ((await fileHandle.requestPermission(options)) === "granted") {
    return true;
  }
  // The user didn't grant permission, so return false.
  return false;
}
