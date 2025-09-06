import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Budget } from "@/models/Budget";
import { useLedger } from "@/utils/useLedger";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";

export const AddBudgetModal = observer(function AddBudgetModal() {
    const { ledger } = useLedger();
    const [newEnvelope, setNewEnvelope] = useState<Budget | null>(null);
    const [name, setName] = useState("");
    const [group, setGroup] = useState(ledger?.budgetCategories[0]!);
  return (
    <div className="flex justify-between items-center px-8 py-4">
      <Dialog
        open={!!newEnvelope}
        onOpenChange={(open) => setNewEnvelope(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Budget Envelope</DialogTitle>
            <DialogDescription>
              Create a new budget envelope.
            </DialogDescription>
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
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="username" className="text-right">
                Group
              </label>
              <select
                value={group.id}
                onChange={(e) => {
                  const budgetCategory = ledger!.getBudgetCategoryByID(e.target.value);
                  if (budgetCategory) {
                    setGroup(budgetCategory);
                  }
                }}
              >
                {ledger!.budgetCategories.map((budgetCategory) => (
                  <option key={budgetCategory.id} value={budgetCategory.id}>
                    {budgetCategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                runInAction(() => {
                  newEnvelope!.name = name;
                  newEnvelope!.budgetCategory = group
                  ledger!.addBudget(newEnvelope!);
                  setNewEnvelope(null);
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        onClick={() => {
          setNewEnvelope(new Budget({ ledger: ledger!, id: null }));
        }}
      >
        New Envelope
      </Button>
    </div>
  );
});