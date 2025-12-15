import { SidebarProvider } from "@/components/ui/sidebar";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { Ledger } from "@/models/Ledger";
import { LedgerContext } from "@/utils/useLedger";
import { get, set } from "idb-keyval";
import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AccountPage } from "./pages/AccountPage";
import BudgetPage from "./pages/BudgetPage";
import { LedgerPage } from "./pages/LedgerPage";
import { OpenPage } from "./pages/OpenPage";
import { PayeesPage } from "./pages/PayeesPage";
import { RecurringTransactionsPage } from "./pages/RecurringTransactionsPage";
import { ReportsPage } from "./pages/ReportsPage";

export interface RecentFile {
  fileHandle: FileSystemFileHandle;
  ledgerName: string;
}

// Component that uses the ledger context - must be inside the provider
function AppContent() {
  // Process recurring transactions (midnight check + on load)
  useRecurringTransactions();

  return (
    <SidebarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OpenPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/recurring" element={<RecurringTransactionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/ledger/:accountName" element={<AccountPage />} />
          <Route path="/payees" element={<PayeesPage />} />
        </Routes>
      </BrowserRouter>
    </SidebarProvider>
  );
}

export default function App() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
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
        // l.name = "Tim's budget";
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

        // Update recent files with ledger name
        const recentFiles: RecentFile[] = (await get(`peanuts:recentFileHandles`)) || [];
        const updated = recentFiles.map((rf) =>
          rf.fileHandle.name === fileHandle.name ? { ...rf, ledgerName: l.name } : rf
        );
        await set(`peanuts:recentFileHandles`, updated);

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
          let fileHandleToOpen: FileSystemFileHandle;

          if (fh) {
            await verifyPermission(fh, true);
            fileHandleToOpen = fh;
          } else {
            const result = await window.showOpenFilePicker();
            [fileHandleToOpen] = result;
          }

          // Update recent files list
          const recentFiles: RecentFile[] = (await get(`peanuts:recentFileHandles`)) || [];
          // Remove duplicate if exists (compare by name)
          const filtered = recentFiles.filter((f) => f.fileHandle.name !== fileHandleToOpen.name);
          // Add to front with placeholder name (will be updated after ledger loads)
          const updated = [{ fileHandle: fileHandleToOpen, ledgerName: "" }, ...filtered].slice(
            0,
            10
          );
          await set(`peanuts:recentFileHandles`, updated);

          setFileHandle(fileHandleToOpen);
        },
        fileHandle,
      }}
    >
      <AppContent />
    </LedgerContext.Provider>
  );
}

async function verifyPermission(fileHandle: FileSystemFileHandle, readWrite: boolean) {
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
