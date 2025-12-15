import * as d3 from "d3";
import { eachMonthOfInterval, endOfYear, format, isSameMonth, startOfYear } from "date-fns";
import { observer } from "mobx-react-lite";
import { useEffect, useRef } from "react";
import type { Ledger } from "@/models/Ledger";
import { formatCurrency } from "@/utils/formatting";

interface InflowOutflowChartProps {
  ledger: Ledger;
  year: number;
}

export const InflowOutflowChart = observer(function InflowOutflowChart({
  ledger,
  year,
}: InflowOutflowChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Calculate inflow/outflow for each month
    const startDate = startOfYear(new Date(year, 0, 1));
    const endDate = endOfYear(new Date(year, 0, 1));
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const data = months.map((month) => {
      const monthTransactions = ledger.transactions.filter((t) => isSameMonth(t.date!, month));

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

    console.log("Inflow/Outflow Data:", data);

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

    // Calculate bar width
    const barWidth = xScale.bandwidth() / 2;

    // Add inflow bars
    svg
      .selectAll(".bar-inflow")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-inflow")
      .attr("x", (d) => (xScale(d.monthName) || 0) + barWidth / 2)
      .attr("y", (d) => yScale(d.inflow))
      .attr("width", barWidth)
      .attr("height", (d) => height - yScale(d.inflow))
      .attr("fill", "#10b981")
      .on("mouseenter", function (_event, d) {
        d3.select(this).attr("opacity", 0.8);

        // Show tooltip
        const tooltip = svg
          .append("g")
          .attr("class", "tooltip")
          .attr(
            "transform",
            `translate(${(xScale(d.monthName) || 0) + barWidth},${yScale(d.inflow) - 10})`
          );

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
          .text(formatCurrency(d.inflow));
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        svg.selectAll(".tooltip").remove();
      });

    // Add outflow bars
    svg
      .selectAll(".bar-outflow")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar-outflow")
      .attr("x", (d) => (xScale(d.monthName) || 0) + barWidth * 1.5)
      .attr("y", (d) => yScale(d.outflow))
      .attr("width", barWidth)
      .attr("height", (d) => height - yScale(d.outflow))
      .attr("fill", "#ef4444")
      .on("mouseenter", function (_event, d) {
        d3.select(this).attr("opacity", 0.8);

        // Show tooltip
        const tooltip = svg
          .append("g")
          .attr("class", "tooltip")
          .attr(
            "transform",
            `translate(${(xScale(d.monthName) || 0) + barWidth * 2},${yScale(d.outflow) - 10})`
          );

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
          .text(formatCurrency(d.outflow));
      })
      .on("mouseleave", function () {
        d3.select(this).attr("opacity", 1);
        svg.selectAll(".tooltip").remove();
      });

    // Add legend
    const legend = svg.append("g").attr("transform", `translate(${width - 150}, 0)`);

    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#10b981");

    legend.append("text").attr("x", 20).attr("y", 12).style("font-size", "12px").text("Inflow");

    legend
      .append("rect")
      .attr("x", 80)
      .attr("y", 0)
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", "#ef4444");

    legend.append("text").attr("x", 100).attr("y", 12).style("font-size", "12px").text("Outflow");
  }, [ledger, year]);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <h3 className="text-lg font-semibold mb-4">Inflow / Outflow</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
});
