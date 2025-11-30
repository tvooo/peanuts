import { useLedger } from "@/utils/useLedger";
import { processRecurringTemplates } from "@/utils/recurringTransactions";
import { startOfDay, isAfter } from "date-fns";
import { useEffect, useRef } from "react";

export function useRecurringTransactions() {
  const { ledger } = useLedger();
  const lastCheckDate = useRef<Date>(startOfDay(new Date()));

  useEffect(() => {
    if (!ledger) return;

    // Initial check on mount
    processRecurringTemplates(ledger);

    // Check every minute if date has changed (midnight check)
    const interval = setInterval(() => {
      const now = startOfDay(new Date());
      if (isAfter(now, lastCheckDate.current)) {
        lastCheckDate.current = now;
        processRecurringTemplates(ledger);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [ledger]);
}
