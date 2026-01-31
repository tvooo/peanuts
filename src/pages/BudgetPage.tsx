"use client";

import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { AddBudgetModal } from "@/features/budget/AddBudgetModal";
import { BudgetTable } from "@/features/budget/BudgetTable";
import { PageLayout } from "@/PageLayout";
import { formatCurrency, formatMonth } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export default function BudgetPage() {
  const { ledger } = useLedger();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const navigate = useNavigate();

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }
  }, [navigate, ledger]);

  if (!ledger) {
    return null;
  }

  return (
    <PageLayout>
      <div className="flex flex-col h-full">
        {/* Fixed header - Month navigation and budget summary */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <div className="flex justify-around items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setCurrentMonth(startOfMonth(subMonths(currentMonth, 1)))}
            >
              <ChevronLeft />
            </Button>
            <div>{formatMonth(currentMonth)}</div>
            <Button
              size="icon"
              variant="secondary"
              onClick={() => setCurrentMonth(startOfMonth(addMonths(currentMonth, 1)))}
            >
              <ChevronRight />
            </Button>
            {!isSameMonth(new Date(), currentMonth) && (
              <Button
                onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                size="icon"
                variant="secondary"
              >
                <Calendar />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Last month</span>
              <span className="tabular-nums text-green-600">
                +
                {formatCurrency(
                  ledger.budgetAvailableForMonth(
                    ledger.getInflowBudget()!,
                    subMonths(currentMonth, 1)
                  )
                )}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Inflow</span>
              <span className="tabular-nums text-green-600">
                +
                {formatCurrency(
                  ledger.budgetActivityForMonth(ledger.getInflowBudget()!, currentMonth)
                )}
              </span>
            </div>
            {(() => {
              const futureNet =
                ledger.inflowAfterMonth(currentMonth) - ledger.assignedAfterMonth(currentMonth);
              if (futureNet === 0) return null;
              return (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Future</span>
                  <span
                    className={`tabular-nums ${futureNet >= 0 ? "text-green-600" : "text-orange-600"}`}
                  >
                    {futureNet >= 0 ? "+" : ""}
                    {formatCurrency(futureNet)}
                  </span>
                </div>
              );
            })()}
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">This month</span>
              <span className="tabular-nums text-orange-600">
                -{formatCurrency(ledger.assignedForMonth(currentMonth))}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Available to budget</div>
            <div className="text-xl font-bold tabular-nums">
              {formatCurrency(
                ledger.budgetAvailableForMonth(ledger.getInflowBudget()!, currentMonth) -
                  Math.max(
                    0,
                    ledger.assignedAfterMonth(currentMonth) - ledger.inflowAfterMonth(currentMonth)
                  )
              )}
            </div>
          </div>
        </div>

        {/* Fixed header - Actions */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <AddBudgetModal />
        </div>

        {/* Table container */}
        <div className="flex-1 min-h-0">
          <BudgetTable currentMonth={currentMonth} ledger={ledger} />
        </div>
      </div>
    </PageLayout>
  );
}
