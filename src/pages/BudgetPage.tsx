"use client";

import { Button } from "@/components/ui/button";
import { BudgetTable } from "@/features/budget/BudgetTable";
import { PageLayout } from "@/PageLayout";
import { formatCurrency, formatMonth } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
// import { redirect } from "next/navigation";

export default function BudgetPage() {
  const {ledger} = useLedger();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()))
  const navigate = useNavigate();

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }
  }, [ledger]);

  if (!ledger) {
    return null;
  }

  const l = ledger.alias.bind(ledger);


  return (
    <PageLayout>
      <div className="">
        <div className="flex justify-between items-center mb-6 p-8">
          <div className="flex justify-around items-center gap-2">
          <Button
            onClick={() => 
              setCurrentMonth(startOfMonth(subMonths(currentMonth, 1)))
            }
          >
            <ChevronLeft />
          </Button>
          <div>{formatMonth(currentMonth)}</div>
          <Button
            onClick={() =>
              setCurrentMonth(startOfMonth(addMonths(currentMonth, 1)))
            }
          >
            <ChevronRight />
          </Button>
          {!isSameMonth(new Date(), currentMonth) && (
            <Button onClick={
              () => setCurrentMonth(startOfMonth(new Date()))
              }>
              <Calendar />
            </Button>
          )}
        </div>
          <div className="text-[10px]">
            <div> from last month +</div>
            <div>inflow this month -</div>
            <div>assigned in future -</div>
            <div>assigned this month =</div>
          </div>
          <div>
            <div className="text-sm">Available to budget</div>
            <div className="text-md font-bold">
              {formatCurrency(
                ledger.budgetAvailableForMonth(
                  ledger.getBudget("inflow")!,
                  new Date()
                )
              )}
            </div>
          </div>
        </div>
        <BudgetTable currentMonth={currentMonth} ledger={ledger} l={l} />
      </div>
    </PageLayout>
  );
}
