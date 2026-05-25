"""
TradeTerminal - VectorBT Financial Analysis Backend
FastAPI server providing backtesting and technical analysis endpoints.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal
import pandas as pd
import time
import os
from datetime import datetime

from data_fetcher import fetch_ohlcv
from strategies import (
    run_strategy, run_all_strategies, STRATEGIES,
    calculate_rsi, calculate_macd,
)
from options_flow import (
    fetch_options_flow, rank_tickers_by_leaps_activity, rank_single_ticker,
    DEFAULT_SCAN_TICKERS,
)
from leaps_scanner import scan_all_sp100_leaps
from encoder import safe_json_response

app = FastAPI(
    title="TradeTerminal",
    description="VectorBT-based financial backtesting and analysis platform",
    version="1.1.0"
)

# CORS - allow Next.js frontend
# Production'da FRONTEND_URL env'den okunur (Vercel URL'i)
# Development'da localhost:3000 varsayılan
import os as _os
_cors_origins = ["http://localhost:3000"]
_frontend_url = _os.environ.get("FRONTEND_URL", "")
if _frontend_url:
    _cors_origins.append(_frontend_url)
    # https:// ön ekini de ekle (Vercel bazen https döndürür)
    if _frontend_url.startswith("https://"):
        _cors_origins.append(_frontend_url.replace("https://", "http://"))
    elif _frontend_url.startswith("http://"):
        _cors_origins.append(_frontend_url.replace("http://", "https://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Simple in-memory cache ──────────────────────────────────────────
_cache: dict = {}
_CACHE_TTL = 600  # 10 minutes


def _cached(key: str, ttl: int = _CACHE_TTL):
    """Decorator-like helper: return cached value or None if expired/missing."""
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < ttl:
        return entry["data"]
    return None


def _set_cache(key: str, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ── Request / Response Models ──────────────────────────────────────

class BacktestRequest(BaseModel):
    ticker: str = Field(..., description="Ticker symbol, e.g. AAPL, BTC-USD")
    start_date: str = Field(..., description="Start date YYYY-MM-DD")
    end_date: str = Field(..., description="End date YYYY-MM-DD")
    interval: str = Field(default="1d", description="Data interval: 1d, 1h, 1wk, etc.")
    strategy: str = Field(default="sma", description="Strategy: sma, ema, bollinger")
    fast_ma: int = Field(default=10, ge=2, le=200, description="Fast MA period (SMA/EMA)")
    slow_ma: int = Field(default=30, ge=2, le=500, description="Slow MA period (SMA/EMA)")
    bb_window: int = Field(default=20, ge=2, le=200, description="Bollinger Bands window")
    bb_std: float = Field(default=2.0, ge=0.5, le=4.0, description="Bollinger Bands std dev")
    fees: float = Field(default=0.001, ge=0, le=0.1, description="Transaction fee")
    init_cash: float = Field(default=10000.0, ge=100, description="Initial cash")
    rsi_window: int = Field(default=14, ge=2, le=100, description="RSI period")
    macd_fast: int = Field(default=12, ge=2, le=100, description="MACD fast period")
    macd_slow: int = Field(default=26, ge=2, le=200, description="MACD slow period")
    macd_signal: int = Field(default=9, ge=2, le=100, description="MACD signal period")


class HealthResponse(BaseModel):
    status: str
    version: str


# ── Helpers ──────────────────────────────────────────────────────────

def _get_strategy_kwargs(request: BacktestRequest) -> dict:
    """Extract strategy-specific kwargs from request."""
    if request.strategy == "bollinger":
        return {
            "window": request.bb_window,
            "std": request.bb_std,
            "fees": request.fees,
            "init_cash": request.init_cash,
        }
    else:
        return {
            "fast_window": request.fast_ma,
            "slow_window": request.slow_ma,
            "fees": request.fees,
            "init_cash": request.init_cash,
        }


def _build_backtest_response(df: pd.DataFrame, result: dict, request: BacktestRequest) -> dict:
    """Build the standard backtest response dict."""
    close = df["Close"]
    dates = close.index.tolist()

    # Calculate indicators
    rsi_data = calculate_rsi(close, window=request.rsi_window)
    macd_data = calculate_macd(
        close=close,
        fast_window=request.macd_fast,
        slow_window=request.macd_slow,
        signal_window=request.macd_signal,
    )

    response = {
        "ticker": request.ticker,
        "start_date": request.start_date,
        "end_date": request.end_date,
        "interval": request.interval,
        "strategy": request.strategy,
        "data_points": len(df),
        "dates": dates,
        "ohlcv": {
            "open": df["Open"].tolist(),
            "high": df["High"].tolist(),
            "low": df["Low"].tolist(),
            "close": close.tolist(),
            "volume": df["Volume"].tolist(),
        },
        "portfolio": {
            "stats": result["stats"],
            "trades": result["trades"],
            "equity_curve": result["equity_curve"],
            "returns": result["returns"],
            "drawdown": result["drawdown"],
        },
        "indicators": {
            "rsi": rsi_data,
            "macd": macd_data,
        },
        "signals": {
            "entries": result["entries"],
            "exits": result["exits"],
        },
    }

    # Add strategy-specific indicator data
    if request.strategy == "sma":
        response["indicators"]["sma"] = {
            "fast": result["fast_sma"],
            "slow": result["slow_sma"],
            "fast_window": request.fast_ma,
            "slow_window": request.slow_ma,
        }
    elif request.strategy == "ema":
        response["indicators"]["ema"] = {
            "fast": result["fast_ema"],
            "slow": result["slow_ema"],
            "fast_window": request.fast_ma,
            "slow_window": request.slow_ma,
        }
    elif request.strategy == "bollinger":
        response["indicators"]["bollinger"] = {
            "middle": result["middle"],
            "upper": result["upper"],
            "lower": result["lower"],
            "window": request.bb_window,
            "std": request.bb_std,
        }

    return response


# ── Endpoints ──────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.1.0"}


@app.get("/api/strategies")
async def list_strategies():
    """List available strategies and their default parameters."""
    return {
        "strategies": [
            {
                "id": "sma",
                "name": "SMA Crossover",
                "description": "Buy when fast SMA crosses above slow SMA",
                "params": {"fast_window": 10, "slow_window": 30},
            },
            {
                "id": "ema",
                "name": "EMA Crossover",
                "description": "Buy when fast EMA crosses above slow EMA",
                "params": {"fast_window": 12, "slow_window": 26},
            },
            {
                "id": "bollinger",
                "name": "Bollinger Bands",
                "description": "Mean reversion: buy at lower band, sell at upper band",
                "params": {"window": 20, "std": 2.0},
            },
        ]
    }


@app.post("/api/backtest")
async def backtest(request: BacktestRequest):
    """Run a backtest with the selected strategy and indicators."""
    try:
        # 1. Fetch data
        df = fetch_ohlcv(
            ticker=request.ticker,
            start=request.start_date,
            end=request.end_date,
            interval=request.interval,
        )

        close = df["Close"]

        # 2. Run selected strategy
        strategy_kwargs = _get_strategy_kwargs(request)
        strategy_kwargs["freq"] = request.interval
        result = run_strategy(request.strategy, close=close, **strategy_kwargs)

        # 3. Build response
        response = _build_backtest_response(df, result, request)
        return safe_json_response(response)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.post("/api/compare")
async def compare_strategies(request: BacktestRequest):
    """Run all strategies and return comparison results."""
    try:
        df = fetch_ohlcv(
            ticker=request.ticker,
            start=request.start_date,
            end=request.end_date,
            interval=request.interval,
        )

        close = df["Close"]
        dates = close.index.tolist()

        # Run all strategies with default params + user's fees/cash/freq
        comparison = run_all_strategies(
            close=close,
            fees=request.fees,
            init_cash=request.init_cash,
            freq=request.interval,
        )

        # Calculate indicators (same for all strategies)
        rsi_data = calculate_rsi(close, window=request.rsi_window)
        macd_data = calculate_macd(
            close=close,
            fast_window=request.macd_fast,
            slow_window=request.macd_slow,
            signal_window=request.macd_signal,
        )

        response = {
            "ticker": request.ticker,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "interval": request.interval,
            "data_points": len(df),
            "dates": dates,
            "ohlcv": {
                "open": df["Open"].tolist(),
                "high": df["High"].tolist(),
                "low": df["Low"].tolist(),
                "close": close.tolist(),
                "volume": df["Volume"].tolist(),
            },
            "indicators": {
                "rsi": rsi_data,
                "macd": macd_data,
            },
            "comparison": comparison,
        }

        return safe_json_response(response)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/ticker/{ticker}")
async def get_ticker_info(ticker: str):
    """Get basic ticker info and latest price."""
    try:
        df = fetch_ohlcv(ticker=ticker, start="2000-01-01", end="2030-12-31")
        return safe_json_response({
            "ticker": ticker,
            "latest_close": df["Close"].iloc[-1] if not df.empty else None,
            "data_points": len(df),
            "date_range": {
                "start": df.index[0].isoformat(),
                "end": df.index[-1].isoformat(),
            }
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/ticker/{ticker}/range")
async def get_ticker_range(ticker: str):
    """Get the earliest and latest available date for a ticker."""
    cache_key = f"range:{ticker.upper()}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        df = fetch_ohlcv(ticker=ticker, start="2000-01-01", end="2030-12-31")
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No data found for {ticker}")
        result = {
            "ticker": ticker,
            "earliest": df.index[0].isoformat(),
            "latest": df.index[-1].isoformat(),
            "data_points": len(df),
        }
        _set_cache(cache_key, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@app.get("/api/ticker/{ticker}/fundamentals")
async def get_ticker_fundamentals(ticker: str):
    """Get company fundamentals and valuation multiples."""
    cache_key = f"fundamentals:{ticker.upper()}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        import yfinance as yf
        stock = yf.Ticker(ticker)
        info = stock.info

        def safe(v):
            if v is None or v == "None":
                return None
            return v

        result = {
            "ticker": ticker,
            "company": {
                "name": safe(info.get("shortName")),
                "sector": safe(info.get("sector")),
                "industry": safe(info.get("industry")),
                "summary": safe(info.get("longBusinessSummary")),
            },
            "valuation": {
                "marketCap": safe(info.get("marketCap")),
                "enterpriseValue": safe(info.get("enterpriseValue")),
                "trailingPE": safe(info.get("trailingPE")),
                "forwardPE": safe(info.get("forwardPE")),
                "priceToBook": safe(info.get("priceToBook")),
                "enterpriseToEbitda": safe(info.get("enterpriseToEbitda")),
                "priceToSales": safe(info.get("priceToSalesTrailing12Months")),
            },
            "financials": {
                "revenuePerShare": safe(info.get("revenuePerShare")),
                "earningsPerShare": safe(info.get("trailingEps")),
                "profitMargins": safe(info.get("profitMargins")),
                "operatingMargins": safe(info.get("operatingMargins")),
                "returnOnEquity": safe(info.get("returnOnEquity")),
                "debtToEquity": safe(info.get("debtToEquity")),
                "currentRatio": safe(info.get("currentRatio")),
                "freeCashflow": safe(info.get("freeCashflow")),
                "revenueGrowth": safe(info.get("revenueGrowth")),
            },
            "trading": {
                "beta": safe(info.get("beta")),
                "dividendYield": safe(info.get("dividendYield")),
                "fiftyTwoWeekHigh": safe(info.get("fiftyTwoWeekHigh")),
                "fiftyTwoWeekLow": safe(info.get("fiftyTwoWeekLow")),
                "averageVolume": safe(info.get("averageVolume")),
            },
        }
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch fundamentals for {ticker}: {str(e)}")


# ── Options Flow Endpoints ────────────────────────────────────────────

@app.get("/api/ticker/{ticker}/options-flow")
async def get_options_flow(ticker: str):
    """
    Get full options chain analysis for a ticker:
    - Per-expiry call/put volumes, OI, volume/OI ratios
    - LEAPS (expiry > 1 year) highlighted separately
    - Unusual volume/OI spikes (vol/OI > 2x)
    - Call/Put volume ratio overall
    - Last 24h change data when available
    Cached for 5 minutes (options data doesn't change intra-minute).
    """
    cache_key = f"options-flow:{ticker.upper()}"
    cached = _cached(cache_key, ttl=300)
    if cached:
        return cached

    try:
        data = fetch_options_flow(ticker)
        _set_cache(cache_key, data)
        return safe_json_response(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Options data error for {ticker}: {str(e)}")


@app.get("/api/options-flow/leaps-board")
async def get_leaps_board(limit: int = 15):
    """
    Scan the top tickers by LEAPS (long-dated >1yr) options activity.
    Returns tickers ranked by total unusual + high-volume options flow.
    Useful for spotting which stocks have unusual long-dated options buying.
    Default scan set: 22 liquid US equities + ETFs.
    Set limit to control how many results returned (max 50).
    """
    import asyncio
    limit = max(1, min(limit, 50))
    try:
        # Run blocking yfinance calls in thread pool for concurrency
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(None, rank_single_ticker, sym)
            for sym in DEFAULT_SCAN_TICKERS
        ]
        results_raw = await asyncio.gather(*tasks, return_exceptions=True)
        ranked = [r for r in results_raw if isinstance(r, dict)]
        ranked.sort(
            key=lambda x: x.get("total_call_volume", 0) + x.get("total_put_volume", 0),
            reverse=True,
        )
        return safe_json_response({
            "count": len(ranked),
            "scan_tickers": DEFAULT_SCAN_TICKERS,
            "results": ranked[:limit],
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LEAPS board error: {str(e)}")


@app.get("/api/leaps/scanner")
async def leaps_scanner(max_tickers: int = 100, min_spikes: int = 1):
    """
    S&P 100 tabanlı LEAPS anomali tarama.
    Yakın zamanda yüksek miktarda LEAPS opsiyonu alınan hisseleri tespit eder.

    Parametreler:
        max_tickers: Taranacak maks ticker sayısı (varsayılan 100, max 100)
        min_spikes: Minimum anormal spike sayısı filtresi (varsayılan 1)

    Response:
        tickers: LEAPS anomali bulunan ticker'lar (hacme göre sıralı)
        scan_info: Tarama bilgisi (ticker sayısı, süre, zaman)
    """
    import time as _time
    max_tickers = max(1, min(max_tickers, 100))
    min_spikes = max(1, min_spikes)

    try:
        t0 = _time.time()
        results = scan_all_sp100_leaps(max_tickers=max_tickers)
        elapsed = round(_time.time() - t0, 1)

        # Min spike filtresi
        if min_spikes > 1:
            results = [r for r in results if r["unusual_count"] >= min_spikes]

        return safe_json_response({
            "tickers": results,
            "count": len(results),
            "scan_info": {
                "max_tickers": max_tickers,
                "min_spikes": min_spikes,
                "scan_time_sec": elapsed,
                "scanned_at": datetime.utcnow().isoformat(),
            },
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LEAPS scanner error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, timeout_keep_alive=300)
