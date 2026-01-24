import { get, set } from "idb-keyval";
import { reaction } from "mobx";
import { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes } from "react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useRecurringTransactions } from "@/hooks/useRecurringTransactions";
import { Ledger } from "@/models/Ledger";
import { LedgerContext } from "@/utils/useLedger";
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
      <HashRouter>
        <Routes>
          <Route path="/" element={<OpenPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/recurring" element={<RecurringTransactionsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/ledger/:accountName" element={<AccountPage />} />
          <Route path="/payees" element={<PayeesPage />} />
        </Routes>
      </HashRouter>
    </SidebarProvider>
  );
}

export default function App() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const changeCountRef = useRef(0);
  const autoSaveIntervalRef = useRef<number | null>(null);

  // Save function that writes to file and marks ledger as clean
  const saveLedger = useCallback(async () => {
    if (!ledger || !fileHandle) return;
    const writableStream = await fileHandle.createWritable();
    await writableStream.write(JSON.stringify(ledger.toJSON(), null, 2));
    await writableStream.close();
    ledger.markClean();
    changeCountRef.current = 0;
    console.log("Ledger saved");
  }, [ledger, fileHandle]);

  // Set up change detection and auto-save when ledger loads
  useEffect(() => {
    if (!ledger || !fileHandle) return;

    // Mark clean after initial load
    ledger.markClean();

    // Set up MobX reaction for change detection using version counter
    // This is O(1) instead of O(n) JSON serialization
    let debounceTimeout: number | null = null;
    const dispose = reaction(
      () => ledger._version,
      () => {
        // Clear previous debounce
        if (debounceTimeout) clearTimeout(debounceTimeout);

        debounceTimeout = window.setTimeout(() => {
          if (!ledger.isDirty) {
            ledger.markDirty();
          }
          changeCountRef.current++;

          // Auto-save after 5 changes
          if (changeCountRef.current >= 5) {
            saveLedger();
          }
        }, 500);
      }
    );

    // Set up 60-second interval for auto-save
    autoSaveIntervalRef.current = window.setInterval(() => {
      if (ledger.isDirty) {
        saveLedger();
      }
    }, 60000);

    return () => {
      dispose();
      if (debounceTimeout) clearTimeout(debounceTimeout);
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
    };
  }, [ledger, fileHandle, saveLedger]);

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
        saveLedger,
        openLedger: async (fh?: FileSystemFileHandle) => {
          let fileHandleToOpen: FileSystemFileHandle;

          if (fh) {
            await verifyPermission(fh, true);
            fileHandleToOpen = fh;
          } else {
            const result = await (window as any).showOpenFilePicker();
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
  const options = { mode: "read" };
  if (readWrite) {
    options.mode = "readwrite";
  }
  // Check if permission was already granted. If so, return true.
  if ((await (fileHandle as any).queryPermission(options)) === "granted") {
    return true;
  }
  // Request permission. If the user grants permission, return true.
  if ((await (fileHandle as any).requestPermission(options)) === "granted") {
    return true;
  }
  // The user didn't grant permission, so return false.
  return false;
}
