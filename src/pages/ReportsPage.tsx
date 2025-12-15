import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { InflowOutflowChart } from "@/features/reports/InflowOutflowChart";
import { NetWorthChart } from "@/features/reports/NetWorthChart";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";

export const ReportsPage = observer(() => {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

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
      <div className="px-8 py-6">
        <h2 className="text-2xl font-bold mb-6">Reports</h2>

        <div className="space-y-6">
          <NetWorthChart ledger={ledger} year={currentYear} />
          <InflowOutflowChart ledger={ledger} year={currentYear} />
        </div>
      </div>
    </PageLayout>
  );
});

export default ReportsPage;
