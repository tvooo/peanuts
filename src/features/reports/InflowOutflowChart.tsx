import * as d3 from "d3";
import { eachMonthOfInterval, endOfYear, format, isSameMonth, startOfYear } from "date-fns";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";
import { chartColors, drawTooltip, tidyAxis, topRoundedRect } from "./chartStyle";

interface InflowOutflowChartProps {
  ledger: Ledger;
  year: number;
}

export const InflowOutflowChart = observer(function InflowOutflowChart({
  ledger,
  year,
}: InflowOutflowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Memoize the data computation for performance
  // biome-ignore lint/correctness/useExhaustiveDependencies: version change handled
  const data = useMemo(() => {
    const today = new Date();
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Inflow / outflow = money entering / leaving your accounts from the outside.
    // Computed by sign over (non-tracking) transactions. Transfers are NOT included
    // here — they live in a separate `ledger.transfers` collection and represent
    // internal moves between your own accounts, so they never count as in/outflow.
    return months.map((month) => {
      const monthTransactions = ledger.transactions.filter(
        (t) =>
          t.date && t.date <= today && t.account?.type !== "tracking" && isSameMonth(t.date, month)
      );

      const inflow = monthTransactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      const outflow = Math.abs(
        monthTransactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)
      );

      return {
        month,
        monthName: format(month, "MMM"),
        inflow,
        outflow,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.transactions, ledger._version, year]);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG (responsive via viewBox)
    const totalWidth = width + margin.left + margin.right;
    const totalHeight = height + margin.top + margin.bottom;
    const svg = d3
      .select(svgRef.current)
      .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("width", "100%")
      .style("height", "auto")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.monthName))
      .range([0, width])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        Math.max(d3.max(data, (d) => d.inflow) || 0, d3.max(data, (d) => d.outflow) || 0),
      ])
      .nice()
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => formatCurrency(d.valueOf()));

    // Add grid lines first so bars sit on top
    svg
      .append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(yScale)
          .ticks(6)
          .tickSize(-width)
          .tickFormat(() => "")
      )
      .call((g) => {
        g.select(".domain").remove();
        g.selectAll(".tick line").attr("stroke", chartColors.grid);
        g.selectAll("text").remove();
      });

    svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis).call(tidyAxis);
    svg.append("g").call(yAxis).call(tidyAxis);

    const barWidth = xScale.bandwidth() / 2;
    const radius = 5;

    const addBars = (
      className: string,
      valueKey: "inflow" | "outflow",
      offset: number,
      color: string
    ) => {
      svg
        .selectAll(`.${className}`)
        .data(data)
        .enter()
        .append("path")
        .attr("class", className)
        .attr("d", (d) =>
          topRoundedRect(
            (xScale(d.monthName) || 0) + offset,
            yScale(d[valueKey]),
            barWidth,
            height - yScale(d[valueKey]),
            radius
          )
        )
        .attr("fill", color)
        .style("cursor", "pointer")
        .on("mouseenter", function (_event, d) {
          d3.select(this).attr("opacity", 0.85);
          drawTooltip(
            svg,
            (xScale(d.monthName) || 0) + offset + barWidth / 2,
            yScale(d[valueKey]),
            formatCurrency(d[valueKey])
          );
        })
        .on("mouseleave", function () {
          d3.select(this).attr("opacity", 1);
          svg.selectAll(".tooltip").remove();
        });
    };

    addBars("bar-inflow", "inflow", barWidth / 2, chartColors.green);
    addBars("bar-outflow", "outflow", barWidth * 1.5, chartColors.coral);

    // Legend
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, -8)`);
    const legendItem = (x: number, color: string, label: string) => {
      const g = legend.append("g").attr("transform", `translate(${x},0)`);
      g.append("rect").attr("width", 12).attr("height", 12).attr("rx", 3).attr("fill", color);
      g.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-size", "12px")
        .style("fill", chartColors.axis)
        .style("font-family", "inherit")
        .text(label);
    };
    legendItem(0, chartColors.green, "Inflow");
    legendItem(80, chartColors.coral, "Outflow");
  }, [data]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">Inflow / Outflow</h3>
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
});
