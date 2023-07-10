"use client"

import { createContext, useContext } from "react";

import { Ledger } from "@/models/Ledger";

const LedgerContext = createContext<Ledger | null>(null)


const useLedger = () => {
    return useContext(LedgerContext);
}

export { LedgerContext, useLedger };
