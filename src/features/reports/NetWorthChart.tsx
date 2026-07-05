import * as d3 from "d3";
import { eachMonthOfInterval, endOfMonth, endOfYear, startOfYear } from "date-fns";
import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useRef } from "react";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";
import { chartColors, drawTooltip, tidyAxis } from "./chartStyle";

interface NetWorthChartProps {
  ledger: Ledger;
  year: number;
}

export const NetWorthChart = observer(function NetWorthChart({ ledger, year }: NetWorthChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Memoize the data computation for performance
  const data = useMemo(() => {
    const today = new Date();
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));
    const allMonths = eachMonthOfInterval({ start: startDate, end: endDate });

    // Only compute data for months that have started (future months show no data points)
    const months = allMonths.filter((m) => m <= today);

    // Pre-sort transactions by date for more efficient filtering
    const sortedTransactions = [...ledger.transactions].sort(
      (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
    );

    const todayTime = today.getTime();

    return months.map((month) => {
      const monthEnd = endOfMonth(month);
      // For the current month, only count transactions up to today
      const cutoffTime = Math.min(monthEnd.getTime(), todayTime);

      let netWorth = 0;

      for (const t of sortedTransactions) {
        if (!t.date || t.date.getTime() >= cutoffTime) break;
        netWorth += t.amount;
      }

      return {
        date: month,
        value: netWorth,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger.transactions, year]);

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

    // Grid lines first
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

    // Soft area fill under the line
    const area = d3
      .area<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y0(yScale(Math.max(0, yScale.domain()[0])))
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", chartColors.green)
      .attr("opacity", 0.12)
      .attr("d", area);

    // Line generator
    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", chartColors.green)
      .attr("stroke-width", 2.5)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .attr("d", line);

    // Dots
    svg
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => xScale(d.date))
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", chartColors.green)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseenter", function (_event, d) {
        d3.select(this).attr("r", 6);
        drawTooltip(svg, xScale(d.date), yScale(d.value), formatCurrency(d.value));
      })
      .on("mouseleave", function () {
        d3.select(this).attr("r", 4);
        svg.selectAll(".tooltip").remove();
      });

    // Zero line if needed
    if (yScale.domain()[0] < 0) {
      svg
        .append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", chartColors.zero)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4,4");
    }
  }, [data, year]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold">Net Worth</h3>
      <svg ref={svgRef} className="w-full"></svg>
    </div>
  );
});
