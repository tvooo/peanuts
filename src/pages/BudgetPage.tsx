"use client";

import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AddBudgetModal } from "@/features/budget/AddBudgetModal";
import { AvailableToBudgetPopover } from "@/features/budget/AvailableToBudgetPopover";
import { BudgetTable } from "@/features/budget/BudgetTable";
import { PageLayout } from "@/PageLayout";
import { formatMonth } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";

export default function BudgetPage() {
  const { ledger } = useLedger();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [overspentOnly, setOverspentOnly] = useState(false);
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
          <AvailableToBudgetPopover currentMonth={currentMonth} ledger={ledger} />
        </div>

        {/* Fixed header - Filters and actions */}
        <div className="flex justify-between items-center px-8 py-4 shrink-0">
          <div className="flex gap-2 items-center">
            <Input
              type="text"
              placeholder="Filter envelopes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            {/** biome-ignore lint/a11y/noLabelWithoutControl: Checkbox is inside the label, so htmlFor is not necessary */}
            <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
              <Checkbox
                checked={overspentOnly}
                onCheckedChange={(checked) => setOverspentOnly(checked === true)}
              />
              Overspent
            </label>
          </div>
          <AddBudgetModal />
        </div>

        {/* Table container */}
        <div className="flex-1 min-h-0">
          <BudgetTable
            currentMonth={currentMonth}
            ledger={ledger}
            searchQuery={searchQuery}
            overspentOnly={overspentOnly}
          />
        </div>
      </div>
    </PageLayout>
  );
}
