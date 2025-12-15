import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { RRule } from "rrule";
import { RecurringTemplateModal } from "@/features/budget/RecurringTemplateModal";
import { RecurringTransactionsTable } from "@/features/budget/RecurringTransactionsTable";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export const RecurringTransactionsPage = observer(() => {
  const { ledger } = useLedger();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }
  }, [ledger, navigate]);

  if (!ledger) {
    return null;
  }

  // Calculate monthly equivalent for each template
  const calculateMonthlyAmount = (template: any): number => {
    try {
      const rule = template.rrule;
      const freq = rule.options.freq;
      const interval = rule.options.interval || 1;

      switch (freq) {
        case RRule.DAILY:
          return template.amount * 30;
        case RRule.WEEKLY:
          return (template.amount * 4) / interval;
        case RRule.MONTHLY:
          return template.amount;
        case RRule.YEARLY:
          return template.amount / 12;
        default:
          return template.amount;
      }
    } catch (e) {
      console.error("Error calculating monthly amount:", e);
      return template.amount;
    }
  };

  // Calculate totals
  const monthlyTotal = Math.abs(
    ledger.recurringTemplates.reduce((sum, template) => {
      return sum + calculateMonthlyAmount(template);
    }, 0)
  );

  const yearlyTotal = monthlyTotal * 12;

  return (
    <PageLayout>
      <div className="flex justify-between items-center px-8 py-6">
        <h2 className="text-2xl font-bold">Recurring Transactions</h2>
        <div className="flex items-center gap-8">
          <div>
            <div className="text-sm text-muted-foreground">Monthly average</div>
            <div className="text-xl font-bold">{formatCurrency(monthlyTotal)}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Yearly total</div>
            <div className="text-xl font-bold">{formatCurrency(yearlyTotal)}</div>
          </div>
          <RecurringTemplateModal />
        </div>
      </div>

      <RecurringTransactionsTable ledger={ledger} />
    </PageLayout>
  );
});
