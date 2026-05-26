const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Simple in-memory cache ───────────────────────────────────────────
const _cache: Record<string, { data: any; ts: number }> = {};
function getCached(key: string, ttlMs: number): any {
  const entry = _cache[key];
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
function setCache(key: string, data: any) {
  _cache[key] = { data, ts: Date.now() };
}

// ── Fetch with retry + timeout ────────────────────────────────────────

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2,
  timeout = 120000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return res;
    } catch (err: any) {
      const isLast = i === retries;
      const isTimeout = err?.name === "AbortError";
      if (isLast) {
        clearTimeout(id);
        throw isTimeout
          ? new Error("Request timed out. The server may be starting up, please try again.")
          : err;
      }
      // Wait before retry (cold start on Render can take 30-60s)
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  throw new Error("Unreachable");
}

// ── Types ──────────────────────────────────────────────────────────────

export interface BacktestRequest {
  ticker: string;
  start_date: string;
  end_date: string;
  interval?: string;
  strategy?: string;
  fast_ma?: number;
  slow_ma?: number;
  bb_window?: number;
  bb_std?: number;
  fees?: number;
  init_cash?: number;
  rsi_window?: number;
  macd_fast?: number;
  macd_slow?: number;
  macd_signal?: number;
}

export interface StrategyInfo {
  id: string;
  name: string;
  description: string;
  params: Record<string, number>;
}

export interface BacktestResponse {
  ticker: string;
  start_date: string;
  end_date: string;
  interval: string;
  strategy: string;
  data_points: number;
  dates: string[];
  ohlcv: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
  portfolio: {
    stats: Record<string, unknown>;
    trades: unknown[];
    equity_curve: Record<string, number>;
    returns: Record<string, number>;
    drawdown: Record<string, number>;
  };
  indicators: {
    sma?: {
      fast: Record<string, number>;
      slow: Record<string, number>;
      fast_window: number;
      slow_window: number;
    };
    ema?: {
      fast: Record<string, number>;
      slow: Record<string, number>;
      fast_window: number;
      slow_window: number;
    };
    bollinger?: {
      middle: Record<string, number>;
      upper: Record<string, number>;
      lower: Record<string, number>;
      window: number;
      std: number;
    };
    rsi: {
      rsi: Record<string, number>;
      overbought: number;
      oversold: number;
      window: number;
    };
    macd: {
      macd: Record<string, number>;
      signal: Record<string, number>;
      histogram: Record<string, number>;
      fast_window: number;
      slow_window: number;
      signal_window: number;
    };
  };
  signals: {
    entries: Record<string, boolean>;
    exits: Record<string, boolean>;
  };
}

export interface OptionsFlowResponse {
  ticker: string;
  as_of: string;
  has_leaps: boolean;
  leaps_expiries: string[];
  summary: {
    total_call_volume: number;
    total_put_volume: number;
    call_put_ratio: number;
    total_expiries: number;
    nearest_call_put_ratio: number;
    unusual_count: number;
  };
  all_expiries: OptionsChainExpiry[];
  leaps: OptionsChainExpiry[];
  unusual_activities: UnusualActivity[];
}

export interface OptionsChainExpiry {
  expiry: string;
  is_leaps: boolean;
  total_call_volume: number;
  total_put_volume: number;
  total_call_oi: number;
  total_put_oi: number;
  call_put_ratio: number;
  top_calls: OptionStrike[];
  top_puts: OptionStrike[];
  unusual_calls: OptionStrike[];
  unusual_puts: OptionStrike[];
}

export interface OptionStrike {
  strike: number;
  lastPrice?: number;
  volume?: number;
  openInterest?: number;
  vol_oi_ratio?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
  contractSymbol?: string;
  contractSize?: number;
  expiry?: string;
  type?: "leaps_call" | "leaps_put";
  signal?: "BULLISH" | "BEARISH";
}

export interface UnusualActivity extends OptionStrike {}

export interface LeapsBoardEntry {
  ticker: string;
  has_leaps: boolean;
  leaps_count: number;
  total_call_volume: number;
  total_put_volume: number;
  call_put_ratio: number;
  nearest_call_put_ratio: number;
  unusual_count: number;
  top_leaps_expiry: string | null;
}

export interface LeapsBoardResponse {
  count: number;
  scan_tickers: string[];
  results: LeapsBoardEntry[];
}

export interface LeapsScannerSpike {
  type: string;
  expiry: string;
  strike: number;
  volume: number;
  openInterest: number;
  vol_oi_ratio: number;
  lastPrice?: number;
  impliedVolatility?: number;
  signal: string;
}

export interface LeapsScannerEntry {
  ticker: string;
  total_leaps_call_vol: number;
  total_leaps_put_vol: number;
  total_leaps_vol: number;
  call_put_ratio: number;
  unusual_count: number;
  top_spike: LeapsScannerSpike;
  all_spikes: LeapsScannerSpike[];
  leaps_expiries_count: number;
  nearest_leaps_expiry: string | null;
  scan_time: string;
}

export interface LeapsScannerResponse {
  tickers: LeapsScannerEntry[];
  count: number;
  scan_info: {
    max_tickers: number;
    min_spikes: number;
    scan_time_sec: number;
    scanned_at: string;
  };
}

export interface CompareResponse {
  ticker: string;
  start_date: string;
  end_date: string;
  interval: string;
  data_points: number;
  dates: string[];
  ohlcv: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
  indicators: {
    rsi: { rsi: Record<string, number>; overbought: number; oversold: number; window: number };
    macd: {
      macd: Record<string, number>;
      signal: Record<string, number>;
      histogram: Record<string, number>;
      fast_window: number;
      slow_window: number;
      signal_window: number;
    };
  };
  comparison: Record<string, {
    label: string;
    name: string;
    stats: Record<string, unknown>;
    equity_curve: Record<string, number>;
    returns: Record<string, number>;
    drawdown: Record<string, number>;
    trades: unknown[];
    error?: string;
  }>;
}

export interface FundamentalsData {
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
}

// ── Fetch Functions ───────────────────────────────────────────────────

export const DEFAULT_SCAN_TICKERS = [
  "AAPL","MSFT","GOOGL","AMZN","NVDA","TSLA","META",
  "SPY","QQQ","IWM","AMD","INTC","PLTR","COIN",
  "JPM","BAC","GS","JNJ","PFE","UNH","XOM","CVX",
];

export async function fetchOptionsFlow(ticker: string): Promise<OptionsFlowResponse> {
  const cacheKey = `options-flow:${ticker.toUpperCase()}`;
  const cached = getCached(cacheKey, 600_000); // 10 min
  if (cached) return cached;
  const res = await fetchWithRetry(`${API_BASE}/api/ticker/${encodeURIComponent(ticker)}/options-flow`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

export async function fetchLeapsBoard(limit: number = 15): Promise<LeapsBoardResponse> {
  const res = await fetchWithRetry(
    `${API_BASE}/api/options-flow/leaps-board?limit=${encodeURIComponent(String(limit))}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchLeapsScanner(
  max_tickers: number = 100,
  min_spikes: number = 1,
): Promise<LeapsScannerResponse> {
  const cacheKey = `leaps-scanner:${max_tickers}:${min_spikes}`;
  const cached = getCached(cacheKey, 600_000); // 10 min
  if (cached) return cached;
  const res = await fetchWithRetry(
    `${API_BASE}/api/leaps/scanner?max_tickers=${encodeURIComponent(String(max_tickers))}&min_spikes=${encodeURIComponent(String(min_spikes))}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}

export async function fetchStrategies(): Promise<StrategyInfo[]> {
  const res = await fetchWithRetry(`${API_BASE}/api/strategies`);
  if (!res.ok) throw new Error("Failed to load strategies");
  const data = await res.json();
  return data.strategies;
}

export async function runBacktest(request: BacktestRequest): Promise<BacktestResponse> {
  const res = await fetchWithRetry(`${API_BASE}/api/backtest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }, 3, 180000); // 3 retries, 180s timeout for backtest

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function compareStrategies(request: BacktestRequest): Promise<CompareResponse> {
  const res = await fetchWithRetry(`${API_BASE}/api/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  }, 3, 180000);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const res = await fetchWithRetry(`${API_BASE}/api/health`, {}, 3, 30000);
  if (!res.ok) throw new Error("Backend unavailable");
  return res.json();
}

export async function fetchTickerRange(ticker: string): Promise<{ earliest: string; latest: string; data_points: number }> {
  const res = await fetchWithRetry(`${API_BASE}/api/ticker/${encodeURIComponent(ticker)}/range`);
  if (!res.ok) throw new Error(`No data for ${ticker}`);
  return res.json();
}

export async function fetchFundamentals(ticker: string): Promise<FundamentalsData> {
  const cacheKey = `fundamentals:${ticker.toUpperCase()}`;
  const cached = getCached(cacheKey, 600_000); // 10 min
  if (cached) return cached;
  const res = await fetchWithRetry(`${API_BASE}/api/ticker/${encodeURIComponent(ticker)}/fundamentals`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  const data = await res.json();
  setCache(cacheKey, data);
  return data;
}
