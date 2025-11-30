import { PageLayout } from "@/PageLayout";
import { RecurringTemplateModal } from "@/features/budget/RecurringTemplateModal";
import { RecurringTemplate } from "@/models/RecurringTemplate";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { observer } from "mobx-react-lite";
import { RRule } from "rrule";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export const RecurringTransactionsPage = observer(() => {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);

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
  const calculateMonthlyAmount = (template: RecurringTemplate): number => {
    try {
      const rule = template.rrule;
      const freq = rule.options.freq;
      const interval = rule.options.interval || 1;

      // Convert to monthly equivalent based on frequency
      switch (freq) {
        case RRule.DAILY:
          return template.amount * 30; // Approximate
        case RRule.WEEKLY:
          // For weekly, check interval (1 = weekly, 2 = biweekly, etc.)
          return (template.amount * 4) / interval; // Approximate 4 weeks/month
        case RRule.MONTHLY:
          return template.amount;
        case RRule.YEARLY:
          return template.amount / 12;
        default:
          return template.amount; // Fallback
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
      <div className="flex justify-between items-center px-8 py-4">
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
          <RecurringTemplateModal
            template={editingTemplate}
            onOpenChange={setEditingTemplate}
          />
        </div>
      </div>

      <div className="px-8 py-4">
        {ledger.recurringTemplates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No recurring transactions yet</p>
            <p className="text-sm mt-2">
              Create recurring transaction templates to see them here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {ledger.recurringTemplates.map((template) => (
              <div
                key={template.id}
                className="flex items-center gap-4 p-3 hover:bg-muted rounded-md border cursor-pointer"
                onClick={() => setEditingTemplate(template)}
              >
                <div className="flex-1">
                  <div className="font-medium">{template.payee?.name || "No payee"}</div>
                  <div className="text-sm text-muted-foreground">
                    {template.account?.name} → {template.budget?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.scheduleDescription}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-semibold">
                    {formatCurrency(template.amount)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(calculateMonthlyAmount(template))}/month
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Next: {template.nextScheduledDate.toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
});
