"use client";

import { Button } from "@/components/ui/button";
import { AddBudgetModal } from "@/features/budget/AddBudgetModal";
import { BudgetTable } from "@/features/budget/BudgetTable";
import { PageLayout } from "@/PageLayout";
import { formatCurrency, formatMonth } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

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
      <div className="">
        <div className="flex justify-between items-center mb-6 p-8">
          <div className="flex justify-around items-center gap-2">
            <Button
              size="icon"
              variant="secondary"
              onClick={() =>
                setCurrentMonth(startOfMonth(subMonths(currentMonth, 1)))
              }
            >
              <ChevronLeft />
            </Button>
            <div>{formatMonth(currentMonth)}</div>
            <Button
              size="icon"
              variant="secondary"
              onClick={() =>
                setCurrentMonth(startOfMonth(addMonths(currentMonth, 1)))
              }
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
          <div className="text-[10px]">
            <div>
              + from last month +{" "}
              {formatCurrency(
                ledger.budgetAvailableForMonth(
                  ledger.getInflowBudget()!,
                  subMonths(currentMonth, 1)
                )
              )}
            </div>
            <div>
              + inflow this month{" "}
              {formatCurrency(
                ledger.budgetActivityForMonth(
                  ledger.getInflowBudget()!,
                  currentMonth
                )
              )}
            </div>
            <div>- assigned in future</div>
            <div>
              - assigned this month {formatCurrency(ledger.assignedForMonth(currentMonth))}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">
              Available to budget
            </div>
            <div className="text-xl font-bold">
              {formatCurrency(
                ledger.budgetAvailableForMonth(
                  ledger.getInflowBudget()!,
                  currentMonth
                )
              )}
            </div>
          </div>
        </div>
        <AddBudgetModal />
        <BudgetTable currentMonth={currentMonth} ledger={ledger} />
      </div>
    </PageLayout>
  );
}
