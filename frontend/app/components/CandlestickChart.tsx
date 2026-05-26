// @ts-nocheck
"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface CandlestickChartProps {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  ticker: string;
  /** Strategy-specific overlay lines e.g. SMA/EMA/BB */
  overlays?: { name: string; values: (number | null)[]; color: string; dash?: string }[];
}

export default function CandlestickChart({
  dates,
  open,
  high,
  low,
  close,
  ticker,
  overlays,
}: CandlestickChartProps) {
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 30, r: 20, b: 40, l: 60 },
    xaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      rangeslider: { visible: false },
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

  // Build the data array
  const data: unknown[] = [
    {
      x: dates,
      open: open,
      high: high,
      low: low,
      close: close,
      type: "candlestick",
      name: "OHLC",
      increasing: { line: { color: "#10b981" }, fillcolor: "#10b981" },
      decreasing: { line: { color: "#ef4444" }, fillcolor: "#ef4444" },
    },
  ];

  // Add overlay lines
  if (overlays) {
    overlays.forEach((line) => {
      data.push({
        x: dates,
        y: line.values,
        type: "scatter",
        mode: "lines",
        name: line.name,
        line: { color: line.color, width: 1.5, dash: line.dash || "solid" as const },
      });
    });
  }

  // Add entry/exit markers if we could compute them
  // (They are passed separately in PriceChart for signal visibility)

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "450px" }} />
    </div>
  );
}
