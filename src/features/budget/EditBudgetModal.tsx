import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Budget } from "@/models/Budget";
import { useLedger } from "@/utils/useLedger";
import { runInAction } from "mobx";
import { observer } from "mobx-react-lite";

export const EditBudgetModal = observer(function EditBudgetModal({
  envelope,
  setEnvelope
}: { envelope: Budget | null, setEnvelope: (envelope: Budget | null) => void }) {
    const { ledger } = useLedger();
  return (
    <div className="flex justify-between items-center px-8 py-4">
      <Dialog
        open={!!envelope}
        onOpenChange={(open) => !open && setEnvelope(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Budget Envelope</DialogTitle>
            <DialogDescription>
              Create a new budget envelope.
            </DialogDescription>
          </DialogHeader>

          {envelope && <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="name" className="text-right">
                Budget name
              </label>
              <Input
                value={envelope.name}
                onChange={(e) => {
                  runInAction(() => {
                    envelope.name = e.target.value;
                  })
                }}
                className="col-span-3"
                placeholder="Car repair"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="username" className="text-right">
                Group
              </label>
              <select
                value={envelope.budgetCategory?.id || ""}
                onChange={(e) => {
                  const budgetCategory = ledger!.getBudgetCategoryByID(e.target.value);
                  if (budgetCategory) {
                    runInAction(() => {
                      envelope.budgetCategory = budgetCategory;
                    })
                  }
                }}
              >
                <option value=""></option>
                {ledger!.budgetCategories.map((budgetCategory) => (
                  <option key={budgetCategory.id} value={budgetCategory.id}>
                    {budgetCategory.name}
                  </option>
                ))}
              </select>
            </div>
          </div>}

          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                runInAction(() => {
                  // envelope!.name = name;
                  // newEnvelope!.budgetCategory = group
                  // ledger!.addBudget(newEnvelope!);
                  setEnvelope(null);
                });
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* <Button
        onClick={() => {
          setEnvelope(new Budget({ ledger: ledger!, id: null }));
        }}
      >
        New Envelope
      </Button> */}
    </div>
  );
});