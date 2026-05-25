"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface VolumeChartProps {
  dates: string[];
  volume: number[];
  close: number[];
}

export default function VolumeChart({ dates, volume, close }: VolumeChartProps) {
  // Color bars green/red based on price movement
  const colors = close.map((c, i) => {
    if (i === 0) return "#10b981";
    return c >= (close[i - 1] || c) ? "#10b981" : "#ef4444";
  });

  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 25, r: 20, b: 40, l: 60 },
    xaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
    },
    yaxis: {
      gridcolor: "#2a2a2a",
      zerolinecolor: "#2a2a2a",
      showgrid: true,
      title: "Volume",
      titlefont: { size: 10 },
    },
    hovermode: "x unified" as const,
    dragmode: "pan" as const,
    showlegend: false,
    title: {
      text: "Volume",
      font: { size: 12, color: "#ffffff" },
    },
    bargap: 0,
  };

  const config = { responsive: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'], modeBarButtons: [['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews']] };

  const data = [
    {
      x: dates,
      y: volume,
      type: "bar",
      marker: { color: colors, opacity: 0.6 },
    },
  ];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "150px" }} />
    </div>
  );
}
