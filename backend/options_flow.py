"""
Options flow and unusual activity module.
Provides LEAPS detection, call/put ratio, and unusual volume analysis
via yfinance option chain data.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional

# ── Constants ──────────────────────────────────────────────────────────

LEAPS_MIN_DAYS = 365          # Expiry > 1 year = LEAPS
UNUSUAL_VOL_OI_THRESHOLD = 2.0  # volume / openInterest threshold for unusual activity
CPR_BULLISH = 3.0             # Call/Put ratio above this = bullish
CPR_BEARISH = 0.33            # Call/Put ratio below this = bearish

# Tickers to scan for the top LEAPS movers board
DEFAULT_SCAN_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META",
    "SPY", "QQQ", "IWM", "AMD", "INTC", "PLTR", "COIN",
    "JPM", "BAC", "GS", "JNJ", "PFE", "UNH", "XOM", "CVX",
]


# ── Helpers ────────────────────────────────────────────────────────────

def _safe_ratio(num, den, default=0.0):
    """Avoid division by zero."""
    if den == 0 or pd.isna(den):
        return default
    return float(num) / float(den)


def _detect_leaps(expiry_dates: list[str]) -> list[str]:
    """Filter expiries that are LEAPS-range (> 365 days out)."""
    today = datetime.today()
    leaps = []
    for exp in expiry_dates:
        try:
            dt = datetime.strptime(exp, "%Y-%m-%d")
            if (dt - today).days >= LEAPS_MIN_DAYS:
                leaps.append(exp)
        except ValueError:
            continue
    return leaps


def _analyze_chain(
    calls: pd.DataFrame,
    puts: pd.DataFrame,
    expiry: str,
    is_leaps: bool = False,
) -> dict:
    """Analyze a single option chain (calls + puts) for one expiry."""
    result = {
        "expiry": expiry,
        "is_leaps": is_leaps,
        "total_call_volume": 0,
        "total_put_volume": 0,
        "total_call_oi": 0,
        "total_put_oi": 0,
        "call_put_ratio": 0.0,
        "top_calls": [],
        "top_puts": [],
        "unusual_calls": [],
        "unusual_puts": [],
    }

    # --- Calls ---
    active_calls = calls[calls["volume"] > 0].copy()
    if not active_calls.empty:
        active_calls["vol_oi_ratio"] = active_calls.apply(
            lambda r: _safe_ratio(r["volume"], r["openInterest"]), axis=1
        )
        result["total_call_volume"] = int(calls["volume"].sum())
        result["total_call_oi"] = int(calls["openInterest"].sum())
        # Top calls by volume
        top = active_calls.nlargest(5, "volume")[
            ["strike", "lastPrice", "volume", "openInterest",
             "vol_oi_ratio", "impliedVolatility", "inTheMoney", "contractSymbol"]
        ]
        result["top_calls"] = _rows_to_dicts(top)
        # Unusual: vol_oi_ratio > threshold
        unusual = active_calls[active_calls["vol_oi_ratio"] >= UNUSUAL_VOL_OI_THRESHOLD].nlargest(10, "volume")
        result["unusual_calls"] = _rows_to_dicts(unusual)

    # --- Puts ---
    active_puts = puts[puts["volume"] > 0].copy()
    if not active_puts.empty:
        active_puts["vol_oi_ratio"] = active_puts.apply(
            lambda r: _safe_ratio(r["volume"], r["openInterest"]), axis=1
        )
        result["total_put_volume"] = int(puts["volume"].sum())
        result["total_put_oi"] = int(puts["openInterest"].sum())
        top = active_puts.nlargest(5, "volume")[
            ["strike", "lastPrice", "volume", "openInterest",
             "vol_oi_ratio", "impliedVolatility", "inTheMoney", "contractSymbol"]
        ]
        result["top_puts"] = _rows_to_dicts(top)
        unusual = active_puts[active_puts["vol_oi_ratio"] >= UNUSUAL_VOL_OI_THRESHOLD].nlargest(10, "volume")
        result["unusual_puts"] = _rows_to_dicts(unusual)

    # Overall call/put ratio
    result["call_put_ratio"] = _safe_ratio(
        result["total_call_volume"], result["total_put_volume"]
    )
    return result


def _rows_to_dicts(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame rows to list of dicts with safe JSON types."""
    records = []
    if df.empty:
        return records
    for _, row in df.iterrows():
        rec = {}
        for col in df.columns:
            val = row[col]
            if isinstance(val, (pd.Timestamp,)):
                rec[col] = val.isoformat()
            elif isinstance(val, (np.integer,)):
                rec[col] = int(val)
            elif isinstance(val, (np.floating,)):
                rec[col] = float(val)
            elif pd.isna(val):
                rec[col] = None
            else:
                rec[col] = val
        records.append(rec)
    return records


# ── Public API ─────────────────────────────────────────────────────────

def fetch_options_flow(ticker: str) -> dict:
    """
    Fetch full options flow data for a ticker:
    - All expiries (near and far)
    - LEAPS highlighted
    - Unusual volume/OI spikes
    - Call/Put volume ratio

    Returns a structured dict for JSON response.
    """
    try:
        stock = yf.Ticker(ticker)
        expiry_dates = stock.options
        if not expiry_dates:
            raise ValueError(f"No options data available for {ticker}")

        has_leaps = False
        leaps_expiries = _detect_leaps(expiry_dates)
        if leaps_expiries:
            has_leaps = True

        all_expiries_data = []
        unusual_activities = []
        leaps_data = []

        for i, exp in enumerate(expiry_dates):
            is_leaps_flag = exp in leaps_expiries
            chain = stock.option_chain(exp)
            expiry_info = _analyze_chain(
                chain.calls, chain.puts, expiry=exp, is_leaps=is_leaps_flag
            )

            if is_leaps_flag:
                leaps_data.append(expiry_info)
                # Mark highest volume/vol_oi strikes as unusual
                for uc in expiry_info.get("unusual_calls", []):
                    uc["expiry"] = exp
                    uc["type"] = "leaps_call"
                    uc["signal"] = "BULLISH"
                    unusual_activities.append(uc)
                for up in expiry_info.get("unusual_puts", []):
                    up["expiry"] = exp
                    up["type"] = "leaps_put"
                    up["signal"] = "BEARISH"
                    unusual_activities.append(up)

            all_expiries_data.append(expiry_info)

        # Sort unusual activities by volume descending
        unusual_activities.sort(key=lambda x: x.get("volume", 0), reverse=True)
        unusual_activities = unusual_activities[:20]  # cap at 20

        # Compute summary using the NEAREST expiry as primary
        nearest = all_expiries_data[0] if all_expiries_data else {}
        total_callVol = sum(e["total_call_volume"] for e in all_expiries_data)
        total_putVol = sum(e["total_put_volume"] for e in all_expiries_data)

        return {
            "ticker": ticker,
            "as_of": datetime.utcnow().isoformat(),
            "has_leaps": has_leaps,
            "leaps_expiries": leaps_expiries,
            "summary": {
                "total_call_volume": total_callVol,
                "total_put_volume": total_putVol,
                "call_put_ratio": round(_safe_ratio(total_callVol, total_putVol), 2),
                "total_expiries": len(expiry_dates),
                "nearest_call_put_ratio": nearest.get("call_put_ratio", 0.0),
                "unusual_count": len(unusual_activities),
            },
            "all_expiries": all_expiries_data,
            "leaps": leaps_data,
            "unusual_activities": unusual_activities,
        }

    except ValueError:
        raise
    except Exception as e:
        raise RuntimeError(f"Failed to fetch options data for {ticker}: {str(e)}")


def rank_single_ticker(sym: str) -> dict | None:
    """Fetch options flow for a single ticker, returning a compact summary dict."""
    try:
        data = fetch_options_flow(sym)
        summary = data["summary"]
        return {
            "ticker": sym,
            "has_leaps": data["has_leaps"],
            "leaps_count": len(data["leaps"]),
            "total_call_volume": summary["total_call_volume"],
            "total_put_volume": summary["total_put_volume"],
            "call_put_ratio": summary["call_put_ratio"],
            "nearest_call_put_ratio": summary["nearest_call_put_ratio"],
            "unusual_count": summary["unusual_count"],
            "top_leaps_expiry": data["leaps_expiries"][-1] if data["leaps_expiries"] else None,
        }
    except Exception:
        return None


def rank_tickers_by_leaps_activity(tickers: list[str]) -> list[dict]:
    """
    Scan multiple tickers and rank them by options flow activity.
    Returns list of {ticker, leaps_count, leaps_call_vol, leaps_put_vol, call_put_ratio, top_leaps_expiry}
    sorted by total unusual activity.
    """
    results = []
    for sym in tickers:
        try:
            data = fetch_options_flow(sym)
            summary = data["summary"]

            results.append({
                "ticker": sym,
                "has_leaps": data["has_leaps"],
                "leaps_count": len(data["leaps"]),
                "total_call_volume": summary["total_call_volume"],
                "total_put_volume": summary["total_put_volume"],
                "call_put_ratio": summary["call_put_ratio"],
                "nearest_call_put_ratio": summary["nearest_call_put_ratio"],
                "unusual_count": summary["unusual_count"],
                "top_leaps_expiry": data["leaps_expiries"][-1] if data["leaps_expiries"] else None,
            })
        except Exception:
            # Skip tickers with no options data
            continue

    # Sort by total call volume + put volume descending
    results.sort(key=lambda x: x.get("total_call_volume", 0) + x.get("total_put_volume", 0), reverse=True)
    return results
