import { Combobox, type ComboboxGroup } from "@/components/Combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Account } from "@/models/Account";
import { Budget } from "@/models/Budget";
import { Payee } from "@/models/Payee";
import { RecurringTemplate } from "@/models/RecurringTemplate";
import { formatDateIsoShort } from "@/utils/formatting";
import { processRecurringTemplates } from "@/utils/recurringTransactions";
import { useLedger } from "@/utils/useLedger";
import { startOfDay } from "date-fns";
import { ArrowDownToLine } from "lucide-react";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RRule } from "rrule";

type FrequencyType = "weekly" | "biweekly" | "monthly" | "yearly";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  { label: "Sun", value: RRule.SU },
  { label: "Mon", value: RRule.MO },
  { label: "Tue", value: RRule.TU },
  { label: "Wed", value: RRule.WE },
  { label: "Thu", value: RRule.TH },
  { label: "Fri", value: RRule.FR },
  { label: "Sat", value: RRule.SA },
];

interface RecurringTemplateModalProps {
  template?: RecurringTemplate | null;
  onOpenChange?: (template: RecurringTemplate | null) => void;
}

export const RecurringTemplateModal = observer(function RecurringTemplateModal({
  template: externalTemplate,
  onOpenChange,
}: RecurringTemplateModalProps = {}) {
  const { ledger } = useLedger();
  const [internalTemplate, setInternalTemplate] = useState<RecurringTemplate | null>(null);

  // Use external template if provided, otherwise use internal state
  const template = externalTemplate ?? internalTemplate;
  const setTemplate = onOpenChange ?? setInternalTemplate;

  // Form state
  const [account, setAccount] = useState<Account | null>(null);
  const [payee, setPayee] = useState<Payee | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Schedule state
  const [frequency, setFrequency] = useState<FrequencyType>("monthly");
  const [dayOfWeek, setDayOfWeek] = useState<number>(RRule.MO.weekday); // For weekly/biweekly
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [isLastDay, setIsLastDay] = useState<boolean>(false);
  const [month, setMonth] = useState<number>(1); // For yearly
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [hasEndDate, setHasEndDate] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Check if we're editing an existing template (it exists in the ledger)
  const isEditing = template && ledger?.recurringTemplates.some((t) => t.id === template.id);

  // When template changes, populate the form
  useEffect(() => {
    if (template?.id) {
      // Editing existing template
      setAccount(template.account);
      setPayee(template.payee);
      setBudget(template.budget);
      setAmount(template.amount.toString());
      setNote(template.note || "");
      setStartDate(template.startDate);
      setHasEndDate(!!template.endDate);
      setEndDate(template.endDate);

      // Parse rrule to determine frequency and settings
      const rule = template.rrule;
      const freq = rule.options.freq;
      const interval = rule.options.interval || 1;

      if (freq === RRule.WEEKLY) {
        setFrequency(interval === 2 ? "biweekly" : "weekly");
        if (rule.options.byweekday && rule.options.byweekday.length > 0) {
          // Handle both Weekday objects and plain numbers
          const weekdayValue = rule.options.byweekday[0];
          // const weekdayNum =
          //   typeof weekdayValue === "number"
          //     ? weekdayValue
          //     : (weekdayValue?.weekday ?? RRule.MO.weekday);
          // setDayOfWeek(weekdayNum);
          setDayOfWeek(weekdayValue);
        }
      } else if (freq === RRule.MONTHLY) {
        setFrequency("monthly");
        if (rule.options.bymonthday && rule.options.bymonthday.length > 0) {
          const day = rule.options.bymonthday[0];
          if (day === -1) {
            setIsLastDay(true);
          } else {
            setDayOfMonth(day);
            setIsLastDay(false);
          }
        }
      } else if (freq === RRule.YEARLY) {
        setFrequency("yearly");
        if (rule.options.bymonth && rule.options.bymonth.length > 0) {
          setMonth(rule.options.bymonth[0]);
        }
        if (rule.options.bymonthday && rule.options.bymonthday.length > 0) {
          const day = rule.options.bymonthday[0];
          if (day === -1) {
            setIsLastDay(true);
          } else {
            setDayOfMonth(day);
            setIsLastDay(false);
          }
        }
      }
    }
  }, [template]);

  // Group budgets by category
  const budgetGroups = useMemo(() => {
    if (!ledger) return [];

    const groups: ComboboxGroup<any>[] = [];
    const categorizedBudgets = new Map<string, Budget[]>();
    const uncategorized: Budget[] = [];
    let inflowBudget: Budget | null = null;

    ledger._budgets.forEach((budget) => {
      if (budget.isToBeBudgeted) {
        inflowBudget = budget;
        return;
      }

      if (budget.budgetCategory) {
        const categoryId = budget.budgetCategory.id;
        if (!categorizedBudgets.has(categoryId)) {
          categorizedBudgets.set(categoryId, []);
        }
        categorizedBudgets.get(categoryId)!.push(budget);
      } else {
        uncategorized.push(budget);
      }
    });

    if (inflowBudget) {
      groups.push({
        label: "",
        options: [
          {
            id: (inflowBudget as Budget).id,
            label: "Inflow",
            budget: inflowBudget,
            icon: <ArrowDownToLine className="mr-1.5" size={14} />,
          },
        ],
      });
    }

    ledger.budgetCategories.forEach((category) => {
      const budgets = categorizedBudgets.get(category.id);
      if (budgets && budgets.length > 0) {
        groups.push({
          label: category.name,
          options: budgets.map((b) => ({
            id: b.id,
            label: b.name,
            budget: b,
          })),
        });
      }
    });

    if (uncategorized.length > 0) {
      groups.push({
        label: "Uncategorized",
        options: uncategorized.map((b) => ({
          id: b.id,
          label: b.name,
          budget: b,
        })),
      });
    }

    return groups;
  }, [ledger]);

  // Generate RRULE string based on current settings
  const generateRRuleString = useCallback((): string => {
    const weekdayStr = WEEKDAYS.find((w) => w.value.weekday === dayOfWeek)?.value.toString();

    if (frequency === "weekly") {
      return `FREQ=WEEKLY;BYDAY=${weekdayStr}`;
    } else if (frequency === "biweekly") {
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${weekdayStr}`;
    } else if (frequency === "monthly") {
      if (isLastDay) {
        return "FREQ=MONTHLY;BYMONTHDAY=-1";
      } else {
        return `FREQ=MONTHLY;BYMONTHDAY=${dayOfMonth}`;
      }
    } else {
      // Yearly
      if (isLastDay) {
        return `FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=-1`;
      } else {
        return `FREQ=YEARLY;BYMONTH=${month};BYMONTHDAY=${dayOfMonth}`;
      }
    }
  }, [dayOfWeek, dayOfMonth, frequency, isLastDay, month]);

  // Calculate preview information
  const previewInfo = useMemo(() => {
    try {
      const rruleString = generateRRuleString();
      const rule = RRule.fromString(rruleString);
      // Set dtstart to properly handle biweekly intervals - normalize to start of day
      const normalizedStart = startOfDay(startDate);
      rule.options.dtstart = normalizedStart;
      const nextOccurrence = rule.after(normalizedStart, false);

      return {
        text: rule.toText(),
        nextDate: nextOccurrence,
        isValid: true,
      };
    } catch (_e) {
      return {
        text: "Invalid schedule",
        nextDate: null,
        isValid: false,
      };
    }
  }, [startDate, generateRRuleString]);

  const resetForm = () => {
    setTemplate(null);
    setAccount(null);
    setPayee(null);
    setBudget(null);
    setAmount("");
    setNote("");
    setFrequency("monthly");
    setDayOfWeek(RRule.MO.weekday);
    setDayOfMonth(1);
    setIsLastDay(false);
    setMonth(1);
    setStartDate(new Date());
    setHasEndDate(false);
    setEndDate(null);
  };

  const handleCreate = () => {
    if (!ledger || !account) return;

    runInAction(() => {
      const newTemplate = new RecurringTemplate({ ledger, id: null });
      newTemplate.rruleString = generateRRuleString();
      newTemplate.account = account;
      newTemplate.payee = payee;
      newTemplate.budget = budget;
      newTemplate.amount = parseInt(amount, 10) || 0;
      newTemplate.note = note;
      newTemplate.startDate = startOfDay(startDate);
      newTemplate.nextScheduledDate = startOfDay(previewInfo.nextDate || startDate);
      newTemplate.endDate = hasEndDate && endDate ? startOfDay(endDate) : null;

      ledger.recurringTemplates.push(newTemplate);

      // Immediately process the new template to create the first transaction
      processRecurringTemplates(ledger);

      resetForm();
    });
  };

  const handleUpdate = () => {
    if (!ledger || !account || !template || !template.id) return;

    runInAction(() => {
      template.rruleString = generateRRuleString();
      template.account = account;
      template.payee = payee;
      template.budget = budget;
      template.amount = parseInt(amount, 10) || 0;
      template.note = note;
      template.startDate = startOfDay(startDate);
      template.nextScheduledDate = startOfDay(previewInfo.nextDate || startDate);
      template.endDate = hasEndDate && endDate ? startOfDay(endDate) : null;

      // Process templates to update scheduled transactions
      processRecurringTemplates(ledger);

      resetForm();
    });
  };

  // Render weekday selector
  const renderWeekdaySelector = () => {
    return (
      <div className="flex gap-2">
        {WEEKDAYS.map((weekday) => (
          <button
            key={weekday.value.weekday}
            type="button"
            onClick={() => setDayOfWeek(weekday.value.weekday)}
            className={cn(
              "h-9 flex-1 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              dayOfWeek === weekday.value.weekday
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-input"
            )}
          >
            {weekday.label}
          </button>
        ))}
      </div>
    );
  };

  // Render day selector grid
  const renderDaySelector = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => {
              setDayOfMonth(day);
              setIsLastDay(false);
            }}
            className={cn(
              "h-9 w-9 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              dayOfMonth === day && !isLastDay
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-input"
            )}
          >
            {day}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIsLastDay(true)}
          className={cn(
            "col-span-2 h-9 rounded-md text-sm font-medium transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            isLastDay ? "bg-primary text-primary-foreground" : "bg-background border border-input"
          )}
        >
          Last day
        </button>
      </div>
    );
  };

  return (
    <>
      <Dialog
        open={!!template}
        onOpenChange={(open) => {
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit" : "New"} Recurring Transaction</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update this" : "Create a"} recurring transaction template that will
              automatically generate transactions based on a schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Transaction Details Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Transaction Details</h3>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm" htmlFor="account">
                  Account
                </label>
                <select
                  id="account"
                  className={cn(
                    "col-span-3 h-9 rounded-md border border-input bg-white px-3 py-1",
                    "text-sm shadow-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  )}
                  value={account?.id || ""}
                  onChange={(e) => {
                    const acc = ledger?.accounts.find((a) => a.id === e.target.value);
                    setAccount(acc || null);
                  }}
                >
                  <option value="">Select account...</option>
                  {ledger?.accounts
                    .filter((a) => !a.archived && a.type === "budget")
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm" htmlFor="payee">
                  Payee
                </label>
                <div className="col-span-3">
                  <Combobox
                    id="payee"
                    options={
                      ledger?.payees.map((p) => ({
                        id: p.id,
                        label: p.name,
                        payee: p,
                      })) || []
                    }
                    value={
                      payee
                        ? {
                            id: payee.id,
                            label: payee.name,
                            payee: payee,
                          }
                        : null
                    }
                    onValueChange={(option: any) => setPayee(option.payee)}
                    onCreateNew={(name) => {
                      return new Promise<any>((resolve) => {
                        runInAction(() => {
                          const newPayee = new Payee({ ledger: ledger!, id: null });
                          newPayee.name = name;
                          ledger!.payees.push(newPayee);
                          resolve({
                            id: newPayee.id,
                            label: newPayee.name,
                            payee: newPayee,
                          });
                        });
                      });
                    }}
                    placeholder="Select payee..."
                    emptyText="No payees found."
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="category" className="text-right text-sm">
                  Category
                </label>
                <div className="col-span-3">
                  <Combobox
                    id="category"
                    groups={budgetGroups}
                    value={
                      budget
                        ? {
                            id: budget.id,
                            label: budget.isToBeBudgeted ? "Inflow" : budget.name,
                            budget: budget,
                            icon: budget.isToBeBudgeted ? (
                              <ArrowDownToLine className="mr-1.5" size={14} />
                            ) : undefined,
                          }
                        : null
                    }
                    onValueChange={(option: any) => setBudget(option.budget)}
                    onCreateNew={(name) => {
                      return new Promise<any>((resolve) => {
                        runInAction(() => {
                          const newBudget = new Budget({ ledger: ledger!, id: null });
                          newBudget.name = name;
                          ledger!._budgets.push(newBudget);
                          resolve({
                            id: newBudget.id,
                            label: newBudget.name,
                            budget: newBudget,
                          });
                        });
                      });
                    }}
                    placeholder="Select category..."
                    emptyText="No categories found."
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="amount" className="text-right text-sm">
                  Amount (cents)
                </label>
                <Input
                  id="amount"
                  type="number"
                  className="col-span-3 tabular-nums"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="note" className="text-right text-sm">
                  Note
                </label>
                <Input
                  id="note"
                  type="text"
                  className="col-span-3"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note..."
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-sm">Schedule</h3>

              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right text-sm">Frequency</div>
                <div className="col-span-3 grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={frequency === "weekly" ? "default" : "outline"}
                    onClick={() => setFrequency("weekly")}
                  >
                    Weekly
                  </Button>
                  <Button
                    type="button"
                    variant={frequency === "biweekly" ? "default" : "outline"}
                    onClick={() => setFrequency("biweekly")}
                  >
                    Biweekly
                  </Button>
                  <Button
                    type="button"
                    variant={frequency === "monthly" ? "default" : "outline"}
                    onClick={() => setFrequency("monthly")}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={frequency === "yearly" ? "default" : "outline"}
                    onClick={() => setFrequency("yearly")}
                  >
                    Yearly
                  </Button>
                </div>
              </div>

              {frequency === "yearly" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <label htmlFor="month" className="text-right text-sm">
                    Month
                  </label>
                  <select
                    id="month"
                    className={cn(
                      "col-span-3 h-9 rounded-md border border-input bg-white px-3 py-1",
                      "text-sm shadow-sm transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    )}
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={idx} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(frequency === "weekly" || frequency === "biweekly") && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <div className="text-right text-sm mt-2">Day of week</div>
                  <div className="col-span-3">{renderWeekdaySelector()}</div>
                </div>
              )}

              {(frequency === "monthly" || frequency === "yearly") && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <div className="text-right text-sm mt-2">Day of month</div>
                  <div className="col-span-3">{renderDaySelector()}</div>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right text-sm">Start date</div>
                <Input
                  type="date"
                  className="col-span-3"
                  value={formatDateIsoShort(startDate)}
                  onChange={(e) => setStartDate(new Date(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <div className="text-right text-sm">End date</div>
                <div className="col-span-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasEndDate}
                    onChange={(e) => {
                      setHasEndDate(e.target.checked);
                      if (e.target.checked && !endDate) {
                        setEndDate(new Date());
                      }
                    }}
                    className="rounded"
                  />
                  {hasEndDate && (
                    <Input
                      type="date"
                      className="flex-1"
                      value={endDate ? formatDateIsoShort(endDate) : ""}
                      onChange={(e) => setEndDate(new Date(e.target.value))}
                    />
                  )}
                  {!hasEndDate && (
                    <span className="text-sm text-muted-foreground">No end date</span>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="space-y-2 border-t pt-4 bg-muted/30 -mx-6 px-6 py-4">
              <h3 className="font-semibold text-sm">Preview</h3>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">Schedule: </span>
                  <span className="font-medium">{previewInfo.text}</span>
                </div>
                {previewInfo.nextDate && (
                  <div>
                    <span className="text-muted-foreground">Next occurrence: </span>
                    <span className="font-medium">{previewInfo.nextDate.toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => resetForm()}>
              Cancel
            </Button>
            <Button
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={!account || !previewInfo.isValid}
            >
              {isEditing ? "Update" : "Create"} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!externalTemplate && (
        <Button
          onClick={() => {
            setTemplate(new RecurringTemplate({ ledger: ledger!, id: null }));
            setStartDate(new Date());
          }}
        >
          New Template
        </Button>
      )}
    </>
  );
});
