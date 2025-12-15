import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
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

export const AddPayeeModal = observer(function AddPayeeModal() {
  const { ledger } = useLedger();
  const [newPayee, setNewPayee] = useState<Payee | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Misc");
  return (
    <div className="flex justify-between items-center px-8 py-4">
      <Dialog open={!!newPayee} onOpenChange={(open) => setNewPayee(null)}>
        {/* <DialogTrigger>Open</DialogTrigger> */}
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Budget Envelope</DialogTitle>
            {/* <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </DialogDescription> */}
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Budget name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Car repair"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                runInAction(() => {
                  newPayee!.name = name;
                  ledger!.payees.push(newPayee!);
                });
                setNewPayee(null);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        onClick={() => {
          setNewPayee(new Payee({ ledger: ledger!, id: null }));
        }}
      >
        New Payee
      </Button>
    </div>
  );
});
