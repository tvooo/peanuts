import * as d3 from "d3";
import { eachMonthOfInterval, endOfMonth, endOfYear, startOfYear } from "date-fns";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";

interface NetWorthChartProps {
  ledger: Ledger;
  year: number;
}

export const NetWorthChart = observer(function NetWorthChart({ ledger, year }: NetWorthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Memoize the data computation for performance
  const data = useMemo(() => {
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Pre-sort transactions and transfers by date for more efficient filtering
    const sortedTransactions = [...ledger.transactions].sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
    );
    const _sortedTransfers = [...ledger.transfers].sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
    );

    return months.map((month) => {
      const monthEnd = endOfMonth(month);
      const monthEndTime = monthEnd.getTime();

      // Calculate total net worth by summing all accounts
      let netWorth = 0;

      // Sum transactions up to this month
      for (const t of sortedTransactions) {
        if (!t.date || t.date.getTime() >= monthEndTime) break;
        netWorth += t.amount;
      }

      // Add transfers (they net to zero across accounts, but we need to count correctly)
      // Actually, transfers between accounts cancel out, so we don't need to add them
      // They only move money between accounts, not create or destroy it

      return {
        date: month,
        value: netWorth,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.transactions, ledger.transfers, year]);

  useEffect(() => {
    if (!svgRef.current) return;

    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleTime().domain([startDate, endDate]).range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([Math.min(0, d3.min(data, (d) => d.value) || 0), d3.max(data, (d) => d.value) || 0])
      .nice()
      .range([height, 0]);

    // Create axes
    const xAxis = d3.axisBottom(xScale).ticks(12);
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickFormat((d) => formatCurrency(d.valueOf()));

    svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .selectAll("text")
      .style("font-size", "12px");

    svg.append("g").call(yAxis).selectAll("text").style("font-size", "12px");

    // Add grid lines
    svg
      .append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(6)
          .tickSize(-width)
          .tickFormat(() => "")
      );

    // Create line generator
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add the line
    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add dots
    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "#3b82f6")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .on("mouseenter", function (_event, d) {
        d3.select(this).attr("r", 6);

        // Show tooltip
        const tooltip = svg
          .append("g")
          .attr("class", "tooltip")
          .attr("transform", `translate(${xScale(d.date)},${yScale(d.value) - 10})`);

        tooltip
          .append("rect")
          .attr("x", -60)
          .attr("y", -30)
          .attr("width", 120)
          .attr("height", 25)
          .attr("fill", "black")
          .attr("opacity", 0.8)
          .attr("rx", 4);

        tooltip
          .append("text")
          .attr("text-anchor", "middle")
          .attr("y", -12)
          .attr("fill", "white")
          .style("font-size", "12px")
          .text(formatCurrency(d.value));
      })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 4);
        svg.selectAll(".tooltip").remove();
      });

    // Add zero line if needed
    if (yScale.domain()[0] < 0) {
      svg
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#666")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    }
  }, [data, year]);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-4">Net Worth</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
});
