# TradeTerminal — VectorBT Finansal Backtest Terminali

## Proje Özeti
VectorBT kütüphanesini temel alan, profesyonel trading terminallerinden ilham alan (dark theme, monospaced estetiği) bir finansal backtest ve analiz platformu. Kullanıcıların teknik göstergeleri (SMA, RSI, MACD) test etmesine ve sonuçları interaktif grafiklerle görmesine olanak tanır. "TradeTerminal" markası altında siyah zemin üzerine beyaz/turuncu aksanlarla kurgulanmıştır. Opsiyon akışı modülüyle LEAPS ve anormal opsiyon aktivitelerini izleme desteği mevcuttur.

## Teknik Mimari

### Backend (v1.1.0)
- **Framework:** FastAPI (Python)
- **Port:** 8000
- **Analiz Motoru:** vectorbt==0.26.2
- **Veri Kaynağı:** yfinance==1.3.0 (curl_cffi tabanlı)
- **Stratejiler:** SMA Crossover, EMA Crossover, Bollinger Bands
- **İndikatörler:** RSI, MACD
- **Sabitler:** init_cash=10000, fees=0.001 (arka planda)
- **Cache:** 10dk TTL in-memory cache (fundamentals + ticker range), 5dk options flow cache
- **Diğer:** pandas==2.2.3, numpy==1.26.4, pydantic==2.9.2
- **Çalıştırma:** `cd backend && bash start.sh`

### Frontend
- **Framework:** Next.js 16.2.6 (App Router, Turbopack)
- **Port:** 3000
- **CSS:** TailwindCSS v4
- **Grafik:** react-plotly.js ^2.6.0 + plotly.js ^3.5.1
- **Dil:** TypeScript, React 19
- **Çalıştırma:** `cd frontend && npm run dev`

## Proje Dizin Yapısı
```
HERMES(deneme)/
├── AGENTS.md / GEMINI.md    # Proje bağlam dosyaları
├── backend/
│   ├── main.py              # FastAPI (v1.1.0) — endpoint'ler + cache
│   ├── strategies.py        # Stratejiler: sma, ema, bollinger + rsi, macd
│   ├── data_fetcher.py      # yfinance ile OHLCV veri çekme
│   ├── encoder.py           # NanEncoder — NaN/Inf/DateTime serializer
│   ├── options_flow.py      # Opsiyon akışı (tek hisse detay)
│   ├── leaps_scanner.py     # S&P 100 concurrent LEAPS anomali tarama
│   ├── requirements.txt     # Python bağımlılıkları
│   ├── start.sh             # Başlatma scripti (port temizliği dahil)
│   └── venv/                # Sanal ortam
└── frontend/
    ├── app/
    │   ├── page.tsx          # Ana sayfa — backtest + compare + options
    │   ├── layout.tsx        # Root layout
    │   ├── globals.css       # Dark tema CSS değişkenleri
    │   ├── api.ts            # Backend API client
    │   └── components/
    │       ├── BacktestForm.tsx      # Parametre giriş formu
    │       ├── StatsPanel.tsx        # Portföy istatistik paneli
    │       ├── PriceChart.tsx        # Fiyat + overlay grafiği
    │       ├── CandlestickChart.tsx  # Mum grafiği
    │       ├── VolumeChart.tsx       # Hacim grafiği
    │       ├── EquityChart.tsx       # Equity curve grafiği
    │       ├── DrawdownChart.tsx     # Drawdown grafiği
    │       ├── IndicatorChart.tsx    # RSI/MACD indikatör grafiği
    │       ├── ComparePanel.tsx      # Strateji karşılaştırma
    │       ├── FundamentalsPanel.tsx # Şirket çarpanları
    │       ├── OptionsFlowPanel.tsx  # Opsiyon akışı detay
    │       └── TerminalHeader.tsx    # TradeTerminal başlık
    ├── AGENTS.md             # Next.js uyarısı
    ├── CLAUDE.md             # AGENTS.md referansı
    └── package.json          # Node.js bağımlılıkları
```

## API Endpoint'ler

### Backtest & Analiz
- `GET /api/health` → `{"status": "ok", "version": "1.1.0"}`
- `GET /api/strategies` → Mevcut stratejileri listeler
- `POST /api/backtest` → SMA Crossover backtest + RSI + MACD indikatörleri çalıştırır
- `POST /api/compare` → Tüm stratejileri karşılaştırır
- `GET /api/ticker/{ticker}` → Ticker bilgisi ve son fiyat
- `GET /api/ticker/{ticker}/range` → Tarih aralığı (10dk cache)
- `GET /api/ticker/{ticker}/fundamentals` → Şirket çarpanları (10dk cache)

### Opsiyon Akışı
- `GET /api/ticker/{ticker}/options-flow` → Tek hisse opsiyon zinciri analizi (5dk cache)
- `GET /api/options-flow/leaps-board` → 22 ticker LEAPS board (async concurrent)
- `GET /api/leaps/scanner?max_tickers=100&min_spikes=1` → S&P 100 LEAPS anomali tarama (~10s)

## Backtest Request/Response

**Request:**
```json
{
  "ticker": "AAPL",
  "start_date": "2024-01-01",
  "end_date": "2024-06-30",
  "interval": "1d",
  "fast_ma": 10,
  "slow_ma": 30,
  "fees": 0.001,
  "init_cash": 10000,
  "rsi_window": 14,
  "macd_fast": 12,
  "macd_slow": 26,
  "macd_signal": 9
}
```

**Response:** OHLCV verisi + portföy istatistikleri + trade log + SMA/RSI/MACD indikatör verileri + al/sat sinyalleri + equity curve + drawdown.

## Mevcut Durum
- [x] SMA Crossover stratejisi çalışıyor
- [x] EMA Crossover stratejisi çalışıyor
- [x] Bollinger Bands stratejisi çalışıyor
- [x] RSI ve MACD indikatörleri backend'de hesaplanıyor
- [x] Frontend'de tüm grafikler (fiyat, equity, RSI, MACD, volume, drawdown) gösteriliyor
- [x] Strateji karşılaştırma (Compare All)
- [x] Fundamentals paneli (Market Cap, P/E, P/B, EV/EBITDA, ROE, Beta)
- [x] Ticker değişince otomatik fundamentals + tarih aralığı (800ms debounce)
- [x] Options Flow modülü (tek hisse detay + LEAPS board + S&P 100 scanner)
- [x] Options sekmesi (LEAPS Scanner tablosu + per-ticker options flow)
- [x] Dark tema (TradeTerminal markası)
- [x] yfinance 1.3.0'a yükseltildi (curl_cffi tabanlı)
- [x] Backend + Frontend birlikte çalışıyor

## Bilinen Sorunlar ve Çözümler

### 1. vectorbt MACD — `histogram` attribute'ı yok
**Hata:** `'MACD' object has no attribute 'histogram'`
**Çözüm:** `macd.histogram` yerine `macd.hist` kullanılmalı (vectorbt 0.26.2 API değişikliği).
**Dosya:** `backend/strategies.py`

### 2. Port çakışması (Windows)
**Sorun:** Eski process kapatılmazsa port 8000 dolu kalır.
**Çözüm:** `start.sh` otomatik port temizliği yapar. Manuel: `cmd //c "taskkill /PID <PID> /F"`

### 3. Dark Reader hydration hatası
**Sorun:** Dark Reader eklentisi `<html>`'e attribute ekler, hydration uyuşmazlığı oluşur.
**Çözüm:** `<html lang="en" suppressHydrationWarning>` — layout.tsx'te eklendi.

### 4. yfinance eski sürüm
**Sorun:** yfinance 0.2.43 Yahoo Finance API'den veri çekemiyordu.
**Çözüm:** yfinance 1.3.0'a yükseltildi (curl_cffi tabanlı, Cloudflare bypass).

### 5. Plotly TypeScript tipleri
**Sorun:** `react-plotly.js` ile `plotly.js` versiyon mismatch → TS2769
**Durum:** Turbopack ignore eder, runtime sorun yok.

## LEAPS Scanner Detayı (`backend/leaps_scanner.py`)
- S&P 100 ticker listesini ~10 saniyede concurrent tarar
- LEAPS = vade > 365 gün
- Anomali = volume/openInterest ≥ 2x
- Sonuçlar toplam LEAPS hacmine göre sıralı
- Her ticker için en büyük spike + tüm spike'lar döner

## Yapılacaklar / Gelecek Özellikler
- [ ] Portföy optimizasyonu (çoklu ticker backtest)
- [ ] LEAPS Scanner sonuçlarını export (CSV)
- [ ] Canlı veri / WebSocket desteği
- [ ] Responsive mobil görünüm iyileştirmeleri
- [ ] Plotly TS tip düzeltmeleri

## Çalıştırma (Hızlı Başlangıç)
```bash
# Backend
cd backend && bash start.sh
# -> http://localhost:8000

# Frontend (ayrı terminal)
cd frontend && npm run dev
# -> http://localhost:3000
```
