"use client";

interface StatsPanelProps {
  stats: Record<string, unknown> | null;
  ticker: string;
}

export default function StatsPanel({ stats, ticker }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[var(--accent-orange)]">#</span>
          <h2 className="text-sm font-bold uppercase tracking-wider">Portfolio Statistics</h2>
        </div>
        <div className="text-center py-8 text-[var(--text-muted)] text-sm">
          Run a backtest to see statistics
        </div>
      </div>
    );
  }

  const totalReturn = typeof stats["Total Return [%]"] === "number"
    ? (stats["Total Return [%]"] as number)
    : typeof stats["Total Return"] === "number"
      ? (stats["Total Return"] as number) * 100
      : null;

  const sharpe = typeof stats["Sharpe Ratio"] === "number"
    ? stats["Sharpe Ratio"] as number
    : null;

  const maxDD = typeof stats["Max Drawdown [%]"] === "number"
    ? stats["Max Drawdown [%]"] as number
    : typeof stats["Max Drawdown"] === "number"
      ? (stats["Max Drawdown"] as number) * 100
      : null;

  const endValue = typeof stats["End Value"] === "number"
    ? stats["End Value"] as number
    : typeof stats["Final Value"] === "number"
      ? stats["Final Value"] as number
      : null;

  const winRate = typeof stats["Win Rate [%]"] === "number"
    ? stats["Win Rate [%]"] as number
    : null;

  const closedTrades = typeof stats["Total Closed Trades"] === "number"
    ? stats["Total Closed Trades"] as number
    : typeof stats["Total Trades"] === "number"
      ? stats["Total Trades"] as number
      : null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent-orange)]">#</span>
          <h2 className="text-sm font-bold uppercase tracking-wider">Portfolio Statistics</h2>
        </div>
        <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded">
          {ticker}
        </span>
      </div>

      {/* Key Metrics — only 4 cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {totalReturn !== null && (
          <div className="bg-[var(--bg-tertiary)] rounded p-3 text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Return</div>
            <div className={`text-lg font-bold ${totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {totalReturn.toFixed(2)}%
            </div>
          </div>
        )}
        {endValue !== null && (
          <div className="bg-[var(--bg-tertiary)] rounded p-3 text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Final Value</div>
            <div className="text-lg font-bold text-[var(--text-primary)]">
              ${endValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        )}
        {sharpe !== null && (
          <div className="bg-[var(--bg-tertiary)] rounded p-3 text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Sharpe Ratio</div>
            <div className="text-lg font-bold text-[var(--accent-orange)]">
              {sharpe.toFixed(3)}
            </div>
          </div>
        )}
        {maxDD !== null && (
          <div className="bg-[var(--bg-tertiary)] rounded p-3 text-center">
            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Max Drawdown</div>
            <div className="text-lg font-bold text-red-400">
              {maxDD.toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Only Win Rate + Closed Trades */}
      <div className="space-y-0">
        {winRate !== null && (
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Win Rate</span>
            <span className={`text-sm font-bold ${winRate >= 50 ? "text-emerald-400" : "text-red-400"}`}>
              {winRate.toFixed(1)}%
            </span>
          </div>
        )}
        {closedTrades !== null && closedTrades > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-[var(--border-color)] last:border-0">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">Closed Trades</span>
            <span className="text-sm font-bold text-[var(--text-primary)]">{String(closedTrades)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
