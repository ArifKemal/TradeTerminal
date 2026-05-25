# TradeTerminal — VectorBT Finansal Backtest Terminali

## Proje Özeti
VectorBT kütüphanesini temel alan, profesyonel trading terminallerinden ilham alan (dark theme, monospaced estetiği) bir finansal backtest ve analiz platformu. "TradeTerminal" markası altında siyah zemin üzerine beyaz/turuncu aksanlarla kurgulanmıştır. Opsiyon akışı (options flow) modülüyle LEAPS ve anormal opsiyon aktivitelerini izleme desteği mevcuttur.

## Teknik Mimari

### Backend (v1.1.0)
- **Framework:** FastAPI (Python) — Port 8000
- **Analiz Motoru:** vectorbt==0.26.2
- **Veri Kaynağı:** yfinance==1.3.0 (curl_cffi tabanlı)
- **Stratejiler:** SMA Crossover, EMA Crossover, Bollinger Bands
- **İndikatörler:** RSI, MACD
- **Sabitler:** init_cash=10000, fees=0.001 (arka planda)
- **Cache:** 10dk TTL in-memory cache (fundamentals + ticker range), 5dk options flow cache

### Frontend
- **Framework:** Next.js 16.2.6 (App Router, Turbopack) — Port 3000
- **CSS:** TailwindCSS v4
- **Grafik:** react-plotly.js ^2.6.0 + plotly.js ^3.5.1
- **Dil:** TypeScript, React 19

## Proje Dizin Yapısı
```
HERMES(deneme)/
├── AGENTS.md / GEMINI.md    # Proje bağlam dosyaları
├── backend/
│   ├── main.py              # FastAPI (v1.1.0) — endpoint'ler + cache
│   ├── strategies.py        # Stratejiler: sma, ema, bollinger + rsi, macd
│   ├── data_fetcher.py      # yfinance ile OHLCV veri çekme
│   ├── encoder.py           # NanEncoder — NaN/Inf/DateTime serializer
│   ├── options_flow.py      # Opsiyon akışı + LEAPS detay (tek hisse)
│   ├── leaps_scanner.py     # S&P 100 concurrent LEAPS anomali tarama
│   ├── requirements.txt, start.sh, .env
│   └── venv/                # Sanal ortam
└── frontend/
    ├── app/
    │   ├── page.tsx          # Ana sayfa — backtest + compare + options
    │   ├── layout.tsx        # Root layout (suppressHydrationWarning)
    │   ├── globals.css       # Dark tema CSS değişkenleri
    │   ├── api.ts            # Backend API client (options dahil)
    │   └── components/
    │       ├── BacktestForm.tsx      # Strateji + ticker + tarih (boş başlar)
    │       ├── FundamentalsPanel.tsx # Şirket çarpanları (P/E, P/B, vb.)
    │       ├── OptionsFlowPanel.tsx  # Opsiyon akışı + LEAPS detay
    │       ├── PriceChart.tsx        # Candlestick/Line + overlay + sinyaller
    │       ├── CandlestickChart.tsx, VolumeChart.tsx
    │       ├── EquityChart.tsx, DrawdownChart.tsx
    │       ├── IndicatorChart.tsx    # RSI/MACD
    │       ├── ComparePanel.tsx      # Strateji karşılaştırma
    │       └── TerminalHeader.tsx
    ├── AGENTS.md, CLAUDE.md
    └── package.json
```

## API Endpoint'ler

### Backtest & Analiz
- `GET /api/health` → `{"status":"ok","version":"1.1.0"}`
- `GET /api/strategies` → sma, ema, bollinger listesi
- `POST /api/backtest` → Strateji seçerek backtest. Parametreler: `strategy`, `fast_ma`, `slow_ma`, `bb_window`, `bb_std`, `rsi_window`, `macd_*`. Response: OHLCV + overlay + RSI/MACD + sinyaller + equity + drawdown.
- `POST /api/compare` → Tüm stratejileri karşılaştırır.
- `GET /api/ticker/{ticker}` → Ticker bilgisi
- `GET /api/ticker/{ticker}/range` → `{earliest, latest, data_points}` (10dk cache)
- `GET /api/ticker/{ticker}/fundamentals` → Şirket çarpanları (10dk cache)

### Opsiyon Akışı (Options Flow)
- `GET /api/ticker/{ticker}/options-flow` → Tek hisse opsiyon zinciri analizi
  - Per-expiry call/put volumes, OI, volume/OI ratios
  - LEAPS (vade > 365 gün) ayrı işaretlenmiş
  - Anormal hacim/OI spike'ları (vol/OI ≥ 2x)
  - Call/Put oranı
  - Cache: 5 dakika
  - Response: `{ ticker, as_of, has_leaps, leaps_expiries, summary, all_expiries, leaps, unusual_activities }`

- `GET /api/options-flow/leaps-board` → 22 ticker taraması, LEAPS aktivitesine göre sıralı (async concurrent)
  - Response: `{ count, scan_tickers, results: [{ ticker, has_leaps, leaps_count, total_call_volume, total_put_volume, call_put_ratio, unusual_count, top_leaps_expiry }] }`

- `GET /api/leaps/scanner` → **S&P 100 tabanlı LEAPS anomali tarama** (yeni!)
  - S&P 100 ticker listesini concurrent tarar (~100 hisse, ~10 saniye)
  - LEAPS opsiyonlarda volume/OI ≥ 2x anormal spike yakalar
  - Parametreler: `max_tickers` (1-100, varsayılan 100), `min_spikes` (varsayılan 1)
  - Response: `{ tickers: [{ ticker, total_leaps_call_vol, total_leaps_put_vol, total_leaps_vol, call_put_ratio, unusual_count, top_spike, all_spikes, leaps_expiries_count, nearest_leaps_expiry }], count, scan_info }`

## Mevcut Durum
- [x] **3 strateji:** SMA, EMA, Bollinger
- [x] RSI + MACD indikatörleri
- [x] Candlestick/Line toggle, Volume, Drawdown grafikleri
- [x] Strateji karşılaştırma (Compare All)
- [x] **Fundamentals paneli** — Market Cap, P/E, P/B, EV/EBITDA, ROE, Beta, vb.
- [x] Ticker yazınca direkt fundamentals + tarih aralığı (800ms debounce)
- [x] "All Time" butonu ile full range seçimi
- [x] Equity curve, pan/zoom modebar
- [x] 10dk backend cache (rate limit koruması)
- [x] Dark tema (TradeTerminal — siyah+turuncu)
- [x] **Options Flow modülü** — `options_flow.py` (yfinance tabanlı, tek hisse detay)
- [x] **LEAPS Scanner** — `leaps_scanner.py` (S&P 100 concurrent, ~10s)
- [x] **Options sekmesi** — Frontend'te LEAPS Scanner tablosu + per-ticker options flow
- [x] Backend + Frontend birlikte çalışıyor

## Bilinen Sorunlar ve Çözümler

### 1. vectorbt MACD — `histogram` → `hist`
**Dosya:** `backend/strategies.py` · Çözüm: `macd.histogram` yerine `macd.hist`.

### 2. vectorbt'de EMA yok
**Dosya:** `backend/strategies.py` → `run_ema_crossover()`
**Çözüm:** `close.ewm(span=N, adjust=False).mean()` ile pandas EMA, crossover manuel.

### 3. vectorbt BBANDS.run bug'li
**Dosya:** `backend/strategies.py` → `run_bollinger_bands()`
**Çözüm:** `close.rolling(w).mean() + std()` ile manuel hesaplama.

### 4. Port cakismasi (Windows/MSYS)
**Çözüm:** `cmd //c "taskkill /PID <PID> /F"` — start.sh otomatik temizler.

### 5. Dark Reader hydration
**Dosya:** `frontend/app/layout.tsx` → `<html suppressHydrationWarning>`.

### 6. yfinance eski surum → 0.2.43 → 1.3.0

### 7. Plotly TypeScript tip uyumsuzlukları
**Sorun:** `react-plotly.js` ile `plotly.js` versiyon mismatch → TS2769 hataları
**Durum:** Next.js Turbopack bunları ignore eder, runtime'da sorun çıkarmaz. Düşük öncelik.

## Options Flow Modülü Detayları

### `backend/options_flow.py` (tek hisse detay)
- `fetch_options_flow(ticker)` — Tek hisse tam opsiyon zinciri analizi
- `rank_single_ticker(sym)` — Tek hisse özet (LEAPS board için)
- `rank_tickers_by_leaps_activity(tickers)` — Çoklu ticker sıralama (senkron, fallback)
- `DEFAULT_SCAN_TICKERS` — 22 ticker statik liste

### `backend/leaps_scanner.py` (S&P 100 anomali tarama)
- `scan_ticker_leaps(sym)` — Tek ticker LEAPS tarama (vol/OI ≥ 2x)
- `scan_all_sp100_leaps(max_tickers)` — S&P 100 concurrent tarama (ThreadPoolExecutor, 10 worker)
- `SP100_TICKERS` — S&P 100 ticker listesi (~100 hisse)
- Sabitler: `LEAPS_MIN_DAYS=365`, `UNUSUAL_VOL_OI_MIN=2.0`, `MAX_WORKERS=10`

### `frontend/app/components/OptionsFlowPanel.tsx`
- Props: `ticker: string`
- KPI satırı: Call Vol, Put Vol, C/P Ratio, Expiries, LEAPS count
- Expiry breakdown: Her vade için açılır/kapanır kart (top calls/puts tablosu)
- Unusual Activity tablosu: vol/OI ≥ 2x olan sinyaller

### `frontend/app/api.ts` — Yeni tipler
- `OptionsFlowResponse`, `OptionsChainExpiry`, `OptionStrike`, `UnusualActivity`
- `LeapsBoardEntry`, `LeapsBoardResponse` (22 ticker board)
- `LeapsScannerEntry`, `LeapsScannerResponse` (S&P 100 scanner)
- Fonksiyonlar: `fetchOptionsFlow(ticker)`, `fetchLeapsBoard(limit)`, `fetchLeapsScanner(max_tickers, min_spikes)`

## Hizli Calistirma
```bash
cd backend && bash start.sh    # port 8000 (otomatik port temizliği)
cd frontend && npm run dev     # port 3000
```
