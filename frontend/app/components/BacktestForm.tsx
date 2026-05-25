"use client";

import { useState, useEffect, useRef } from "react";
import { fetchStrategies, fetchTickerRange, type StrategyInfo } from "../api";

interface BacktestFormProps {
  onSubmit: (config: BacktestConfig) => void;
  onCompare?: (config: BacktestConfig) => void;
  onTickerChange?: (ticker: string) => void;
  isLoading: boolean;
  isComparing?: boolean;
}

export interface BacktestConfig {
  ticker: string;
  start_date: string;
  end_date: string;
  interval: string;
  strategy: string;
  fast_ma: number;
  slow_ma: number;
  bb_window: number;
  bb_std: number;
  fees: number;
  init_cash: number;
  rsi_window: number;
  macd_fast: number;
  macd_slow: number;
  macd_signal: number;
}

function getDefaultDates() {
  const end = new Date();
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

const defaults = getDefaultDates();

const defaultConfig: BacktestConfig = {
  ticker: "",
  start_date: defaults.start,
  end_date: defaults.end,
  interval: "1d",
  strategy: "sma",
  fast_ma: 10,
  slow_ma: 30,
  bb_window: 20,
  bb_std: 2.0,
  fees: 0.001,
  init_cash: 10000,
  rsi_window: 14,
  macd_fast: 12,
  macd_slow: 26,
  macd_signal: 9,
};

export default function BacktestForm({ onSubmit, onCompare, onTickerChange, isLoading, isComparing }: BacktestFormProps) {
  const [config, setConfig] = useState<BacktestConfig>(defaultConfig);
  const [strategies, setStrategies] = useState<StrategyInfo[]>([]);

  useEffect(() => {
    fetchStrategies()
      .then(setStrategies)
      .catch(() => setStrategies([
        { id: "sma", name: "SMA Crossover", description: "", params: {} },
        { id: "ema", name: "EMA Crossover", description: "", params: {} },
        { id: "bollinger", name: "Bollinger Bands", description: "", params: {} },
      ]));
  }, []);

  // Auto-fetch full available date range when ticker changes
  const [loadingRange, setLoadingRange] = useState(false);
  const tickerRef = useRef(config.ticker);
  useEffect(() => {
    const t = config.ticker.trim();
    if (!t || t === tickerRef.current) return;
    tickerRef.current = t;
    const timer = setTimeout(() => {
      setLoadingRange(true);
      fetchTickerRange(t)
        .then((range) => {
          setConfig((prev) => ({
            ...prev,
            start_date: range.earliest.split("T")[0],
            end_date: range.latest.split("T")[0],
          }));
        })
        .catch(() => {})
        .finally(() => setLoadingRange(false));
    }, 600);
    return () => clearTimeout(timer);
  }, [config.ticker]);

  const setFullRange = async () => {
    const t = config.ticker.trim();
    if (!t) return;
    setLoadingRange(true);
    try {
      const range = await fetchTickerRange(t);
      setConfig((prev) => ({
        ...prev,
        start_date: range.earliest.split("T")[0],
        end_date: range.latest.split("T")[0],
      }));
    } catch {}
    setLoadingRange(false);
  };

  const handleChange = (field: keyof BacktestConfig, value: string | number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  const handleCompare = () => {
    if (onCompare) onCompare(config);
  };

  const inputClass =
    "w-full px-3 py-2 rounded text-sm outline-none transition-colors focus:border-[var(--accent-orange)]";
  const labelClass = "text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1 block";

  const isBollinger = config.strategy === "bollinger";

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[var(--accent-orange)]">$</span>
        <h2 className="text-sm font-bold uppercase tracking-wider">Backtest Configuration</h2>
      </div>

      {/* Row 1: Ticker + Interval */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className={labelClass}>Ticker Symbol</label>
          <input
            type="text"
            value={config.ticker}
            onChange={(e) => {
              handleChange("ticker", e.target.value.toUpperCase());
              onTickerChange?.(e.target.value.toUpperCase());
            }}
            className={inputClass}
            placeholder="e.g. AAPL, TSLA, BTC-USD"
          />
        </div>
        <div>
          <label className={labelClass}>Interval</label>
          <select
            value={config.interval}
            onChange={(e) => handleChange("interval", e.target.value)}
            className={inputClass}
          >
            <option value="1m">1 Minute</option>
            <option value="5m">5 Minutes</option>
            <option value="15m">15 Minutes</option>
            <option value="1h">1 Hour</option>
            <option value="1d">1 Day</option>
            <option value="1wk">1 Week</option>
            <option value="1mo">1 Month</option>
          </select>
        </div>
      </div>

      {/* Row 2: Date Range */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Start Date</label>
            <button
              type="button"
              onClick={setFullRange}
              disabled={loadingRange}
              className="text-[10px] text-[var(--accent-orange)] hover:underline uppercase tracking-wider disabled:opacity-40"
            >
              {loadingRange ? "..." : "All Time"}
            </button>
          </div>
          <input
            type="date"
            value={config.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input
            type="date"
            value={config.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 3: Strategy Select */}
      <div className="border-t border-[var(--border-color)] pt-4 mt-4">
        <h3 className="text-xs text-[var(--accent-orange)] uppercase tracking-wider mb-3">
          Strategy
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {strategies.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleChange("strategy", s.id)}
              className={`px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                config.strategy === s.id
                  ? "bg-[var(--accent-orange)] text-black"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]"
              }`}
            >
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mb-4 italic">
          {strategies.find((s) => s.id === config.strategy)?.description || ""}
        </div>
      </div>

      {/* Row 4: Strategy Parameters */}
      <div className="border-t border-[var(--border-color)] pt-4">
        <h3 className="text-xs text-[var(--accent-orange)] uppercase tracking-wider mb-3">
          {isBollinger ? "Bollinger Bands" : "MA Parameters"}
        </h3>
        {isBollinger ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Window</label>
              <input
                type="number"
                value={config.bb_window}
                onChange={(e) => handleChange("bb_window", parseInt(e.target.value) || 2)}
                min={2}
                max={200}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Std Dev</label>
              <input
                type="number"
                value={config.bb_std}
                onChange={(e) => handleChange("bb_std", parseFloat(e.target.value) || 0.5)}
                min={0.5}
                max={4}
                step={0.1}
                className={inputClass}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Fast MA Period</label>
              <input
                type="number"
                value={config.fast_ma}
                onChange={(e) => handleChange("fast_ma", parseInt(e.target.value) || 2)}
                min={2}
                max={200}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Slow MA Period</label>
              <input
                type="number"
                value={config.slow_ma}
                onChange={(e) => handleChange("slow_ma", parseInt(e.target.value) || 2)}
                min={2}
                max={500}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>

      {/* Row 5: Indicator Settings */}
      <div className="border-t border-[var(--border-color)] pt-4">
        <h3 className="text-xs text-[var(--accent-orange)] uppercase tracking-wider mb-3">
          Indicators
        </h3>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div>
            <label className={labelClass}>RSI Period</label>
            <input
              type="number"
              value={config.rsi_window}
              onChange={(e) => handleChange("rsi_window", parseInt(e.target.value) || 2)}
              min={2}
              max={100}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>MACD Fast</label>
            <input
              type="number"
              value={config.macd_fast}
              onChange={(e) => handleChange("macd_fast", parseInt(e.target.value) || 2)}
              min={2}
              max={100}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>MACD Slow</label>
            <input
              type="number"
              value={config.macd_slow}
              onChange={(e) => handleChange("macd_slow", parseInt(e.target.value) || 2)}
              min={2}
              max={200}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>MACD Signal</label>
            <input
              type="number"
              value={config.macd_signal}
              onChange={(e) => handleChange("macd_signal", parseInt(e.target.value) || 2)}
              min={2}
              max={100}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading || isComparing}
          className="flex-1 px-4 py-3 bg-[var(--accent-orange)] hover:bg-[var(--accent-orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm uppercase tracking-wider rounded transition-colors glow-orange"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Running...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>{">"}</span> Execute
            </span>
          )}
        </button>
        {onCompare && (
          <button
            type="button"
            onClick={handleCompare}
            disabled={isLoading || isComparing}
            className="px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--text-secondary)] font-bold text-sm uppercase tracking-wider rounded transition-colors"
          >
            {isComparing ? (
              <span className="inline-block w-4 h-4 border-2 border-[var(--text-secondary)] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Compare All"
            )}
          </button>
        )}
      </div>
    </form>
  );
}
