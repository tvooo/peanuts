import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { AddPayeeModal } from "@/features/budget/AddPayeeModal";
import { containerClass, surfaceClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";

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

  // Transfers move money between own accounts and never reference a payee, so
  // usage is counted from transactions plus the recurring templates that would
  // create new ones.
  const transactionCounts = new Map<string, number>();
  for (const transaction of ledger.transactions) {
    if (!transaction.payee) continue;
    transactionCounts.set(
      transaction.payee.id,
      (transactionCounts.get(transaction.payee.id) ?? 0) + 1
    );
  }

  const recurringCounts = new Map<string, number>();
  for (const template of ledger.recurringTemplates) {
    if (!template.payee) continue;
    recurringCounts.set(template.payee.id, (recurringCounts.get(template.payee.id) ?? 0) + 1);
  }

  return (
    <PageLayout>
      <div className={cn(containerClass, "flex justify-between items-center py-4")}>
        <h2 className="text-2xl font-bold">Payees</h2>
        <AddPayeeModal />
      </div>
      <div className={cn(containerClass, "pb-6")}>
        <div className={cn(surfaceClass, "flex flex-col items-stretch p-2")}>
          {ledger.payees.map((payee) => {
            const transactionCount = transactionCounts.get(payee.id) ?? 0;
            const recurringCount = recurringCounts.get(payee.id) ?? 0;
            const isUnused = transactionCount === 0 && recurringCount === 0;

            return (
              <div
                key={payee.id}
                className="flex justify-between items-center gap-4 p-2 hover:bg-mutedX rounded-md"
              >
                <div className={`text-sm ${isUnused ? "text-muted-foreground" : ""}`}>
                  {payee.name}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                  {isUnused ? (
                    <span>Unused</span>
                  ) : (
                    <>
                      <span>
                        {transactionCount} {transactionCount === 1 ? "transaction" : "transactions"}
                      </span>
                      {recurringCount > 0 && <span>{recurringCount} recurring</span>}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageLayout>
  );
});
