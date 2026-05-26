// @ts-nocheck
"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface IndicatorChartProps {
  dates: string[];
  values: (number | null)[];
  title: string;
  color: string;
  overbought?: number;
  oversold?: number;
  secondaryValues?: (number | null)[];
  secondaryColor?: string;
  secondaryName?: string;
  histogramValues?: (number | null)[];
}

export default function IndicatorChart({
  dates,
  values,
  title,
  color,
  overbought,
  oversold,
  secondaryValues,
  secondaryColor,
  secondaryName,
  histogramValues,
}: IndicatorChartProps) {
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
      text: title,
      font: { size: 12, color: "#ffffff" },
    },
    shapes: [
      ...(overbought != null
        ? [{
            type: "line" as const,
            x0: dates[0],
            x1: dates[dates.length - 1],
            y0: overbought,
            y1: overbought,
            line: { color: "#ef4444", width: 1, dash: "dot" as const },
          }]
        : []),
      ...(oversold != null
        ? [{
            type: "line" as const,
            x0: dates[0],
            x1: dates[dates.length - 1],
            y0: oversold,
            y1: oversold,
            line: { color: "#10b981", width: 1, dash: "dot" as const },
          }]
        : []),
    ],
    annotations: [
      ...(overbought != null
        ? [{
            x: dates[dates.length - 1],
            y: overbought,
            xref: "x" as const,
            yref: "y" as const,
            text: "OB",
            showarrow: false,
            font: { color: "#ef4444", size: 9 },
            xanchor: "left" as const,
          }]
        : []),
      ...(oversold != null
        ? [{
            x: dates[dates.length - 1],
            y: oversold,
            xref: "x" as const,
            yref: "y" as const,
            text: "OS",
            showarrow: false,
            font: { color: "#10b981", size: 9 },
            xanchor: "left" as const,
          }]
        : []),
    ],
  };

  const config = { responsive: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'], modeBarButtons: [['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews']] };

  const data: unknown[] = [];

  if (histogramValues) {
    data.push({
      x: dates,
      y: histogramValues,
      type: "bar",
      name: "Histogram",
      marker: { color: histogramValues.map((v) => (v != null && v >= 0 ? "#10b981" : "#ef4444")), opacity: 0.5 },
    });
  }

  data.push({
    x: dates,
    y: values,
    type: "scatter",
    mode: "lines",
    name: title.split(" ")[0],
    line: { color, width: 1.5 },
  });

  if (secondaryValues && secondaryColor && secondaryName) {
    data.push({
      x: dates,
      y: secondaryValues,
      type: "scatter",
      mode: "lines",
      name: secondaryName,
      line: { color: secondaryColor, width: 1, dash: "dash" },
    });
  }

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
      <Plot data={data} layout={layout} config={config} style={{ width: "100%", height: "250px" }} />
    </div>
  );
}
