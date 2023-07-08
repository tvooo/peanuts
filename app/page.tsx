"use client";

import {
  Calendar,
  NavArrowLeft,
  NavArrowRight,
  SidebarCollapse
} from "iconoir-react";

import { Button } from "@/components/Button";
import { Sidebar } from "@/components/Sidebar";
import { BudgetTable } from "@/features/budget/BudgetTable";
import { TransactionsTable } from "@/features/budget/TransactionsTable";
import { Account } from "@/models/Account";
import { formatCurrency, formatMonth } from "@/utils/formatting";
import { ledger } from "@/utils/ledger.mock";
import { addMonths, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { useEffect, useState } from "react";

const l = ledger.alias.bind(ledger);


export default function Home() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(
    null
  );
  const [ledgerText, setLedgerText] = useState<string>();
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showSidebar, setShowSidebar] = useState<boolean>(true)

  useEffect(() => {
    async function doit() {
      if (!fileHandle) {
        return;
      }
      const file = await fileHandle.getFile();
      const contents = await file.text();
      setLedgerText(contents);
    }
    doit();
  }, [fileHandle]);

  return (
    <main className="text-stone-800 flex min-h-screen flex-col items-stretch justify-between">
      <div
        className="flex flex-grow basis-full h-screen items-stretch flex-[1_1_0%]"
        style={{
          transition: "all 0.3s ease 0s",
          marginLeft: showSidebar ? "0" : "-280px",
        }}
      >
        {/* <div className="w-full h-full p-8 bg-white">
          {fileHandle ? (
            <textarea
              className="w-full h-full bg-transparent"
              value={ledgerText}
            ></textarea>
          ) : (
            <button
              onClick={async () => {
                const result = await window.showOpenFilePicker();
                const [fh] = result;
                setFileHandle(fh);
              }}
            >
              open
            </button>
          )}
        </div> */}

        <div className="bg-stone-100 border-r-stone-300 border-r-[1px] flex-[1_0_280px]">
          <Sidebar
            ledger={ledger}
            l={l}
            currentAccount={currentAccount}
            setCurrentAccount={setCurrentAccount}
          />
        </div>

        <div className="bg-white flex-[1_1_100%]">
          <div className="p-2 px-8 flex">
            <Button onClick={() => setShowSidebar((t) => !t)}>
              <SidebarCollapse />
            </Button>
            <input
              type="text"
              className="bg-white ring-1 ring-stone-400 rounded-md ml-auto text-sm p-1"
              placeholder="Search..."
            />
          </div>
          <div className="">
            {currentAccount ? (
              <div className="">
                <div className="flex justify-between items-center mb-6 p-8">
                  <h2 className="text-2xl font-bold">
                    {l(currentAccount.name)}
                  </h2>
                  <div>
                    <div className="text-sm">Balance</div>
                    <div className="text-md font-bold">
                      {formatCurrency(currentAccount.currentBalance)}
                    </div>
                  </div>
                </div>

                {/* <div className="grid grid-cols-[max-content,max-content,max-content,auto,auto]">
                  <HeaderCell>Date</HeaderCell>
                  <HeaderCell>Payee</HeaderCell>
                  <HeaderCell>Budget</HeaderCell>
                  <HeaderCell>Note</HeaderCell>
                  <div className="uppercase text-sm font-bold text-stone-600 self-end text-right">
                    Amount
                  </div>
                  {sortBy(ledger.transactionsForAccount(currentAccount), "date")
                    .reverse()
                    .map((transaction, idx) => (
                      <Fragment key={idx}>
                        <Cell>{formatDate(transaction.date)}</Cell>
                        <Cell>{l(transaction.postings[0].payee)}</Cell>
                        <Cell>{l(transaction.postings[0].budget.name)}</Cell>
                        <Cell>{transaction.postings[0].note}</Cell>
                        <AmountCell amount={transaction.amount} />
                      </Fragment>
                    ))}
                  </div> */}
                <TransactionsTable
                  currentAccount={currentAccount}
                  ledger={ledger}
                  l={l}
                />
              </div>
            ) : (
              <div className="">
                <div className="flex justify-between items-center mb-6 p-8">
                  {/* <h2 className="text-2xl font-bold">
                    Budget 
                  </h2> */}
                  <div className="flex justify-around items-center gap-2">
                    <Button
                      onClick={() =>
                        setCurrentMonth(
                          startOfMonth(subMonths(currentMonth, 1))
                        )
                      }
                    >
                      <NavArrowLeft />
                    </Button>
                    <div>{formatMonth(currentMonth)}</div>
                    <Button
                      onClick={() =>
                        setCurrentMonth(
                          startOfMonth(addMonths(currentMonth, 1))
                        )
                      }
                    >
                      <NavArrowRight />
                    </Button>
                    {!isSameMonth(new Date(), currentMonth) && (
                      <Button
                        onClick={() =>
                          setCurrentMonth(startOfMonth(new Date()))
                        }
                      >
                        <Calendar />
                      </Button>
                    )}
                  </div>
                  <div className="text-[10px] hidden">
                    <div> from last month +</div>
                    <div>inflow this month -</div>
                    <div>assigned in future -</div>
                    <div>assigned this month =</div>
                  </div>
                  <div>
                    <div className="text-sm">Available to budget</div>
                    <div className="text-md font-bold">
                      {formatCurrency(
                        ledger.budgetAvailableForMonth(
                          ledger.getBudget("inflow")!,
                          currentMonth
                        )
                      )}
                    </div>
                  </div>
                </div>
                <BudgetTable
                  currentMonth={currentMonth}
                  ledger={ledger}
                  l={l}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
