import { AmountCell, HeaderCell } from "@/components/Table";
import { Ledger } from "@/models/Ledger";
import { Archery } from "iconoir-react";
import { Fragment } from "react";

interface BudgetTableProps {
  ledger: Ledger;
  currentMonth: Date;
  l: (s: string) => string;
}

export function BudgetTable({ currentMonth, ledger, l }: BudgetTableProps) {
  return (
    <table className="table w-full">
      <thead>
        <tr className="border-b border-stone-300">
          <th></th>
          <th>
            <HeaderCell>Budget</HeaderCell>
          </th>
          <th>
            <HeaderCell alignRight>Budgeted</HeaderCell>
          </th>
          <th>
            <HeaderCell alignRight>Activity</HeaderCell>
          </th>
          <th className="pr-8">
            <HeaderCell alignRight>Available</HeaderCell>
          </th>
        </tr>
      </thead>
      <tbody>
        {Object.keys(ledger.budgetGroups)
          .reverse()
          .map((group) => (
            <Fragment key={group}>
              <tr className="border-b border-stone-200 bg-stone-50">
                <td />
                <td colSpan={4} className="text-md pt-2 pb-2 font-bold">
                  {group || "(no group)"}
                </td>
              </tr>
              {ledger.budgetGroups[group].map((budget, idx) => (
                <tr
                  className="hover:bg-stone-100 rounded-md border-b border-stone-200"
                  key={idx}
                >
                  <td className="p-1 pl-8 w-[64px] align-middle">
                    <input type="checkbox" />
                  </td>
                  <td>
                    <div className="p-0.5 flex items-center  align-middle">
                      {budget.isTarget && <Archery className="mr-2 w-3" />}
                      {l(budget.name)}
                    </div>
                  </td>
                  <td className=" align-middle">
                    <AmountCell
                      amount={ledger.budgetAssignedForMonth(
                        budget,
                        currentMonth
                      )}
                    />
                  </td>

                  <td>
                    <AmountCell
                      amount={ledger.budgetActivityForMonth(
                        budget,
                        currentMonth
                      )}
                    />
                  </td>
                  <td className="py-2 pr-8">
                    <AmountCell
                      amount={ledger.budgetAvailableForMonth(
                        budget,
                        currentMonth
                      )}
                      highlightNegativeAmount
                      chip
                    />
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
      </tbody>
    </table>
  );
}
