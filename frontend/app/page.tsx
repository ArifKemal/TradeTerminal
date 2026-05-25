"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TerminalHeader from "./components/TerminalHeader";
import BacktestForm, { type BacktestConfig } from "./components/BacktestForm";
import PriceChart from "./components/PriceChart";
import IndicatorChart from "./components/IndicatorChart";
import EquityChart from "./components/EquityChart";
import VolumeChart from "./components/VolumeChart";
import DrawdownChart from "./components/DrawdownChart";
import ComparePanel from "./components/ComparePanel";
import FundamentalsPanel from "./components/FundamentalsPanel";
import OptionsFlowPanel from "./components/OptionsFlowPanel";
import {
  runBacktest, compareStrategies, healthCheck, fetchFundamentals,
  fetchOptionsFlow, fetchLeapsScanner,
  type BacktestResponse, type CompareResponse, type FundamentalsData,
  type OptionsFlowResponse, type LeapsScannerEntry, type LeapsScannerResponse,
} from "./api";

export default function Home() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "loading">("loading");
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResponse | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResponse | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [useCandlestick, setUseCandlestick] = useState(true);
  const [activeTab, setActiveTab] = useState<"backtest" | "compare" | "options">("backtest");
  const [optionsData, setOptionsData] = useState<OptionsFlowResponse | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [leapsScanner, setLeapsScanner] = useState<LeapsScannerEntry[]>([]);
  const [leapsScannerLoading, setLeapsScannerLoading] = useState(false);
  const [leapsScannerInfo, setLeapsScannerInfo] = useState<LeapsScannerResponse["scan_info"] | null>(null);
  const fundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dictToArray = useCallback(
    (dict: Record<string, number> | undefined, dates: string[]): (number | null)[] => {
      if (!dict) return [];
      return dates.map((d) => {
        const v = dict[d];
        return v !== undefined ? v : null;
      });
    },
    [],
  );

  useEffect(() => {
    healthCheck().then(() => setStatus("connected")).catch(() => setStatus("disconnected"));
  }, []);

  useEffect(() => {
    if (activeTab === "options") loadLeapsScanner();
  }, [activeTab]);

  const loadLeapsScanner = async () => {
    setLeapsScannerLoading(true);
    try {
      const data = await fetchLeapsScanner(100, 1);
      setLeapsScanner(data.tickers);
      setLeapsScannerInfo(data.scan_info);
    } catch {
      setLeapsScanner([]);
    } finally {
      setLeapsScannerLoading(false);
    }
  };

  const handleBacktest = async (config: BacktestConfig) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setCompareResult(null);
    setFundamentals(null);
    setActiveTab("backtest");
    try {
      const [data, fundData] = await Promise.all([
        runBacktest(config),
        fetchFundamentals(config.ticker).catch(() => null),
      ]);
      setResult(data);
      if (fundData) setFundamentals(fundData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async (config: BacktestConfig) => {
    setIsComparing(true);
    setError(null);
    setResult(null);
    setCompareResult(null);
    setFundamentals(null);
    setActiveTab("compare");
    try {
      const [data, fundData] = await Promise.all([
        compareStrategies(config),
        fetchFundamentals(config.ticker).catch(() => null),
      ]);
      setCompareResult(data);
      if (fundData) setFundamentals(fundData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsComparing(false);
    }
  };

  // Derived data
  const dates = result?.dates || [];
  const close = result?.ohlcv?.close || [];
  const open = result?.ohlcv?.open || [];
  const high = result?.ohlcv?.high || [];
  const low = result?.ohlcv?.low || [];
  const volume = result?.ohlcv?.volume || [];

  const strategyName = result?.strategy || "sma";
  const fastOverlay = dictToArray(result?.indicators?.sma?.fast as Record<string, number> | undefined, dates);
  const slowOverlay = dictToArray(result?.indicators?.sma?.slow as Record<string, number> | undefined, dates);
  const emaFastOverlay = dictToArray(result?.indicators?.ema?.fast as Record<string, number> | undefined, dates);
  const emaSlowOverlay = dictToArray(result?.indicators?.ema?.slow as Record<string, number> | undefined, dates);
  const bbUpper = dictToArray(result?.indicators?.bollinger?.upper as Record<string, number> | undefined, dates);
  const bbMiddle = dictToArray(result?.indicators?.bollinger?.middle as Record<string, number> | undefined, dates);
  const bbLower = dictToArray(result?.indicators?.bollinger?.lower as Record<string, number> | undefined, dates);

  const entries = dictToArray(result?.signals?.entries as unknown as Record<string, number> | undefined, dates).map(Boolean);
  const exits = dictToArray(result?.signals?.exits as unknown as Record<string, number> | undefined, dates).map(Boolean);

  const rsiValues = dictToArray(result?.indicators?.rsi?.rsi as Record<string, number> | undefined, dates);
  const macdLine = dictToArray(result?.indicators?.macd?.macd as Record<string, number> | undefined, dates);
  const macdSignal = dictToArray(result?.indicators?.macd?.signal as Record<string, number> | undefined, dates);
  const macdHist = dictToArray(result?.indicators?.macd?.histogram as Record<string, number> | undefined, dates);
  const equityArr = dictToArray(result?.portfolio?.equity_curve as Record<string, number> | undefined, dates);
  const drawdownArr = dictToArray(result?.portfolio?.drawdown as Record<string, number> | undefined, dates);

  const overlays: { name: string; values: (number | null)[]; color: string; dash?: string }[] = [];
  if (strategyName === "sma" && fastOverlay.length > 0) {
    overlays.push({ name: "Fast SMA", values: fastOverlay, color: "#f59e0b", dash: "dot" });
    overlays.push({ name: "Slow SMA", values: slowOverlay, color: "#3b82f6", dash: "dash" });
  } else if (strategyName === "ema" && emaFastOverlay.length > 0) {
    overlays.push({ name: "Fast EMA", values: emaFastOverlay, color: "#f59e0b", dash: "dot" });
    overlays.push({ name: "Slow EMA", values: emaSlowOverlay, color: "#3b82f6", dash: "dash" });
  } else if (strategyName === "bollinger" && bbUpper.length > 0) {
    overlays.push({ name: "Upper BB", values: bbUpper, color: "#a78bfa", dash: "dot" });
    overlays.push({ name: "Middle BB", values: bbMiddle, color: "#a78bfa" });
    overlays.push({ name: "Lower BB", values: bbLower, color: "#a78bfa", dash: "dot" });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TerminalHeader status={status} />

      <main className="flex-1 p-6">
        <div className="max-w-[1600px] mx-auto">
          {/* Terminal prompt line */}
          <div className="flex items-center gap-2 mb-6 text-sm flex-wrap">
            <span className="text-[var(--accent-orange)]">{">"}</span>
            <span className="text-[var(--text-secondary)]">vectorbt</span>
            <span className="text-[var(--text-muted)]">--backtest</span>
            <span className="text-[var(--text-muted)]">--engine={result?.strategy || "sma"}</span>
            <span className="text-[var(--text-muted)]">--indicators=rsi,macd</span>
            <span className="cursor-blink text-[var(--accent-orange)]">_</span>

            {/* Tabs */}
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => setActiveTab("backtest")}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded ${
                  activeTab === "backtest"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Backtest
              </button>
              {compareResult && (
                <button
                  onClick={() => setActiveTab("compare")}
                  className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded ${
                    activeTab === "compare"
                      ? "bg-[var(--accent-orange)] text-black"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  Compare
                </button>
              )}
              <button
                onClick={() => { setActiveTab("options"); loadLeapsScanner(); }}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider rounded ${
                  activeTab === "options"
                    ? "bg-[var(--accent-orange)] text-black"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Options
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <BacktestForm
                onSubmit={handleBacktest}
                onCompare={handleCompare}
                onTickerChange={(ticker) => {
                  if (!ticker.trim()) return;
                  if (fundTimerRef.current) clearTimeout(fundTimerRef.current);
                  fundTimerRef.current = setTimeout(() => {
                    fetchFundamentals(ticker).then(setFundamentals).catch(() => {});
                  }, 800);
                  fetchOptionsFlow(ticker).then(setOptionsData).catch(() => {});
                }}
                isLoading={isLoading}
                isComparing={isComparing}
              />
              {fundamentals && <FundamentalsPanel data={fundamentals} />}
            </div>

            {/* Right Panel */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {/* Error */}
              {error && (
                <div className="bg-red-950/30 border border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span>[ERROR]</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Loading */}
              {(isLoading || isComparing) && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-12 text-center">
                  <div className="inline-block w-8 h-8 border-2 border-[var(--accent-orange)] border-t-transparent rounded-full animate-spin mb-4" />
                  <div className="text-[var(--text-secondary)] text-sm">
                    {isComparing ? "Running all strategies..." : "Running backtest simulation..."}
                  </div>
                  <div className="text-[var(--text-muted)] text-xs mt-1">
                    Fetching data from Yahoo Finance + VectorBT analysis
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !isComparing && !result && !compareResult && !error && (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-12 text-center">
                  <div className="text-[var(--text-muted)] text-4xl mb-4">{">"}_</div>
                  <div className="text-[var(--text-secondary)] text-sm mb-2">Terminal.AI Ready</div>
                  <div className="text-[var(--text-muted)] text-xs">
                    Configure parameters and execute a backtest to begin analysis
                  </div>
                </div>
              )}

              {/* Backtest Results */}
              {result && !isLoading && activeTab === "backtest" && (
                <>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                    <span>[{result.ticker}] {result.start_date} → {result.end_date}</span>
                    <span>|</span>
                    <span>{result.data_points} data points</span>
                    <span>|</span>
                    <span>Interval: {result.interval}</span>
                    <span>|</span>
                    <span>Strategy: {result.strategy.toUpperCase()}</span>
                    <label className="ml-auto flex items-center gap-2 cursor-pointer">
                      <span className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider">
                        {useCandlestick ? "Candlestick" : "Line"}
                      </span>
                      <button
                        onClick={() => setUseCandlestick(!useCandlestick)}
                        className={`w-8 h-4 rounded-full transition-colors ${
                          useCandlestick ? "bg-[var(--accent-orange)]" : "bg-[var(--bg-tertiary)]"
                        }`}
                      >
                        <span
                          className={`block w-3 h-3 bg-black rounded-full transition-transform mt-0.5 ${
                            useCandlestick ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  <PriceChart
                    dates={dates} open={open} high={high} low={low} close={close}
                    entries={entries} exits={exits} ticker={result.ticker}
                    overlays={overlays} candlestick={useCandlestick}
                  />

                  {volume.length > 0 && (
                    <VolumeChart dates={dates} volume={volume} close={close} />
                  )}

                  <EquityChart
                    dates={dates} equity={equityArr}
                    initCash={
                      result.portfolio.stats && typeof result.portfolio.stats["Start Value"] === "number"
                        ? (result.portfolio.stats["Start Value"] as number)
                        : 10000
                    }
                  />

                  {drawdownArr.length > 0 && (
                    <DrawdownChart
                      dates={dates} drawdown={drawdownArr}
                      maxDrawdown={
                        result.portfolio.stats && typeof result.portfolio.stats["Max Drawdown [%]"] === "number"
                          ? (result.portfolio.stats["Max Drawdown [%]"] as number) / 100
                          : undefined
                      }
                    />
                  )}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <IndicatorChart
                      dates={dates} values={rsiValues}
                      title={`RSI (${result.indicators.rsi.window})`}
                      color="#a78bfa"
                      overbought={result.indicators.rsi.overbought}
                      oversold={result.indicators.rsi.oversold}
                    />
                    <IndicatorChart
                      dates={dates} values={macdLine}
                      title={`MACD (${result.indicators.macd.fast_window}/${result.indicators.macd.slow_window}/${result.indicators.macd.signal_window})`}
                      color="#f59e0b"
                      secondaryValues={macdSignal}
                      secondaryColor="#3b82f6"
                      secondaryName="Signal"
                      histogramValues={macdHist}
                    />
                  </div>
                </>
              )}

              {/* Compare Results */}
              {compareResult && !isComparing && activeTab === "compare" && (
                <>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] flex-wrap">
                    <span>[{compareResult.ticker}] {compareResult.start_date} → {compareResult.end_date}</span>
                    <span>|</span>
                    <span>{compareResult.data_points} data points</span>
                    <span>|</span>
                    <span>Interval: {compareResult.interval}</span>
                  </div>

                  <ComparePanel
                    comparison={compareResult.comparison}
                    dates={compareResult.dates}
                  />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <IndicatorChart
                      dates={compareResult.dates}
                      values={dictToArray(compareResult.indicators.rsi.rsi as Record<string, number>, compareResult.dates)}
                      title={`RSI (${compareResult.indicators.rsi.window})`}
                      color="#a78bfa"
                      overbought={compareResult.indicators.rsi.overbought}
                      oversold={compareResult.indicators.rsi.oversold}
                    />
                    <IndicatorChart
                      dates={compareResult.dates}
                      values={dictToArray(compareResult.indicators.macd.macd as Record<string, number>, compareResult.dates)}
                      title={`MACD (${compareResult.indicators.macd.fast_window}/${compareResult.indicators.macd.slow_window}/${compareResult.indicators.macd.signal_window})`}
                      color="#f59e0b"
                      secondaryValues={dictToArray(compareResult.indicators.macd.signal as Record<string, number>, compareResult.dates)}
                      secondaryColor="#3b82f6"
                      secondaryName="Signal"
                      histogramValues={dictToArray(compareResult.indicators.macd.histogram as Record<string, number>, compareResult.dates)}
                    />
                  </div>
                </>
              )}

              {/* Options Tab */}
              {activeTab === "options" && (
                <div className="space-y-6">
                  {/* Per-ticker options flow panel */}
                  {result && <OptionsFlowPanel ticker={result.ticker} />}
                  {!result && (
                    <div style={{
                      background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
                      borderRadius: 8, padding: 48, textAlign: "center",
                    }}>
                      <div style={{ color: "var(--text-muted)", fontSize: 48, marginBottom: 16 }}>Op_</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 8 }}>Options Flow</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        Run a backtest first to view options flow for that ticker.
                      </div>
                    </div>
                  )}

                  {/* LEAPS Scanner — S&P 100 (en alt) */}
                  <div style={{
                    background: "#0a0a0a", border: "1px solid #1e1e1e",
                    borderRadius: 6, padding: 16,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{
                        margin: 0, color: "#f97316", fontFamily: "monospace",
                        fontSize: 14, fontWeight: 700, letterSpacing: 1,
                      }}>
                        ⚑ LEAPS SCANNER — S&P 100 — anormal hacim/OI spike
                      </h3>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {leapsScannerInfo && (
                          <span style={{ color: "#555", fontFamily: "monospace", fontSize: 10 }}>
                            {leapsScannerInfo.scan_time_sec}s — {leapsScanner.length} anomalili
                          </span>
                        )}
                        <button
                          onClick={loadLeapsScanner}
                          disabled={leapsScannerLoading}
                          style={{
                            background: leapsScannerLoading ? "#333" : "#f97316",
                            color: leapsScannerLoading ? "#666" : "#000",
                            border: "none", borderRadius: 4, padding: "4px 10px",
                            fontFamily: "monospace", fontSize: 10, fontWeight: 700,
                            cursor: leapsScannerLoading ? "not-allowed" : "pointer",
                          }}
                        >
                          {leapsScannerLoading ? "Scanning…" : "↻ Rescan"}
                        </button>
                      </div>
                    </div>

                    {leapsScannerLoading ? (
                      <p style={{ color: "#888", fontFamily: "monospace" }}>Scanning S&P 100 for LEAPS anomalies… (~10s)</p>
                    ) : leapsScanner.length ? (
                      <table style={{
                        width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 11,
                      }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "6px 8px", textAlign: "left", color: "#888" }}>Ticker</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#888" }}>LEAPS Vol</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#888" }}>C/P</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#888" }}>Spikes</th>
                            <th style={{ padding: "6px 8px", textAlign: "left", color: "#888" }}>Top Spike</th>
                            <th style={{ padding: "6px 8px", textAlign: "right", color: "#888" }}>Signal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leapsScanner.map((entry, i) => {
                            const spike = entry.top_spike;
                            const handleClickTicker = async () => {
                              setActiveTab("backtest");
                              setIsLoading(true);
                              setError(null);
                              setResult(null);
                              setCompareResult(null);
                              setFundamentals(null);
                              try {
                                const ticker = entry.ticker;
                                // Get full date range for this ticker
                                let startDate, endDate;
                                try {
                                  const { default: api } = await import("./api");
                                  // fetchTickerRange is exported from api
                                  const rangeRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/ticker/${encodeURIComponent(ticker)}/range`);
                                  if (rangeRes.ok) {
                                    const range = await rangeRes.json();
                                    startDate = range.earliest.split("T")[0];
                                    endDate = range.latest.split("T")[0];
                                  }
                                } catch {}
                                if (!startDate) {
                                  const end = new Date();
                                  const start = new Date(end);
                                  start.setFullYear(start.getFullYear() - 1);
                                  const fmt = (d: Date) => d.toISOString().split("T")[0];
                                  startDate = fmt(start);
                                  endDate = fmt(end);
                                }
                                const config: BacktestConfig = {
                                  ticker, start_date: startDate, end_date: endDate,
                                  interval: "1d", strategy: "sma",
                                  fast_ma: 10, slow_ma: 30, bb_window: 20, bb_std: 2.0,
                                  fees: 0.001, init_cash: 10000,
                                  rsi_window: 14, macd_fast: 12, macd_slow: 26, macd_signal: 9,
                                };
                                const [data, fundData] = await Promise.all([
                                  runBacktest(config),
                                  fetchFundamentals(ticker).catch(() => null),
                                ]);
                                setResult(data);
                                if (fundData) setFundamentals(fundData);
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Unknown error");
                              } finally {
                                setIsLoading(false);
                              }
                            };
                            return (
                              <tr
                                key={i}
                                onClick={handleClickTicker}
                                style={{ borderBottom: "1px solid #1a1a1a", cursor: "pointer" }}
                                className="hover:bg-[#1a1a1a] transition-colors"
                              >
                                <td style={{ padding: "6px 8px", color: "#f97316", fontWeight: 700 }}>{entry.ticker}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "#e5e7eb" }}>{entry.total_leaps_vol.toLocaleString()}</td>
                                <td style={{
                                  padding: "6px 8px", textAlign: "right",
                                  color: entry.call_put_ratio > 1 ? "#22c55e" : "#ef4444",
                                }}>{entry.call_put_ratio.toFixed(2)}</td>
                                <td style={{ padding: "6px 8px", textAlign: "right", color: "#f97316" }}>{entry.unusual_count}</td>
                                <td style={{ padding: "6px 8px", color: "#888", fontSize: 10 }}>
                                  {spike?.type} {spike?.expiry} K={spike?.strike?.toFixed(0)} vol={spike?.volume?.toLocaleString()} voi={spike?.vol_oi_ratio}
                                </td>
                                <td style={{
                                  padding: "6px 8px", textAlign: "right", fontWeight: 700,
                                  color: entry.call_put_ratio > 1.5 ? "#22c55e" : entry.call_put_ratio < 0.67 ? "#ef4444" : "#f59e0b",
                                }}>
                                  {entry.call_put_ratio > 1.5 ? "Bullish" : entry.call_put_ratio < 0.67 ? "Bearish" : "Neutral"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : !leapsScannerLoading ? (
                      <p style={{ color: "#555", fontFamily: "monospace", fontSize: 10 }}>
                        No LEAPS anomalies found. Click Rescan to try again.
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Terminal.AI v1.1.0 — Powered by VectorBT + FastAPI + Next.js</span>
          <span>Data: Yahoo Finance (yfinance)</span>
        </div>
      </footer>
    </div>
  );
}
