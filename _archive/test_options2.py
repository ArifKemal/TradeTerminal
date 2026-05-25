"""Explore what 'abnormal options activity' means + yfinance options schema."""
import yfinance as yf
import pandas as pd
from datetime import datetime

print("=== Contract Symbol Format ===\n")
ticker = yf.Ticker("AAPL")
opts = ticker.options
today = datetime.today()

# Analyze all expiries to find LEAPS pattern and high-volume activities
print(f"All expiries for AAPL ({len(opts)} total):")
for i, exp in enumerate(opts):
    try:
        dt = datetime.strptime(exp, "%Y-%m-%d")
        days_out = (dt - today).days
        is_leaps = days_out > 365
        flag = " <<< LEAPS" if is_leaps else ""
        print(f"  {exp} ({days_out}d from now){flag}")
    except:
        print(f"  {exp} (parse error)")

# Fetch the farthest expiry for LEAPS analysis
if opts:
    far_exp = opts[-1]
    print(f"\n=== Far expiry chain: {far_exp} ===")
    chain = ticker.option_chain(far_exp)
    
    calls = chain.calls.copy()
    puts = chain.puts.copy()
    
    print(f"\nCalls: {len(calls)} rows")
    print(f"Puts:  {len(puts)} rows")
    
    # Unusual call activity: high volume vs OI call ratio > 2
    print("\n--- Top 10 calls by volume/oi ratio (> 2 = unusual) ---")
    calls_active = calls[calls['volume'] > 0].copy()
    calls_active['vol_oi_ratio'] = calls_active['volume'] / (calls_active['openInterest'] + 1)
    unusual_calls = calls_active[calls_active['vol_oi_ratio'] > 2].nlargest(10, 'volume')
    print(unusual_calls[['strike', 'volume', 'openInterest', 'vol_oi_ratio', 'impliedVolatility', 'contractSymbol']].to_string(index=False))
    
    # Unusual put activity: high volume vs OI put ratio > 2
    print("\n--- Top 10 puts by volume/oi ratio (> 2 = unusual) ---")
    puts_active = puts[puts['volume'] > 0].copy()
    puts_active['vol_oi_ratio'] = puts_active['volume'] / (puts_active['openInterest'] + 1)
    unusual_puts = puts_active[puts_active['vol_oi_ratio'] > 2].nlargest(10, 'volume')
    print(unusual_puts[['strike', 'volume', 'openInterest', 'vol_oi_ratio', 'impliedVolatility', 'contractSymbol']].to_string(index=False))
    
    # Overall option flow signal
    total_call_vol = calls['volume'].sum()
    total_put_vol = puts['volume'].sum()
    cpr = total_call_vol / (total_put_vol + 1)
    print(f"\nCall/Put Volume Ratio: {cpr:.2f} (higher = bullish)")
    print(f"Total Call Volume: {total_call_vol:,.0f}")
    print(f"Total Put  Volume: {total_put_vol:,.0f}")
    
    # Highest IV strikes (potential LEAPS)
    high_iv = calls.nlargest(5, 'impliedVolatility')[['strike', 'volume', 'openInterest', 'impliedVolatility', 'contractSymbol']]
    print(f"\n--- 5 highest IV calls ---")
    print(high_iv.to_string(index=False))
