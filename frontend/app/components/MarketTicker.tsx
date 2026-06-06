"use client";

import { useEffect, useState } from "react";
import { fetchMarketIndices, type MarketIndex } from "../api";

function formatPrice(price: number, symbol: string): string {
  if (symbol === "^VIX") return price.toFixed(1);
  if (symbol === "^TNX") return price.toFixed(1) + "%";
  return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function IndexPill({ index }: { index: MarketIndex }) {
  const isUp = index.change >= 0;
  const color = isUp ? "#10b981" : "#ef4444";
  const sign = isUp ? "+" : "";
  const arrow = isUp ? "▲" : "▼";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 3,
        background: "rgba(255,255,255,0.03)",
        borderLeft: `2px solid ${color}`,
        marginRight: 16,
        whiteSpace: "nowrap",
        fontFamily: "monospace",
        fontSize: 11,
      }}
    >
      <span style={{ color: "#888", fontWeight: 600 }}>{index.name}</span>
      <span style={{ color: "#fff" }}>{formatPrice(index.price, index.symbol)}</span>
      <span style={{ color, fontSize: 9 }}>
        {arrow} {sign}{index.change.toFixed(2)} ({sign}{index.change_pct.toFixed(2)}%)
      </span>
    </span>
  );
}

export default function MarketTicker() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMarketIndices();
        setIndices(data);
        setError(false);
      } catch {
        setError(true);
      }
    };
    load();
    const interval = setInterval(load, 1_800_000);
    return () => clearInterval(interval);
  }, []);

  if (error || indices.length === 0) return null;

  // Triple the content for seamless looping
  const tripled = [...indices, ...indices, ...indices];

  return (
    <div
      style={{
        background: "#080808",
        borderBottom: "1px solid #1a1a1a",
        overflow: "hidden",
        height: 28,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          color: "#f59e0b",
          fontFamily: "monospace",
          fontSize: 10,
          fontWeight: 700,
          padding: "0 12px",
          letterSpacing: 1,
          flexShrink: 0,
          borderRight: "1px solid #1a1a1a",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#0a0a0a",
          zIndex: 1,
        }}
      >
        ◉ LIVE
      </div>
      <div className="ticker-wrap">
        <div className="ticker-content">
          {tripled.map((idx, i) => (
            <IndexPill key={`${idx.symbol}-${i}`} index={idx} />
          ))}
        </div>
      </div>
    </div>
  );
}
