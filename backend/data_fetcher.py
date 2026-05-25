"""
Data fetching module using yfinance.
Provides OHLCV data for given ticker and date range.
"""

import yfinance as yf
import pandas as pd
from datetime import datetime


def fetch_ohlcv(
    ticker: str,
    start: str,
    end: str,
    interval: str = "1d"
) -> pd.DataFrame:
    """
    Fetch OHLCV data from Yahoo Finance.

    Args:
        ticker: Stock/crypto ticker symbol (e.g., "AAPL", "BTC-USD")
        start: Start date in YYYY-MM-DD format
        end: End date in YYYY-MM-DD format
        interval: Data interval - "1m", "5m", "15m", "1h", "1d", "1wk", "1mo"

    Returns:
        pd.DataFrame with columns: Open, High, Low, Close, Volume
    """
    try:
        asset = yf.Ticker(ticker)
        df = asset.history(start=start, end=end, interval=interval)

        if df.empty:
            raise ValueError(f"No data found for {ticker} in range {start} to {end}")

        # Standardize column names
        df.index.name = "Date"
        df = df[["Open", "High", "Low", "Close", "Volume"]]

        # Remove timezone info from index for JSON compat
        if df.index.tz is not None:
            df.index = df.index.tz_localize(None)

        return df

    except Exception as e:
        raise RuntimeError(f"Failed to fetch data for {ticker}: {str(e)}")
