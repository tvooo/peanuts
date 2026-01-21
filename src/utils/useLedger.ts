"use client";

import { createContext, useContext } from "react";

import type { Ledger } from "@/models/Ledger";

interface LedgerContextValue {
  ledger: Ledger | null;
  openLedger: (fh?: FileSystemFileHandle) => Promise<void>;
  saveLedger: () => Promise<void>;
  fileHandle: FileSystemFileHandle | null;
}

const LedgerContext = createContext<LedgerContextValue>({
  ledger: null,
  openLedger: () => Promise.resolve(),
  saveLedger: () => Promise.resolve(),
  fileHandle: null,
});

const useLedger = () => {
  return useContext(LedgerContext);
};

export { LedgerContext, useLedger };
