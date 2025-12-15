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
import { Label } from "@/components/ui/label";
import { Account } from "@/models/Account";
import { useLedger } from "@/utils/useLedger";

interface CreateAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateAccountModal = observer(function CreateAccountModal({
  open,
  onOpenChange,
}: CreateAccountModalProps) {
  const { ledger } = useLedger();
  const [name, setName] = useState("");
  const [type, setType] = useState<"budget" | "tracking">("budget");

  const handleCreate = () => {
    if (!ledger || !name.trim()) return;

    runInAction(() => {
      const account = new Account({ id: null, ledger });
      account.name = name.trim();
      account.type = type;
      ledger.accounts.push(account);

      // Reset and close
      setName("");
      setType("budget");
      onOpenChange(false);
    });
  };

  const handleCancel = () => {
    setName("");
    setType("budget");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>Add a new account to track your finances.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              placeholder="e.g., Checking Account"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="account-type"
                  value="budget"
                  checked={type === "budget"}
                  onChange={() => setType("budget")}
                  className="cursor-pointer"
                />
                <span className="text-sm">Budget Account</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="account-type"
                  value="tracking"
                  checked={type === "tracking"}
                  onChange={() => setType("tracking")}
                  className="cursor-pointer"
                />
                <span className="text-sm">Tracking Account</span>
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Budget accounts are included in your budget. Tracking accounts are for monitoring
              balances only.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
