import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { InflowOutflowChart } from "@/features/reports/InflowOutflowChart";
import { NetWorthChart } from "@/features/reports/NetWorthChart";
import { narrowContainerClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";

export const ReportsPage = observer(() => {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }
  }, [ledger, navigate]);

  if (!ledger) {
    return null;
  }

  return (
    <PageLayout>
      <div className={cn(narrowContainerClass, "py-6")}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Reports</h2>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="secondary" onClick={() => setCurrentYear((y) => y - 1)}>
              <ChevronLeft />
            </Button>
            <div className="min-w-[4rem] text-center font-medium">{currentYear}</div>
            <Button size="icon" variant="secondary" onClick={() => setCurrentYear((y) => y + 1)}>
              <ChevronRight />
            </Button>
            {currentYear !== new Date().getFullYear() && (
              <Button
                onClick={() => setCurrentYear(new Date().getFullYear())}
                size="icon"
                variant="secondary"
              >
                <Calendar />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <NetWorthChart ledger={ledger} year={currentYear} />
          <InflowOutflowChart ledger={ledger} year={currentYear} />
        </div>
      </div>
    </PageLayout>
  );
});

export default ReportsPage;
