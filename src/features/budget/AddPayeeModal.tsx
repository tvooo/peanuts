import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Payee } from "@/models/Payee";
import { useLedger } from "@/utils/useLedger";

interface PayeeModalProps {
  /** Existing payee to rename; null creates a new one */
  payee: Payee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PayeeModal = observer(function PayeeModal({
  payee,
  open,
  onOpenChange,
}: PayeeModalProps) {
  const { ledger } = useLedger();
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName(payee?.name ?? "");
  }, [open, payee]);

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (payee) {
      payee.setName(trimmed);
    } else {
      runInAction(() => {
        const newPayee = new Payee({ ledger: ledger!, id: null });
        newPayee.name = trimmed;
        ledger!.payees.push(newPayee);
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{payee ? "Edit Payee" : "New Payee"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="payee-name" className="text-right">
              Payee name
            </label>
            <Input
              id="payee-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirm()}
              onFocus={(e) => e.currentTarget.select()}
              className="col-span-3"
              placeholder="Amazon, Grocery Store, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="submit" onClick={confirm} disabled={!name.trim()}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export const AddPayeeModal = observer(function AddPayeeModal() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-between items-center px-8 py-4">
      <PayeeModal payee={null} open={open} onOpenChange={setOpen} />
      <Button onClick={() => setOpen(true)}>New Payee</Button>
    </div>
  );
});
