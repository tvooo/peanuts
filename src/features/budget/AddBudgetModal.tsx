import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Budget, BudgetCategory } from "@/models/Budget";
import { useLedger } from "@/utils/useLedger";

export const AddBudgetModal = observer(function AddBudgetModal() {
  const { ledger } = useLedger();
  const [newEnvelope, setNewEnvelope] = useState<Budget | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState(ledger?.budgetCategories[0] ?? null);

  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");

  return (
    <>
      {/* New Envelope dialog */}
      <Dialog open={!!newEnvelope} onOpenChange={() => setNewEnvelope(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Budget Envelope</DialogTitle>
            <DialogDescription>Create a new budget envelope.</DialogDescription>
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
                value={group?.id ?? ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    setGroup(null);
                  } else {
                    const budgetCategory = ledger!.getBudgetCategoryByID(e.target.value);
                    if (budgetCategory) {
                      setGroup(budgetCategory);
                    }
                  }
                }}
              >
                <option value="">Uncategorized</option>
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
                  newEnvelope!.budgetCategory = group;
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

      {/* New Group dialog */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
            <DialogDescription>Create a new budget category group.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="group-name" className="text-right">
                Group name
              </label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="col-span-3"
                placeholder="Bills"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && groupName.trim()) {
                    runInAction(() => {
                      const category = new BudgetCategory({ ledger: ledger!, id: null });
                      category.name = groupName.trim();
                      ledger!.addBudgetCategory(category);
                      setGroupName("");
                      setNewGroupOpen(false);
                    });
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!groupName.trim()}
              onClick={() => {
                runInAction(() => {
                  const category = new BudgetCategory({ ledger: ledger!, id: null });
                  category.name = groupName.trim();
                  ledger!.addBudgetCategory(category);
                  setGroupName("");
                  setNewGroupOpen(false);
                });
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setGroupName("");
            setNewGroupOpen(true);
          }}
        >
          New Group
        </Button>
        <Button
          onClick={() => {
            setNewEnvelope(new Budget({ ledger: ledger!, id: null }));
          }}
        >
          New Envelope
        </Button>
      </div>
    </>
  );
});
