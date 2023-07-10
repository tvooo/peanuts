"use client"

import { useLedger } from "@/utils/useLedger";

export default function LedgerPage() {
    const ledger = useLedger()
    return (
      <textarea
        className="w-full h-full bg-transparent font-mono"
        value={ledger.source}
      ></textarea>
    );
}