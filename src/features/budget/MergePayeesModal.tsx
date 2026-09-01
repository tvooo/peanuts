import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Ledger } from "@/models/Ledger";
import type { Payee } from "@/models/Payee";
import { useLedger } from "@/utils/useLedger";

interface MergePayeesModalProps {
  payees: Payee[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
}

function countTransactions(ledger: Ledger): Map<string, number> {
  const counts = new Map<string, number>();
  for (const transaction of ledger.transactions) {
    if (!transaction.payee) continue;
    counts.set(transaction.payee.id, (counts.get(transaction.payee.id) ?? 0) + 1);
  }
  return counts;
}

export const MergePayeesModal = observer(function MergePayeesModal({
  payees,
  open,
  onOpenChange,
  onMerged,
}: MergePayeesModalProps) {
  const { ledger } = useLedger();
  const [targetId, setTargetId] = useState<string | null>(null);

  // Default to keeping the most-used payee
  // biome-ignore lint/correctness/useExhaustiveDependencies: initialize the target once per dialog opening
  useEffect(() => {
    if (!open || !ledger) return;
    const counts = countTransactions(ledger);
    const best = [...payees].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0))[0];
    setTargetId(best?.id ?? null);
  }, [open]);

  if (!ledger) return null;

  const counts = countTransactions(ledger);
  const target = payees.find((p) => p.id === targetId);

  const confirm = () => {
    if (!target) return;
    ledger.mergePayees(
      target,
      payees.filter((p) => p.id !== target.id)
    );
    onOpenChange(false);
    onMerged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge payees</DialogTitle>
          <DialogDescription>
            Choose which payee to keep. The others&apos; transactions and import aliases move to it,
            and they are deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1 py-2">
          {payees.map((payee) => {
            const count = counts.get(payee.id) ?? 0;
            return (
              <label
                key={payee.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <input
                  type="radio"
                  name="merge-target"
                  checked={payee.id === targetId}
                  onChange={() => setTargetId(payee.id)}
                />
                <span className="flex-1 text-sm">{payee.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count} {count === 1 ? "transaction" : "transactions"}
                </span>
              </label>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={!target}>
            Merge into &quot;{target?.name}&quot;
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
