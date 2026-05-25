"use client";

import { useState, useEffect, useMemo } from "react";
import { fetchOptionsFlow, type OptionsFlowResponse } from "../api";
import dynamic from "next/dynamic";

// Lazy-load Plotly
const Plot = dynamic(() => import("react-plotly.js").then((m) => m.default), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────

interface StrikeData {
  strike: number;
  volume: number;
  openInterest: number;
  vol_oi_ratio: number;
  contractSymbol?: string;
}

interface ExpiryData {
  expiry: string;
  is_leaps: boolean;
  total_call_volume: number;
  total_put_volume: number;
  call_put_ratio: number;
  top_calls: StrikeData[];
  top_puts: StrikeData[];
}

interface UnusualActivity {
  type: string;
  expiry: string;
  strike: number;
  volume: number;
  openInterest: number;
  vol_oi_ratio: number;
  signal: string;
  contractSymbol: string;
}

interface SummaryData {
  total_call_volume: number;
  total_put_volume: number;
  call_put_ratio: number;
  total_expiries: number;
  unusual_count: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function fmtVol(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function rpColor(ratio: number): string {
  if (ratio === 0) return "#555";
  return ratio > 1 ? "#22c55e" : ratio < 1 ? "#ef4444" : "#f59e0b";
}

function rpLabel(r: number): string {
  if (r > 3) return "Strongly Bullish";
  if (r > 1.5) return "Bullish";
  if (r > 1) return "Slightly Bullish";
  if (r > 0.67) return "Neutral";
  if (r > 0.33) return "Slightly Bearish";
  return "Strongly Bearish";
}

// ── Sub-components ─────────────────────────────────────────────────────

function Kpi({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ background: "#0f0f0f", borderRadius: 4, padding: "8px 10px", border: "1px solid #1a1a1a" }}>
      <p style={{ margin: 0, color: "#555", fontFamily: "monospace", fontSize: 10 }}>{label}</p>
      <p style={{ margin: "2px 0 0", color, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{value}</p>
      {sub && <p style={{ margin: 0, color: "#888", fontFamily: "monospace", fontSize: 9 }}>{sub}</p>}
    </div>
  );
}

function ExpiryCard({ expiry, isLeaps, callVol, putVol, ratio, topCalls, topPuts }: {
  expiry: string; isLeaps: boolean; callVol: number;
  putVol: number; ratio: number; topCalls: StrikeData[]; topPuts: StrikeData[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      background: "#0f0f0f", border: `1px solid ${isLeaps ? "#f97316" : "#2a2a2a"}`,
      borderRadius: 6, marginBottom: 8, overflow: "hidden",
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "8px 12px", display: "flex",
          alignItems: "center", justifyContent: "space-between", cursor: "pointer",
          background: "transparent", border: "none", color: "#e5e7eb",
          fontFamily: "monospace", fontSize: 12,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>{expiry}</span>
          {isLeaps && <span style={{ color: "#f97316", fontSize: 9, fontWeight: 700 }}>LEAPS</span>}
        </span>
        <span style={{ color: rpColor(ratio), fontSize: 11 }}>
          C/P {ratio.toFixed(2)}
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", color: "#22c55e", fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>
              CALLS {fmtVol(callVol)}
            </p>
            <MiniTable rows={topCalls.slice(0, 4)} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", color: "#ef4444", fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>
              PUTS {fmtVol(putVol)}
            </p>
            <MiniTable rows={topPuts.slice(0, 4)} />
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTable({ rows }: { rows: StrikeData[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: "monospace", fontSize: 11 }}>
      <thead>
        <tr style={{ color: "#555", borderBottom: "1px solid #222" }}>
          <th style={{ padding: "2px 4px", textAlign: "left" }}>Strike</th>
          <th style={{ padding: "2px 4px", textAlign: "left" }}>Vol</th>
          <th style={{ padding: "2px 4px", textAlign: "left" }}>OI</th>
          <th style={{ padding: "2px 4px", textAlign: "left" }}>V/OI</th>
        </tr>
      </thead>
      <tbody style={{ color: "#e5e7eb" }}>
        {rows.map((s, i) => (
          <tr key={i} style={{ borderBottom: "1px solid #111" }}>
            <td style={{ padding: "2px 4px" }}>{s.strike}</td>
            <td style={{ padding: "2px 4px" }}>{fmtVol(s.volume ?? 0)}</td>
            <td style={{ padding: "2px 4px" }}>{fmtVol(s.openInterest ?? 0)}</td>
            <td style={{ padding: "2px 4px", color: (s.vol_oi_ratio ?? 0) > 2 ? "#f97316" : "#888" }}>
              {(s.vol_oi_ratio ?? 0).toFixed(1)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UnusualTable({ activities }: { activities: UnusualActivity[] }) {
  if (activities.length === 0) {
    return <p style={{ color: "#555", fontFamily: "monospace", fontSize: 11 }}>No unusual activity detected.</p>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11 }}>
        <thead>
          <tr style={{ color: "#555", borderBottom: "1px solid #333", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Type</th>
            <th style={{ padding: "6px 8px" }}>Expiry</th>
            <th style={{ padding: "6px 8px" }}>Strike</th>
            <th style={{ padding: "6px 8px" }}>Volume</th>
            <th style={{ padding: "6px 8px" }}>OI</th>
            <th style={{ padding: "6px 8px" }}>V/OI</th>
            <th style={{ padding: "6px 8px" }}>Signal</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #1a1a1a" }}>
              <td style={{ padding: "4px 8px", color: a.type === "leaps_call" ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                {a.type === "leaps_call" ? "LEAPS CALL" : "LEAPS PUT"}
              </td>
              <td style={{ padding: "4px 8px", color: "#888" }}>{a.expiry}</td>
              <td style={{ padding: "4px 8px" }}>${(a.strike ?? 0).toFixed(0)}</td>
              <td style={{ padding: "4px 8px" }}>{fmtVol(a.volume ?? 0)}</td>
              <td style={{ padding: "4px 8px" }}>{fmtVol(a.openInterest ?? 0)}</td>
              <td style={{ padding: "4px 8px", color: (a.vol_oi_ratio ?? 0) > 3 ? "#f97316" : "#bbb" }}>
                {(a.vol_oi_ratio ?? 0).toFixed(1)}
              </td>
              <td style={{ padding: "4px 8px", fontWeight: 700, color: a.signal === "BULLISH" ? "#22c55e" : "#ef4444" }}>
                {a.signal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──────────────────────────────────────────────────────────

interface OptionsFlowPanelProps {
  ticker: string;
}

export default function OptionsFlowPanel({ ticker }: OptionsFlowPanelProps) {
  const [data, setData] = useState<OptionsFlowResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchOptionsFlow(ticker)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError("Options data unavailable."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [ticker]);

  if (!ticker) return null;
  if (isLoading) return <p style={{ color: "#666", marginTop: 8, fontFamily: "monospace" }}>Loading options flow…</p>;
  if (error) return <p style={{ color: "#ef4444", marginTop: 8, fontFamily: "monospace" }}>{error}</p>;
  if (!data) return null;

  const summary = data.summary as SummaryData;
  const expiries = (data.all_expiries || []) as ExpiryData[];
  const leaps = (data.leaps || []) as ExpiryData[];
  const unusual = (data.unusual_activities || []) as UnusualActivity[];

  const nearestIdx = expiries.findIndex((e: ExpiryData) => !e.is_leaps);
  const primaryExpiry = nearestIdx >= 0 ? expiries[nearestIdx] : expiries[0] || null;

  return (
    <div style={{
      background: "#0a0a0a", border: "1px solid #1e1e1e",
      borderRadius: 6, padding: 16, marginTop: 12,
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: "#f97316", fontFamily: "monospace", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
          OPTIONS FLOW ─ {data.ticker}
        </h3>
        <span style={{ color: "#555", fontFamily: "monospace", fontSize: 10 }}>
          {new Date(data.as_of).toLocaleString("en-US", { hour12: false })}
        </span>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
        <Kpi label="CALL VOL" value={fmtVol(summary.total_call_volume)} color="#22c55e" />
        <Kpi label="PUT VOL" value={fmtVol(summary.total_put_volume)} color="#ef4444" />
        <Kpi label="C/P RATIO" value={summary.call_put_ratio.toFixed(2)} sub={rpLabel(summary.call_put_ratio)} color={rpColor(summary.call_put_ratio)} />
        <Kpi label="EXPIRIES" value={String(summary.total_expiries)} color="#777" />
        <Kpi label="LEAPS" value={String(leaps.length)} sub={leaps.length > 0 ? (data as any).leaps_expiries?.[0] : "—"} color="#f97316" />
      </div>

      {/* Expiry breakdown */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 6px", color: "#888", fontFamily: "monospace", fontSize: 11, fontWeight: 600 }}>
          EXPIRY BREAKDOWN ({expiries.length} total, {leaps.length} LEAPS)
        </p>
        {expiries.slice().reverse().map((e: ExpiryData) => (
          <ExpiryCard
            key={e.expiry}
            expiry={e.expiry}
            isLeaps={e.is_leaps}
            callVol={e.total_call_volume}
            putVol={e.total_put_volume}
            ratio={e.call_put_ratio}
            topCalls={e.top_calls || []}
            topPuts={e.top_puts || []}
          />
        ))}
      </div>

      {/* Unusual Activity */}
      {unusual.length > 0 && (
        <div>
          <p style={{ margin: "0 0 6px", color: "#f97316", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
            ⚑ UNUSUAL ACTIVITY ({summary.unusual_count}) — vol/OI ≥ 2
          </p>
          <UnusualTable activities={unusual} />
        </div>
      )}

      {unusual.length === 0 && (
        <p style={{ color: "#444", fontFamily: "monospace", fontSize: 10, marginTop: 4 }}>
          No unusual vol/OI spikes detected.
        </p>
      )}
    </div>
  );
}
