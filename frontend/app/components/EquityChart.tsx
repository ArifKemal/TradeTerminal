// @ts-nocheck
"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface EquityChartProps {
  dates: string[];
  equity: (number | null)[];
  initCash: number;
}

export default function EquityChart({ dates, equity, initCash }: EquityChartProps) {
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 30, r: 20, b: 40, l: 60 },
    xaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
    },
    yaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      title: "Value ($)",
      titlefont: { size: 10 },
    },
    hovermode: "x unified" as const,
    dragmode: "pan" as const,
    title: {
      text: "Equity Curve",
      font: { size: 12, color: "#ffffff" },
    },
    shapes: [
      {
        type: "line" as const,
        x0: dates[0],
        x1: dates[dates.length - 1],
        y0: initCash,
        y1: initCash,
        line: { color: "#666666", width: 1, dash: "dot" as const },
      },
    ],
    annotations: [
      {
        x: dates[0],
        y: initCash,
        xref: "x" as const,
        yref: "y" as const,
        text: `$${initCash.toLocaleString()}`,
        showarrow: false,
        font: { color: "#666666", size: 9 },
      },
    ],
  };

  const config = { responsive: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'], modeBarButtons: [['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews']] };

  const data = [
    {
      x: dates,
      y: equity,
      type: "scatter" as const,
      mode: "lines" as const,
      name: "Portfolio Value",
      line: { color: "#f59e0b", width: 1.5 },
      fill: "tozeroy" as const,
      fillcolor: "rgba(245, 158, 11, 0.05)",
    },
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "300px" }} />
    </div>
  );
}
