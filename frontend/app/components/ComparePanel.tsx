// @ts-nocheck
"use client";

import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

interface ComparePanelProps {
  comparison: Record<string, {
    label: string;
    name: string;
    stats: Record<string, unknown>;
    equity_curve: Record<string, number>;
    error?: string;
  }>;
  dates: string[];
}

export default function ComparePanel({ comparison, dates }: ComparePanelProps) {
  const entries = Object.entries(comparison).filter(([, v]) => !v.error);
  const errors = Object.entries(comparison).filter(([, v]) => v.error);

  if (entries.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">
          No strategies to compare
        </div>
      </div>
    );
  }

  // Equity curve comparison chart
  const equityData = entries.map(([key, val]) => {
    const curve = val.equity_curve || {};
    const values = dates.map((d) => {
      const v = (curve as Record<string, number>)[d];
      return v !== undefined ? v : null;
    });
    return {
      x: dates,
      y: values,
      type: "scatter",
      mode: "lines",
      name: val.label || key,
      line: { width: 1.5 },
    };
  });

  const equityLayout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#a0a0a0", family: "JetBrains Mono, monospace", size: 10 },
    margin: { t: 30, r: 20, b: 40, l: 60 },
    xaxis: { gridcolor: "#2a2a2a", zerolinecolor: "#2a2a2a", showgrid: true },
    yaxis: { gridcolor: "#2a2a2a", zerolinecolor: "#2a2a2a", showgrid: true, titlefont: { size: 10 } },
    hovermode: "x unified" as const,
    dragmode: "pan" as const,
    title: { text: "Strategy Comparison — Equity Curve", font: { size: 12, color: "#ffffff" } },
    legend: { font: { size: 10 }, bgcolor: "rgba(0,0,0,0)", bordercolor: "#2a2a2a", borderwidth: 1 },
  };

  const colors = ["#f59e0b", "#10b981", "#3b82f6", "#a78bfa", "#ef4444"];
  equityData.forEach((d: unknown, i: number) => {
    (d as Record<string, unknown>).line = { ...(d as Record<string, unknown>).line as object, color: colors[i % colors.length] };
  });

  const config = { responsive: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'], modeBarButtons: [['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetViews']] };

  // Key metrics comparison table
  const metricKeys = ["Total Return [%]", "End Value", "Sharpe Ratio", "Max Drawdown [%]", "Total Trades", "Win Rate [%]"];

  return (
    <div className="space-y-6">
      {/* Equity curve comparison */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-4">
        <Plot data={equityData} layout={equityLayout} config={config} style={{ width: "100%", height: "300px" }} />
      </div>

      {/* Comparison table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[var(--accent-orange)]">#</span>
          <h2 className="text-sm font-bold uppercase tracking-wider">Strategy Comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-[var(--text-muted)] uppercase tracking-wider">
              <tr>
                <th className="text-left py-2 px-3">Metric</th>
                {entries.map(([key, val]) => (
                  <th key={key} className="text-right py-2 px-3">{val.label || key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricKeys.map((metric) => (
                <tr key={metric} className="border-t border-[var(--border-color)]">
                  <td className="py-2 px-3 text-[var(--text-secondary)]">{metric}</td>
                  {entries.map(([key, val]) => {
                    const raw = val.stats?.[metric];
                    const display = raw != null ? String(raw) : "N/A";
                    return (
                      <td key={key} className="py-2 px-3 text-right font-bold">{display}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-950/30 border border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 text-sm">[ERROR] Some strategies failed</div>
          {errors.map(([key, val]) => (
            <div key={key} className="text-xs text-red-300 mt-1">
              {key}: {val.error}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
