"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface PriceChartProps {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  entries: boolean[];
  exits: boolean[];
  ticker: string;
  /** Strategy overlays */
  overlays?: { name: string; values: (number | null)[]; color: string; dash?: string }[];
  /** Use candlestick style instead of line */
  candlestick?: boolean;
}

export default function PriceChart({
  dates,
  open,
  high,
  low,
  close,
  entries,
  exits,
  ticker,
  overlays,
  candlestick,
}: PriceChartProps) {
  const entryPoints = useMemo(() => {
    const x: string[] = [];
    const y: number[] = [];
    entries.forEach((v, i) => {
      if (v && close[i] != null) {
        x.push(dates[i]);
        y.push(close[i]);
      }
    });
    return { x, y };
  }, [entries, dates, close]);

  const exitPoints = useMemo(() => {
    const x: string[] = [];
    const y: number[] = [];
    exits.forEach((v, i) => {
      if (v && close[i] != null) {
        x.push(dates[i]);
        y.push(close[i]);
      }
    });
    return { x, y };
  }, [exits, dates, close]);

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 30, r: 20, b: 40, l: 60 },
    xaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      title: "",
      rangeslider: { visible: candlestick ? false : undefined },
    },
    yaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      title: "Price ($)",
      titlefont: { size: 10 },
    },
    legend: {
      font: { size: 10 },
      bgcolor: "rgba(0,0,0,0)",
      bordercolor: "#2a2a2a",
      borderwidth: 1,
    },
    hovermode: "x unified" as const,
    dragmode: "pan" as const,
    title: {
      text: `${ticker} — Price Chart`,
      font: { size: 13, color: "#ffffff" },
    },
  };

  const config = { responsive: true, displayModeBar: true, displaylogo: false, scrollZoom: true, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d', 'resetScale2d'], modeBarButtons: [['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews']] };

  const data: unknown[] = [];

  if (candlestick && open.length > 0 && high.length > 0) {
    // Candlestick chart
    data.push({
      x: dates,
      open: open,
      high: high,
      low: low,
      close: close,
      type: "candlestick",
      name: "OHLC",
      increasing: { line: { color: "#10b981" }, fillcolor: "#10b981" },
      decreasing: { line: { color: "#ef4444" }, fillcolor: "#ef4444" },
    });
  } else {
    // Line chart
    data.push({
      x: dates,
      y: close,
      type: "scatter",
      mode: "lines",
      name: "Close",
      line: { color: "#ffffff", width: 1.5 },
    });
  }

  // Overlay lines (SMA/EMA/BB)
  if (overlays) {
    overlays.forEach((line) => {
      data.push({
        x: dates,
        y: line.values,
        type: "scatter",
        mode: "lines",
        name: line.name,
        line: { color: line.color, width: 1, dash: line.dash || "solid" },
      });
    });
  }

  // Entry markers
  if (entryPoints.x.length > 0) {
    data.push({
      x: entryPoints.x,
      y: entryPoints.y,
      type: "scatter",
      mode: "markers",
      name: "Buy",
      marker: { color: "#10b981", size: 10, symbol: "triangle-up" },
    });
  }

  // Exit markers
  if (exitPoints.x.length > 0) {
    data.push({
      x: exitPoints.x,
      y: exitPoints.y,
      type: "scatter",
      mode: "markers",
      name: "Sell",
      marker: { color: "#ef4444", size: 10, symbol: "triangle-down" },
    });
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "400px" }} />
    </div>
  );
}
