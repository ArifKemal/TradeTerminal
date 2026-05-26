"""
Strategy module using vectorbt.
Implements SMA Crossover, EMA Crossover, Bollinger Bands, RSI, and MACD.
"""

import pandas as pd
import numpy as np
import vectorbt as vbt


def run_sma_crossover(
    close: pd.Series,
    fast_window: int = 10,
    slow_window: int = 30,
    fees: float = 0.001,
    init_cash: float = 10000.0,
    freq: str = "1D"
) -> dict:
    """Run SMA Crossover backtest using vectorbt."""
    fast_sma = vbt.MA.run(close, window=fast_window)
    slow_sma = vbt.MA.run(close, window=slow_window)

    entries = fast_sma.ma_crossed_above(slow_sma)
    exits = fast_sma.ma_crossed_below(slow_sma)

    portfolio = vbt.Portfolio.from_signals(
        close=close,
        entries=entries,
        exits=exits,
        init_cash=init_cash,
        fees=fees,
        freq=freq
    )

    stats = portfolio.stats()
    trades = portfolio.trades.records_readable
    equity_curve = portfolio.value()
    returns = portfolio.returns()
    drawdown = portfolio.drawdown()

    return {
        "stats": stats,
        "trades": trades,
        "equity_curve": equity_curve,
        "returns": returns,
        "drawdown": drawdown,
        "fast_sma": fast_sma.ma,
        "slow_sma": slow_sma.ma,
        "entries": entries,
        "exits": exits,
        "label": f"SMA({fast_window}/{slow_window})",
    }


def run_ema_crossover(
    close: pd.Series,
    fast_window: int = 12,
    slow_window: int = 26,
    fees: float = 0.001,
    init_cash: float = 10000.0,
    freq: str = "1D"
) -> dict:
    """Run EMA Crossover backtest using pandas EWM.

    Note: vectorbt 0.26.x doesn't export vbt.EMA directly,
    so we compute EMAs via pandas ewm() then detect crossovers manually.
    """
    fast_ema_series = close.ewm(span=fast_window, adjust=False).mean()
    slow_ema_series = close.ewm(span=slow_window, adjust=False).mean()

    entries = pd.Series(False, index=close.index)
    exits = pd.Series(False, index=close.index)

    for i in range(1, len(close)):
        f_prev, f_curr = fast_ema_series.iloc[i - 1], fast_ema_series.iloc[i]
        s_prev, s_curr = slow_ema_series.iloc[i - 1], slow_ema_series.iloc[i]
        if pd.isna(f_curr) or pd.isna(s_curr) or pd.isna(f_prev) or pd.isna(s_prev):
            continue
        if f_prev <= s_prev and f_curr > s_curr:
            entries.iloc[i] = True
        if f_prev >= s_prev and f_curr < s_curr:
            exits.iloc[i] = True

    portfolio = vbt.Portfolio.from_signals(
        close=close,
        entries=entries,
        exits=exits,
        init_cash=init_cash,
        fees=fees,
        freq=freq
    )

    stats = portfolio.stats()
    trades = portfolio.trades.records_readable
    equity_curve = portfolio.value()
    returns = portfolio.returns()
    drawdown = portfolio.drawdown()

    return {
        "stats": stats,
        "trades": trades,
        "equity_curve": equity_curve,
        "returns": returns,
        "drawdown": drawdown,
        "fast_ema": fast_ema_series,
        "slow_ema": slow_ema_series,
        "entries": entries,
        "exits": exits,
        "label": f"EMA({fast_window}/{slow_window})",
    }


def run_bollinger_bands(
    close: pd.Series,
    window: int = 20,
    std: float = 2.0,
    fees: float = 0.001,
    init_cash: float = 10000.0,
    freq: str = "1D"
) -> dict:
    """Run Bollinger Bands mean-reversion backtest using pandas.

    Note: vectorbt 0.26.x BBANDS.run has a parameter conflict,
    so we compute bands manually with pandas rolling.
    """
    import numpy as np

    rolling_mean = close.rolling(window=window).mean()
    rolling_std = close.rolling(window=window).std(ddof=0)

    middle = rolling_mean
    upper = rolling_mean + (rolling_std * std)
    lower = rolling_mean - (rolling_std * std)

    # Mean reversion signals
    entries = pd.Series(False, index=close.index)
    exits = pd.Series(False, index=close.index)

    for i in range(len(close)):
        if pd.isna(lower.iloc[i]) or pd.isna(upper.iloc[i]) or pd.isna(close.iloc[i]):
            continue
        if close.iloc[i] <= lower.iloc[i]:
            entries.iloc[i] = True
        if close.iloc[i] >= upper.iloc[i]:
            exits.iloc[i] = True

    portfolio = vbt.Portfolio.from_signals(
        close=close,
        entries=entries,
        exits=exits,
        init_cash=init_cash,
        fees=fees,
        freq=freq
    )

    stats = portfolio.stats()
    trades = portfolio.trades.records_readable
    equity_curve = portfolio.value()
    returns = portfolio.returns()
    drawdown = portfolio.drawdown()

    return {
        "stats": stats,
        "trades": trades,
        "equity_curve": equity_curve,
        "returns": returns,
        "drawdown": drawdown,
        "middle": middle,
        "upper": upper,
        "lower": lower,
        "entries": entries,
        "exits": exits,
        "label": f"Bollinger({window},{std})",
    }


# ── Strategy Registry ────────────────────────────────────────────────

STRATEGIES = {
    "sma": {
        "fn": run_sma_crossover,
        "name": "SMA Crossover",
        "params": {"fast_window": 10, "slow_window": 30},
    },
    "ema": {
        "fn": run_ema_crossover,
        "name": "EMA Crossover",
        "params": {"fast_window": 12, "slow_window": 26},
    },
    "bollinger": {
        "fn": run_bollinger_bands,
        "name": "Bollinger Bands",
        "params": {"window": 20, "std": 2.0},
    },
}


def run_strategy(
    strategy: str,
    close: pd.Series,
    **kwargs
) -> dict:
    """Run a named strategy with given parameters."""
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown strategy: {strategy}. Available: {list(STRATEGIES.keys())}")
    return STRATEGIES[strategy]["fn"](close=close, **kwargs)


def run_all_strategies(
    close: pd.Series,
    fees: float = 0.001,
    init_cash: float = 10000.0,
    freq: str = "1D"
) -> dict:
    """Run all strategies and return comparison results."""
    results = {}
    for name, cfg in STRATEGIES.items():
        try:
            result = cfg["fn"](
                close=close,
                fees=fees,
                init_cash=init_cash,
                freq=freq,
                **cfg["params"]
            )
            stats = result["stats"]
            results[name] = {
                "label": result["label"],
                "name": cfg["name"],
                "stats": stats,
                "equity_curve": result["equity_curve"],
                "returns": result["returns"],
                "drawdown": result["drawdown"],
                "trades": result["trades"],
            }
        except Exception as e:
            results[name] = {"label": cfg["name"], "error": str(e)}
    return results


# ── Indicators ───────────────────────────────────────────────────────

def calculate_rsi(
    close: pd.Series,
    window: int = 14
) -> dict:
    """Calculate RSI indicator."""
    rsi = vbt.RSI.run(close, window=window)
    return {
        "rsi": rsi.rsi,
        "overbought": 70,
        "oversold": 30,
        "window": window,
    }


def calculate_macd(
    close: pd.Series,
    fast_window: int = 12,
    slow_window: int = 26,
    signal_window: int = 9
) -> dict:
    """Calculate MACD indicator."""
    macd = vbt.MACD.run(
        close,
        fast_window=fast_window,
        slow_window=slow_window,
        signal_window=signal_window
    )
    return {
        "macd": macd.macd,
        "signal": macd.signal,
        "histogram": macd.hist,
        "fast_window": fast_window,
        "slow_window": slow_window,
        "signal_window": signal_window,
    }
