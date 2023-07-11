"use client";


import { useLedger } from "@/utils/useLedger";
import { curveLinear } from 'd3-shape';
import { endOfDay, subDays } from "date-fns";
import { useMemo } from "react";
import { AxisOptions, Chart } from "react-charts";
type DailyStars = {
  date: Date;
  balance: number;
};

type Series = {
  label: string;
  data: DailyStars[];
};

const data: Series[] = [
  {
    label: "React Charts",
    data: [
      {
        date: new Date(),
        balance: 202123,
      },
      
      // ...
    ],
  },
//   {
//     label: "React Query",
//     data: [
//       {
//         date: new Date(),
//         stars: 10234230,
//       },
//       // ...
//     ],
//   },
];

export default function LedgerPage() {
  const ledger = useLedger();

  const data: Series[] = useMemo(() => {
    const s: Series = {
        label: 'Net worth',
        data: []
    }
    s.data.push(
      {
        date: endOfDay(new Date()),
        balance: ledger?.getAccount("dkb")?.currentBalance || 0,
        // balance: 40000
      },
      {
        date: endOfDay(subDays(new Date(), 1)),
        balance: 1234,
        // balance: 40000
      },
      {
        date: endOfDay(subDays(new Date(), 2)),
        balance: 1234,
        // balance: 40000
      },
      {
        date: endOfDay(subDays(new Date(), 3)),
        balance: 1234,
        // balance: 40000
      },
      {
        date: endOfDay(subDays(new Date(), 4)),
        balance: 1234,
        // balance: 40000
      },
      {
        date: endOfDay(subDays(new Date(), 5)),
        balance: 1234,
        // balance: 40000
      }
    );

    return [s];
  }, [ledger])
  const primaryAxis = useMemo(
    (): AxisOptions<DailyStars> => ({
      getValue: (datum) => datum.date,
    //   elementType: "area",
    curve: curveLinear
    }),
    []
  );

  const secondaryAxes = useMemo(
    (): AxisOptions<DailyStars>[] => [
      {
        getValue: (datum) => datum.balance,
      },
    ],
    []
  );

  return (
    <div className="h-[400px]">

    <Chart
      options={{
          data,
          primaryAxis,
          secondaryAxes,
        }}
        />
        </div>
  );
}
