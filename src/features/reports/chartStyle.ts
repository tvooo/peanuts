import type * as d3 from "d3";

/**
 * Cushion-inspired chart styling: a muted, clean palette plus small helpers for
 * rounded bars, tidied axes and friendly rounded tooltips. Shared by the report
 * charts so they stay visually consistent.
 */
export const chartColors = {
  green: "#5fa83f", // brand green – positive / inflow / net worth
  blue: "#4f86d6",
  coral: "#e2563f", // negative / outflow
  axis: "#94a3b8", // muted grey labels
  grid: "#e6e9ee", // hairline gridlines
  zero: "#cbd2da",
  tooltipBg: "#1f2733",
  tooltipText: "#ffffff",
} as const;

type SvgGroup = d3.Selection<SVGGElement, unknown, null, undefined>;

/** Path for a rectangle with only its top two corners rounded. */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return "";
  const radius = Math.max(0, Math.min(r, w / 2, h));
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

/** Drop the heavy domain line + tick marks and use soft grey labels. */
export function tidyAxis(group: SvgGroup) {
  group.select(".domain").remove();
  group.selectAll(".tick line").remove();
  group
    .selectAll("text")
    .style("font-size", "12px")
    .style("fill", chartColors.axis)
    .style("font-family", "inherit");
}

/** A rounded dark tooltip with a little pointer, sized to its label. */
export function drawTooltip(svg: SvgGroup, x: number, y: number, label: string) {
  const tooltip = svg
    .append("g")
    .attr("class", "tooltip")
    .attr("transform", `translate(${x},${y})`)
    .style("pointer-events", "none");

  const text = tooltip
    .append("text")
    .attr("text-anchor", "middle")
    .attr("y", -16)
    .attr("fill", chartColors.tooltipText)
    .style("font-size", "12px")
    .style("font-weight", "600")
    .style("font-family", "inherit")
    .text(label);

  const textWidth = (text.node() as SVGTextElement).getBBox().width;
  const w = textWidth + 20;
  const h = 24;

  tooltip
    .insert("path", "text")
    .attr("d", `M${-5},${-8} L0,${-2} L5,${-8} Z`)
    .attr("fill", chartColors.tooltipBg);

  tooltip
    .insert("rect", "text")
    .attr("x", -w / 2)
    .attr("y", -8 - h)
    .attr("width", w)
    .attr("height", h)
    .attr("rx", 7)
    .attr("fill", chartColors.tooltipBg);
}
