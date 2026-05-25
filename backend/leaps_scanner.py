"""
LEAPS Scanner — S&P 100 tabanlı concurrent LEAPS anomali tarama.
Yakın zamanda yüksek miktarda LEAPS opsiyonu alınan hisseleri tespit eder.

Kaynak: yfinance (ücretsiz, ~15-20 dakika gecikmeli veri)
Strateji: S&P 100 ticker listesini concurrent tarayarak volume/OI > 2x LEAPS spike yakalar.
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional

# ── Constants ──────────────────────────────────────────────────────────

LEAPS_MIN_DAYS = 365          # Vade > 1 yıl = LEAPS
UNUSUAL_VOL_OI_MIN = 2.0      # volume/openInterest >= 2x = anormal
MAX_WORKERS = 10              # Concurrent thread sayısı
TIMEOUT_PER_TICKER = 15       # Ticker başına saniye timeout

# S&P 100 ticker listesi (OEX — 100 büyük hacimli hisse)
SP100_TICKERS = [
    "AAPL", "MSFT", "GOOGL", "GOOG", "AMZN", "NVDA", "TSLA", "META",
    "BRK-B", "JPM", "V", "JNJ", "WMT", "PG", "MA", "UNH", "HD", "DIS",
    "PYPL", "BAC", "XOM", "INTC", "VZ", "ADBE", "NFLX", "CRM", "CSCO",
    "PFE", "ABT", "ACN", "TMO", "AVGO", "DHR", "NKE", "TXN", "QCOM",
    "COST", "NEE", "LIN", "PM", "BMY", "HON", "UNP", "LOW", "IBM",
    "RTX", "SBUX", "AMD", "INTU", "GS", "CAT", "MDT", "AMGN", "BLK",
    "GILD", "ADI", "ISRG", "BKNG", "T", "PLTR", "NOW", "SPGI", "MO",
    "ELV", "SYK", "ZTS", "ADP", "MMC", "CB", "CI", "SO", "DUK",
    "BDX", "TMUS", "SCHW", "EOG", "REGN", "LRCX", "PGR", "APD", "CL",
    "SHW", "SLB", "ETN", "AON", "ITW", "BSX", "CME", "HUM", "MRNA",
    "ABNB", "ORLY", "ATVI", "MCO", "KLAC", "PANW", "SNPS", "CDNS",
    "FTNT", "NXPI", "ADM", "KDP", "MNST", "MCHP", "CTAS", "PAYX",
    "AEP", "EXC", "AZN", "LHX", "NOC", "STZ", "KHC", "MAR", "DXCM",
]


# ── Helpers ────────────────────────────────────────────────────────────

def _safe_ratio(num, den, default=0.0):
    if den == 0 or pd.isna(den):
        return default
    return float(num) / float(den)


def _is_leaps(expiry_date_str: str) -> bool:
    """Vade > 365 gün ise LEAPS."""
    try:
        dt = datetime.strptime(expiry_date_str, "%Y-%m-%d")
        return (dt - datetime.today()).days >= LEAPS_MIN_DAYS
    except ValueError:
        return False


def scan_ticker_leaps(sym: str) -> Optional[dict]:
    """
    Tek ticker tarama: LEAPS opsiyonlarda anormal hacim/OI spike ara.
    Sonuç bulunamazsa None döner.
    """
    try:
        stock = yf.Ticker(sym)
        expiry_dates = stock.options
        if not expiry_dates:
            return None

        # LEAPS vadelerini belirle
        leaps_expiries = [exp for exp in expiry_dates if _is_leaps(exp)]
        if not leaps_expiries:
            return None

        total_leaps_call_vol = 0
        total_leaps_put_vol = 0
        total_leaps_call_oi = 0
        total_leaps_put_oi = 0
        unusual_spikes = []

        for exp in leaps_expiries:
            try:
                chain = stock.option_chain(exp)
            except Exception:
                continue

            for is_call, df in [(True, chain.calls), (False, chain.puts)]:
                if df.empty:
                    continue

                active = df[df["volume"] > 0].copy()
                if active.empty:
                    continue

                # Volume/OI ratio hesapla
                active["vol_oi"] = active.apply(
                    lambda r: _safe_ratio(r.get("volume", 0), r.get("openInterest", 0)),
                    axis=1,
                )

                # Toplam hacim/OI
                vol_sum = int(active["volume"].sum())
                oi_sum = int(active["openInterest"].sum())
                if is_call:
                    total_leaps_call_vol += vol_sum
                    total_leaps_call_oi += oi_sum
                else:
                    total_leaps_put_vol += vol_sum
                    total_leaps_put_oi += oi_sum

                # Anormal spike'lar: vol/OI >= threshold
                spikes = active[active["vol_oi"] >= UNUSUAL_VOL_OI_MIN]
                for _, row in spikes.iterrows():
                    unusual_spikes.append({
                        "type": "LEAPS CALL" if is_call else "LEAPS PUT",
                        "expiry": exp,
                        "strike": float(row.get("strike", 0)),
                        "volume": int(row.get("volume", 0)),
                        "openInterest": int(row.get("openInterest", 0)),
                        "vol_oi_ratio": round(float(row.get("vol_oi", 0)), 1),
                        "lastPrice": float(row.get("lastPrice", 0)) if pd.notna(row.get("lastPrice")) else 0,
                        "impliedVolatility": round(float(row.get("impliedVolatility", 0)), 4) if pd.notna(row.get("impliedVolatility")) else 0,
                        "signal": "BULLISH" if is_call else "BEARISH",
                    })

        if not unusual_spikes:
            return None

        # Özet hesapla
        total_vol = total_leaps_call_vol + total_leaps_put_vol
        cp_ratio = _safe_ratio(total_leaps_call_vol, total_leaps_put_vol)

        # En büyük spike'ı bul
        top_spike = max(unusual_spikes, key=lambda x: x["volume"])

        return {
            "ticker": sym,
            "total_leaps_call_vol": total_leaps_call_vol,
            "total_leaps_put_vol": total_leaps_put_vol,
            "total_leaps_vol": total_vol,
            "call_put_ratio": round(cp_ratio, 2),
            "unusual_count": len(unusual_spikes),
            "top_spike": top_spike,
            "all_spikes": unusual_spikes[:10],  # Max 10 spike
            "leaps_expiries_count": len(leaps_expiries),
            "nearest_leaps_expiry": leaps_expiries[0] if leaps_expiries else None,
            "scan_time": datetime.utcnow().isoformat(),
        }

    except Exception:
        return None


def scan_all_sp100_leaps(max_tickers: int = 100) -> list[dict]:
    """
    S&P 100 ticker listesini concurrent tarayarak LEAPS anomali bulur.
    Sonuçları toplam LEAPS hacmine göre sıralı döndürür.

    Parametre:
        max_tickers: Taranacak maks ticker sayısı (varsayılan 100, S&P 100)

    Dönüş:
        list[dict]: LEAPS anomali bulunan ticker'lar, hacme göre sıralı
    """
    tickers = SP100_TICKERS[:max_tickers]
    results = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_sym = {
            executor.submit(scan_ticker_leaps, sym): sym
            for sym in tickers
        }
        for future in as_completed(future_to_sym, timeout=120):
            try:
                result = future.result(timeout=TIMEOUT_PER_TICKER)
                if result is not None:
                    results.append(result)
            except Exception:
                continue

    # Toplam LEAPS hacmine göre sırala
    results.sort(key=lambda x: x["total_leaps_vol"], reverse=True)
    return results
