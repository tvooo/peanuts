import { PageLayout } from "@/PageLayout";
import { formatCurrency } from "@/utils/formatting";
import { useLedger } from "@/utils/useLedger";
import { useEffect } from "react";
import { useNavigate } from "react-router";

export const SubscriptionsPage = () => {
  const { ledger } = useLedger();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ledger) {
      navigate("/");
      return;
    }
  }, [ledger]);

  if (!ledger) {
    return null;
  }

  const monthly = ledger!.recurringTransactions.filter(rt => rt.period === "monthly")
  const yearly = ledger!.recurringTransactions.filter(rt => rt.period === "yearly")

  const yearTotal = Math.abs(ledger!.recurringTransactions.reduce((sum, rt) => {
    return sum + (rt.period === "yearly" ? rt.amount : rt.amount * 12);
  }, 0));
  const monthAverage = Math.ceil(yearTotal / 12);


  return (
    <PageLayout>
      <div className="flex justify-between items-center px-8 py-4">
        <h2 className="text-2xl font-bold">
          Subscriptions &amp; Recurring Transactions
        </h2>
        <div>
          <div className="text-sm">Yearly total</div>
          <div className="text-md font-bold">{formatCurrency(yearTotal)}</div>
        </div>
        <div>
          <div className="text-sm">Monthly average</div>
          <div className="text-md font-bold">{formatCurrency(monthAverage)}</div>
        </div>
      </div>
      <div className="flex flex-col justify-between items-start px-8 py-4">
        {ledger!.recurringTransactions.map((rt, index) => (
          <div
            key={index}
            className="flex justify-between items-center gap-2 p-2 hover:bg-mutedX rounded-md"
          >
            <div className="text-sm font-mono">{rt.period}</div>
            <div className="text-sm">{rt.postings[0].payee?.name}</div>
            <div className="text-sm font-mono">
              {formatCurrency(rt.postings[0].amount)}
            </div>
          </div>
        ))}
      </div>
      {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <div className="w-7 h-7 my-2 rounded-2xl bg-green-600 flex items-center justify-center">
                <PiggyBank size={16} color="white" />
              </div>
              <strong>Joint budget</strong>
              <ChevronsUpDown size={16} className="ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-popper-anchor-width]">
            <DropdownMenuItem>
              <SaveIcon size={16} />
              <span>Save changes</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <DoorClosedIcon size={16} />
              <span>Close ledger</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
    </PageLayout>
  );
};
