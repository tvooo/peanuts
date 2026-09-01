import { Pencil } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { AddPayeeModal, PayeeModal } from "@/features/budget/AddPayeeModal";
import { MergePayeesModal } from "@/features/budget/MergePayeesModal";
import { containerClass, surfaceClass } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { Payee } from "@/models/Payee";
import { PageLayout } from "@/PageLayout";
import { useLedger } from "@/utils/useLedger";

export const PayeesPage = observer(function PayeesPage() {
  const { ledger } = useLedger();
  const navigate = useNavigate();
  const [editingPayee, setEditingPayee] = useState<Payee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mergeOpen, setMergeOpen] = useState(false);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

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
        <div className="flex items-center gap-2">
          {selectedIds.size >= 2 && (
            <Button variant="outline" onClick={() => setMergeOpen(true)}>
              Merge {selectedIds.size} payees…
            </Button>
          )}
          <AddPayeeModal />
        </div>
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
                className="flex items-center gap-3 p-2 hover:bg-mutedX rounded-md"
              >
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedIds.has(payee.id)}
                  onChange={() => toggleSelected(payee.id)}
                />
                <button
                  type="button"
                  onClick={() => setEditingPayee(payee)}
                  className="group flex flex-1 justify-between items-center gap-4 text-left"
                >
                  <div
                    className={`flex items-center gap-2 text-sm ${isUnused ? "text-muted-foreground" : ""}`}
                  >
                    {payee.name}
                    <Pencil
                      size={12}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100"
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                    {isUnused ? (
                      <span>Unused</span>
                    ) : (
                      <>
                        <span>
                          {transactionCount}{" "}
                          {transactionCount === 1 ? "transaction" : "transactions"}
                        </span>
                        {recurringCount > 0 && <span>{recurringCount} recurring</span>}
                      </>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <PayeeModal
        payee={editingPayee}
        open={!!editingPayee}
        onOpenChange={(open) => !open && setEditingPayee(null)}
      />
      <MergePayeesModal
        payees={ledger.payees.filter((p) => selectedIds.has(p.id))}
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        onMerged={() => setSelectedIds(new Set())}
      />
    </PageLayout>
  );
});
