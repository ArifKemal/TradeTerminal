"""Test if yfinance has options support and can detect unusual options activity."""
import yfinance as yf
import pandas as pd

print("=== yfinance Options Support Test ===\n")

# Test AAPL options
ticker = yf.Ticker("AAPL")
try:
    opts = ticker.options
    print(f"AAPL Option expiry dates available: {len(opts)}")
    if opts:
        print(f"  Nearest expiry: {opts[0]}, Farthest: {opts[-1]}")
        
        chain = ticker.option_chain(opts[0])
        print(f"\n  Calls columns: {list(chain.calls.columns)}")
        print(f"  Puts  columns: {list(chain.puts.columns)}")
        
        print("\n  --- Top 5 Calls by volume ---")
        top_calls = chain.calls.nlargest(5, 'volume')[['strike', 'lastPrice', 'volume', 'openInterest', 'impliedVolatility', 'contractSymbol']]
        print(top_calls.to_string(index=False))
        
        print("\n  --- Top 5 Puts by volume ---")
        top_puts = chain.puts.nlargest(5, 'volume')[['strike', 'lastPrice', 'volume', 'openInterest', 'impliedVolatility', 'contractSymbol']]
        print(top_puts.to_string(index=False))
except Exception as e:
    print(f"AAPL options error: {e}")

# Test multiple tickers for LEAPS (far OTM calls can be LEAPS proxy)
print("\n\n=== Multi-ticker Options Test (LEAPS focus) ===\n")
for sym in ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'SPY', 'AMZN']:
    try:
        t = yf.Ticker(sym)
        o = t.options
        if o:
            # Find far-dated expiry (more than 6 months out = potential LEAPS)
            from datetime import datetime
            today = datetime.today()
            far_expiries = [
                exp for exp in o
                if (datetime.strptime(exp, '%Y-%m-%d') - today).days > 180
            ]
            print(f"{sym}: {len(o)} expiries, {len(far_expiries)} LEAPS-range (>6mo)")
            
            # If far expiries exist, check call volume
            if far_expiries:
                far_chain = t.option_chain(far_expiries[0])
                total_call_vol = far_chain.calls['volume'].sum()
                total_put_vol = far_chain.puts['volume'].sum()
                print(f"  Far expiry {far_expiries[0]}: call_vol={total_call_vol}, put_vol={total_put_vol}")
        else:
            print(f"{sym}: No options data")
    except Exception as e:
        print(f"{sym}: Error - {e}")
