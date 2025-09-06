import { AddPayeeModal } from "@/features/budget/AddPayeeModal";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export const PayeesPage = observer(function PayeesPage() {
  const { ledger } = useLedger();
  const navigate = useNavigate();

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
      <div className="flex justify-between items-center px-8 py-4">
        <h2 className="text-2xl font-bold">Payees</h2>
        <AddPayeeModal />
      </div>
      <div className="flex flex-col justify-between items-start px-8 py-4">
        {ledger!.payees.map((payee, index) => (
          <div
            key={index}
            className="flex justify-between items-center gap-2 p-2 hover:bg-mutedX rounded-md"
          >
            <div className="text-sm">{payee.name}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  );
});
