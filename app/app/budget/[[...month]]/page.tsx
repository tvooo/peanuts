"use client";


import { BudgetTable } from "@/features/budget/BudgetTable";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { redirect } from "next/navigation";

export default function AccountPage() {
  const ledger = useLedger();

  if (!ledger) {
    redirect("/app");
  }

  const l = ledger.alias.bind(ledger);

  return (
    <div className="">
      <div className="flex justify-between items-center mb-6 p-8">
        {/* <div className="flex justify-around items-center gap-2">
          <Button
            onClick={() =>
              setCurrentMonth(startOfMonth(subMonths(currentMonth, 1)))
            }
          >
            <NavArrowLeft />
          </Button>
          <div>{formatMonth(currentMonth)}</div>
          <Button
            onClick={() =>
              setCurrentMonth(startOfMonth(addMonths(currentMonth, 1)))
            }
          >
            <NavArrowRight />
          </Button>
          {!isSameMonth(new Date(), currentMonth) && (
            <Button onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
              <Calendar />
            </Button>
          )}
        </div> */}
        <div className="text-[10px] hidden">
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
      <BudgetTable currentMonth={new Date()} ledger={ledger} l={l} />
    </div>
  );
}
