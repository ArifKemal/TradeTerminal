"use client";

interface FundamentalsPanelProps {
  data: {
    ticker: string;
    company: { name?: string; sector?: string; industry?: string; summary?: string };
    valuation: {
      marketCap?: number; enterpriseValue?: number;
      trailingPE?: number; forwardPE?: number;
      priceToBook?: number; enterpriseToEbitda?: number; priceToSales?: number;
    };
    financials: {
      revenuePerShare?: number; earningsPerShare?: number;
      profitMargins?: number; operatingMargins?: number;
      returnOnEquity?: number; debtToEquity?: number;
      currentRatio?: number; freeCashflow?: number; revenueGrowth?: number;
    };
    trading: {
      beta?: number; dividendYield?: number;
      fiftyTwoWeekHigh?: number; fiftyTwoWeekLow?: number; averageVolume?: number;
    };
  };
}

function fmt(v: number | undefined | null, type: "money" | "percent" | "ratio" | "volume" = "ratio"): string {
  if (v == null) return "—";
  if (type === "money") {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${v.toLocaleString()}`;
  }
  if (type === "percent") return `${(v * 100).toFixed(2)}%`;
  if (type === "volume") return v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString();
  return v.toFixed(2);
}

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[var(--border-color)] last:border-0">
      <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
      <span className={`text-xs font-bold ${color || "text-[var(--text-primary)]"}`}>{value}</span>
    </div>
  );
}

export default function FundamentalsPanel({ data }: FundamentalsPanelProps) {
  const { valuation, financials, trading } = data;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--accent-orange)]">$</span>
        <h2 className="text-sm font-bold uppercase tracking-wider">Fundamentals</h2>
      </div>
      <div className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed line-clamp-3">
        {data.company.sector} — {data.company.industry}
      </div>

      {/* Valuation Multiples */}
      <div className="mb-3">
        <div className="text-[10px] text-[var(--accent-orange)] uppercase tracking-wider mb-1 font-bold">Valuation</div>
        <StatRow label="Market Cap" value={fmt(valuation.marketCap, "money")} />
        <StatRow label="Enterprise Value" value={fmt(valuation.enterpriseValue, "money")} />
        <StatRow label="P/E (Trailing)" value={fmt(valuation.trailingPE)} />
        <StatRow label="P/E (Forward)" value={fmt(valuation.forwardPE)} />
        <StatRow label="P/B" value={fmt(valuation.priceToBook)} />
        <StatRow label="EV/EBITDA" value={fmt(valuation.enterpriseToEbitda)} />
        {valuation.priceToSales != null && (
          <StatRow label="P/S" value={fmt(valuation.priceToSales)} />
        )}
      </div>

      {/* Financial Health */}
      <div className="mb-3">
        <div className="text-[10px] text-[var(--accent-orange)] uppercase tracking-wider mb-1 font-bold">Financials</div>
        <StatRow label="Revenue / Share" value={fmt(financials.revenuePerShare)} />
        <StatRow label="EPS (TTM)" value={fmt(financials.earningsPerShare)} />
        <StatRow label="Profit Margin" value={fmt(financials.profitMargins, "percent")} />
        <StatRow label="Operating Margin" value={fmt(financials.operatingMargins, "percent")} />
        <StatRow label="ROE" value={fmt(financials.returnOnEquity, "percent")} />
        <StatRow label="Revenue Growth" value={fmt(financials.revenueGrowth, "percent")}
          color={financials.revenueGrowth != null && financials.revenueGrowth >= 0 ? "text-emerald-400" : "text-red-400"} />
        <StatRow label="D/E" value={fmt(financials.debtToEquity)} />
        <StatRow label="Current Ratio" value={fmt(financials.currentRatio)} />
        <StatRow label="Free Cash Flow" value={fmt(financials.freeCashflow, "money")} />
      </div>

      {/* Trading */}
      <div>
        <div className="text-[10px] text-[var(--accent-orange)] uppercase tracking-wider mb-1 font-bold">Trading</div>
        <StatRow label="Beta" value={fmt(trading.beta)} />
        <StatRow label="Div. Yield" value={fmt(trading.dividendYield, "percent")} />
        <StatRow label="52W High" value={trading.fiftyTwoWeekHigh != null ? `$${trading.fiftyTwoWeekHigh.toFixed(2)}` : "—"} />
        <StatRow label="52W Low" value={trading.fiftyTwoWeekLow != null ? `$${trading.fiftyTwoWeekLow.toFixed(2)}` : "—"} />
        <StatRow label="Avg Volume" value={fmt(trading.averageVolume, "volume")} />
      </div>
    </div>
  );
}
