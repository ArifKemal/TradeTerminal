FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Hugging Face Spaces uses port 7860
EXPOSE 7860

# Pre-warm Numba JIT on startup
RUN python -c "import pandas as pd; import numpy as np; import vectorbt as vbt; dates = pd.date_range('2024-01-01', periods=100, freq='D'); close = pd.Series(np.random.randn(100).cumsum() + 100, index=dates); fast = vbt.MA.run(close, window=5); slow = vbt.MA.run(close, window=10); entries = fast.ma_crossed_above(slow); exits = fast.ma_crossed_below(slow); pf = vbt.Portfolio.from_signals(close, entries, exits); print(f'Pre-warmup done. Sharpe: {pf.sharpe_ratio():.2f}')"

# Run with uvicorn on port 7860 (HF Spaces default)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
