"use client";

import { useLedger } from "@/utils/useLedger";
import Chart from './chart';
export default function LedgerPage() {
  const ledger = useLedger();
  return (
    <Chart width={500} height={300} />
  );
}
