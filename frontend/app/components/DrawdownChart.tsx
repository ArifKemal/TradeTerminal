// @ts-nocheck
"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface DrawdownChartProps {
  dates: string[];
  drawdown: (number | null)[];
  maxDrawdown?: number;
}

export default function DrawdownChart({ dates, drawdown, maxDrawdown }: DrawdownChartProps) {
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 35, r: 60, b: 45, l: 65 },
    xaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
    },
    yaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      title: "Drawdown",
      titlefont: { size: 10 },
      tickformat: ".1%",
      range: [Math.min(...drawdown.filter((v): v is number => v !== null)) * 1.15, 0.01],
    },
    hovermode: "x unified" as const,
    dragmode: "pan" as const,
    showlegend: false,
    title: {
      text: maxDrawdown
        ? `Drawdown — Max: ${(maxDrawdown * 100).toFixed(2)}%`
        : "Drawdown",
      font: { size: 12, color: "#ffffff" },
    },
    annotations: maxDrawdown
      ? [
          {
            x: dates[0],
            y: maxDrawdown,
            xref: "x" as const,
            yref: "y" as const,
            text: `Max DD ${(maxDrawdown * 100).toFixed(2)}%`,
            showarrow: true,
            arrowhead: 2,
            arrowcolor: "#ef4444",
            arrowsize: 1,
            ax: 0,
            ay: -30,
            font: { color: "#ef4444", size: 9 },
            bgcolor: "rgba(0,0,0,0.6)",
            bordercolor: "#ef4444",
            borderwidth: 1,
            borderpad: 3,
          },
        ]
      : undefined,
  };

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d"],
    modeBarButtons: [["zoom2d", "pan2d", "zoomIn2d", "zoomOut2d", "autoScale2d", "resetViews"]],
  };

  const data = [
    {
      x: dates,
      y: drawdown,
      type: "scatter",
      mode: "lines",
      name: "Drawdown",
      line: { color: "#ef4444", width: 2 },
      fill: "tozeroy",
      fillcolor: "rgba(239, 68, 68, 0.15)",
    },
    {
      x: dates,
      y: drawdown.map(() => 0),
      type: "scatter",
      mode: "lines",
      name: "Zero",
      line: { color: "#ef4444", width: 1, dash: "dot" },
    },
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "220px" }} />
    </div>
  );
}
