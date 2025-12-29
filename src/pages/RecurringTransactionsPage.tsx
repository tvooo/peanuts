import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { RRule } from "rrule";
import { RecurringTemplateModal } from "@/features/budget/RecurringTemplateModal";
import {
  type GroupBy,
  type RecurrenceFilter,
  RecurringTransactionsTable,
  type SortOrder,
} from "@/features/budget/RecurringTransactionsTable";
import { cn } from "@/lib/utils";
import type { Budget } from "@/models/Budget";
import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export const RecurringTransactionsPage = observer(() => {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const [groupBy, setGroupBy] = useState<GroupBy>("recurrence");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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

  const toggleSort = () => {
    if (sortOrder === "none") {
      setSortOrder("desc");
    } else if (sortOrder === "desc") {
      setSortOrder("asc");
    } else {
      setSortOrder("none");
    }
  };

  // Get unique budgets for category filter
  const uniqueBudgets = Array.from(
    new Set(ledger.recurringTemplates.map((t) => t.budget).filter(Boolean))
  ) as Budget[];

  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        {/* Fixed header - Title and summary */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
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

        {/* Fixed header - Filters */}
        <div className="px-8 py-4 flex gap-4 items-center border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <select
              className={cn(
                "h-9 rounded-md border border-input bg-white px-3 py-1",
                "text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "w-[150px]"
              )}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            >
              <option value="recurrence">Recurrence</option>
              <option value="category">Category</option>
              <option value="account">Bank account</option>
              <option value="flow">Inflow/Outflow</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by recurrence:</span>
            <select
              className={cn(
                "h-9 rounded-md border border-input bg-white px-3 py-1",
                "text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "w-[150px]"
              )}
              value={recurrenceFilter}
              onChange={(e) => setRecurrenceFilter(e.target.value as RecurrenceFilter)}
            >
              <option value="all">All</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filter by category:</span>
            <select
              className={cn(
                "h-9 rounded-md border border-input bg-white px-3 py-1",
                "text-sm shadow-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                "w-50"
              )}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All</option>
              {uniqueBudgets.map((budget) => (
                <option key={budget.id} value={budget.id}>
                  {budget.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable table container */}
        <div className="flex-1 overflow-auto min-h-0">
          <RecurringTransactionsTable
            ledger={ledger}
            groupBy={groupBy}
            sortOrder={sortOrder}
            recurrenceFilter={recurrenceFilter}
            categoryFilter={categoryFilter}
            onSortChange={toggleSort}
          />
        </div>
      </div>
    </PageLayout>
  );
});
