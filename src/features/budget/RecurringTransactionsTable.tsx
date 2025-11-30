import { AmountCell, HeaderCell } from "@/components/Table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Ledger } from "@/models/Ledger";
import { RecurringTemplate } from "@/models/RecurringTemplate";
import { formatCurrency } from "@/utils/formatting";
import { ArrowDown, ArrowDownUp, ArrowUp } from "lucide-react";
import { observer } from "mobx-react-lite";
import { Fragment, useState } from "react";
import { RRule } from "rrule";
import { RecurringTemplateModal } from "./RecurringTemplateModal";

interface RecurringTransactionsTableProps {
  ledger: Ledger;
}

type GroupBy = "recurrence" | "category" | "account" | "flow";
type SortOrder = "asc" | "desc" | "none";
type RecurrenceFilter = "all" | "daily" | "weekly" | "biweekly" | "monthly" | "yearly";

// Helper to calculate monthly equivalent
const calculateMonthlyAmount = (template: RecurringTemplate): number => {
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

// Helper to get recurrence type from template
const getRecurrenceType = (template: RecurringTemplate): string => {
  try {
    const rule = template.rrule;
    const freq = rule.options.freq;
    const interval = rule.options.interval || 1;

    switch (freq) {
      case RRule.DAILY:
        return "Daily";
      case RRule.WEEKLY:
        return interval === 2 ? "Biweekly" : "Weekly";
      case RRule.MONTHLY:
        return "Monthly";
      case RRule.YEARLY:
        return "Yearly";
      default:
        return "Other";
    }
  } catch {
    return "Other";
  }
};

export const RecurringTransactionsTable = observer(function RecurringTransactionsTable({
  ledger,
}: RecurringTransactionsTableProps) {
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("recurrence");
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [recurrenceFilter, setRecurrenceFilter] = useState<RecurrenceFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter templates
  let filteredTemplates = [...ledger.recurringTemplates];

  if (recurrenceFilter !== "all") {
    filteredTemplates = filteredTemplates.filter((template) => {
      const type = getRecurrenceType(template).toLowerCase();
      return type === recurrenceFilter;
    });
  }

  if (categoryFilter !== "all") {
    filteredTemplates = filteredTemplates.filter(
      (template) => template.budget?.id === categoryFilter
    );
  }

  // Sort by monthly amount
  if (sortOrder !== "none") {
    filteredTemplates.sort((a, b) => {
      const amountA = Math.abs(calculateMonthlyAmount(a));
      const amountB = Math.abs(calculateMonthlyAmount(b));
      return sortOrder === "asc" ? amountA - amountB : amountB - amountA;
    });
  }

  // Group templates
  const groupedTemplates = new Map<string, RecurringTemplate[]>();

  if (groupBy === "recurrence") {
    // Group by recurrence type
    filteredTemplates.forEach((template) => {
      const type = getRecurrenceType(template);
      if (!groupedTemplates.has(type)) {
        groupedTemplates.set(type, []);
      }
      groupedTemplates.get(type)!.push(template);
    });
  } else if (groupBy === "category") {
    // Group by category/budget
    filteredTemplates.forEach((template) => {
      const categoryName = template.budget?.name || "Uncategorized";
      if (!groupedTemplates.has(categoryName)) {
        groupedTemplates.set(categoryName, []);
      }
      groupedTemplates.get(categoryName)!.push(template);
    });
  } else if (groupBy === "account") {
    // Group by bank account
    filteredTemplates.forEach((template) => {
      const accountName = template.account?.name || "No account";
      if (!groupedTemplates.has(accountName)) {
        groupedTemplates.set(accountName, []);
      }
      groupedTemplates.get(accountName)!.push(template);
    });
  } else {
    // Group by inflow/outflow
    filteredTemplates.forEach((template) => {
      const flowType = template.amount >= 0 ? "Inflow" : "Outflow";
      if (!groupedTemplates.has(flowType)) {
        groupedTemplates.set(flowType, []);
      }
      groupedTemplates.get(flowType)!.push(template);
    });
  }

  // Sort groups in a sensible order
  const sortedGroupKeys = Array.from(groupedTemplates.keys()).sort((a, b) => {
    if (groupBy === "recurrence") {
      const order = ["Daily", "Weekly", "Biweekly", "Monthly", "Yearly", "Other"];
      return order.indexOf(a) - order.indexOf(b);
    } else if (groupBy === "flow") {
      // Inflow first, then Outflow
      return a === "Inflow" ? -1 : 1;
    } else {
      if (a === "Uncategorized" || a === "No account") return 1;
      if (b === "Uncategorized" || b === "No account") return -1;
      return a.localeCompare(b);
    }
  });

  const toggleSort = () => {
    if (sortOrder === "none") {
      setSortOrder("desc");
    } else if (sortOrder === "desc") {
      setSortOrder("asc");
    } else {
      setSortOrder("none");
    }
  };

  const getSortIcon = () => {
    if (sortOrder === "none") return <ArrowDownUp className="w-4 h-4" />;
    if (sortOrder === "asc") return <ArrowUp className="w-4 h-4" />;
    return <ArrowDown className="w-4 h-4" />;
  };

  // Get unique budgets for category filter
  const uniqueBudgets = Array.from(
    new Set(ledger.recurringTemplates.map((t) => t.budget).filter(Boolean))
  ) as NonNullable<RecurringTemplate["budget"]>[];

  return (
    <>
      <div className="px-8 py-4 flex gap-4 items-center border-b border-stone-200">
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
              "w-[200px]"
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

      <table className="table w-full">
        <thead>
          <tr className="border-b border-stone-300">
            <th className="px-3 pl-8 pr-2">
              <HeaderCell>Payee</HeaderCell>
            </th>
            <th className="px-3 pr-2">
              <HeaderCell>Account</HeaderCell>
            </th>
            <th className="px-3 pr-2">
              <HeaderCell>Category</HeaderCell>
            </th>
            <th className="px-3 pr-2">
              <HeaderCell>Schedule</HeaderCell>
            </th>
            <th className="px-3 pr-2">
              <HeaderCell alignRight>Amount</HeaderCell>
            </th>
            <th className="px-3 pr-2">
              <HeaderCell alignRight>
                <button
                  onClick={toggleSort}
                  className="flex items-center gap-1 ml-auto hover:opacity-70"
                >
                  Monthly avg {getSortIcon()}
                </button>
              </HeaderCell>
            </th>
            <th className="pr-2 px-3">
              <HeaderCell>Next date</HeaderCell>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedGroupKeys.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-12 text-muted-foreground">
                <p>No recurring transactions found</p>
              </td>
            </tr>
          ) : (
            sortedGroupKeys.map((groupKey) => {
              const groupTemplates = groupedTemplates.get(groupKey)!;
              const groupMonthlyTotal = Math.abs(
                groupTemplates.reduce((sum, template) => {
                  return sum + calculateMonthlyAmount(template);
                }, 0)
              );

              return (
                <Fragment key={groupKey}>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <td colSpan={7} className="">
                      <div className="py-2 px-3 pl-8 pr-2 text-sm font-bold flex justify-between items-center">
                        <span>{groupKey}</span>
                        <span className="font-mono text-muted-foreground">
                          {formatCurrency(groupMonthlyTotal)}/month
                        </span>
                      </div>
                    </td>
                  </tr>
                  {groupTemplates.map((template) => (
                    <tr
                      key={template.id}
                      className="hover:bg-stone-100 rounded-md border-b border-stone-200 group cursor-pointer"
                      onClick={() => setEditingTemplate(template)}
                    >
                      <td className="py-2 px-3 pl-8 pr-2 text-sm align-middle">
                        <div className="flex items-center">
                          {template.payee?.name || "No payee"}
                          <Button
                            className="opacity-0 group-hover:opacity-100 py-0 h-auto"
                            variant="link"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTemplate(template);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle">
                        {template.account?.name || "-"}
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle">
                        {template.budget?.name || "-"}
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm align-middle">
                        <span className="text-xs text-muted-foreground">
                          {template.scheduleDescription}
                        </span>
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm">
                        <AmountCell amount={template.amount} />
                      </td>
                      <td className="py-2 px-3 pr-2 text-sm">
                        <AmountCell amount={calculateMonthlyAmount(template)} />
                      </td>
                      <td className="py-2 pr-2 px-3 text-sm align-middle">
                        <span className="text-xs text-muted-foreground">
                          {template.nextScheduledDate.toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
      <RecurringTemplateModal template={editingTemplate} onOpenChange={setEditingTemplate} />
    </>
  );
});
