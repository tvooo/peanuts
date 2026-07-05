import { isAfter, startOfDay } from "date-fns";
import { useEffect, useRef } from "react";
import { processRecurringTemplates } from "@/utils/recurringTransactions";
import { useLedger } from "@/utils/useLedger";

export function useRecurringTransactions() {
  const { ledger } = useLedger();
  const lastCheckDate = useRef<Date>(startOfDay(new Date()));

  useEffect(() => {
    if (!ledger) return;

    // Note: the initial on-load run happens in App.tsx, after the auto-save
    // reaction is set up, so generated transactions get persisted. Here we only
    // handle the case where the app stays open across midnight.

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
