# TradeTerminal — Proje Dokümantasyonu

## Genel Bakış

TradeTerminal, VectorBT kütüphanesini temel alan, profesyonel trading terminallerinden ilham alan bir **finansal backtest ve opsiyon analiz platformudur**. Siyah zemin üzerine turuncu aksanlarla kurgulanmış terminal estetiğiyle, teknik göstergeleri test etmenizi ve sonuçları interaktif grafiklerle görmenizi sağlar.

## Teknoloji Yığını

| Katman | Teknoloji | Versiyon | Açıklama |
|--------|-----------|----------|----------|
| Frontend | Next.js | 16.2.6 | App Router, Turbopack |
| Frontend | React | 19.2.4 | UI framework |
| Frontend | TypeScript | 5 | Tip güvenliği |
| Frontend | Plotly.js | 2.35.0 | İnteraktif grafikler |
| Frontend | TailwindCSS | 4 | Styling |
| Backend | FastAPI | 0.104.1 | Python web framework |
| Backend | Python | 3.11+ | Backend dili |
| Backend | VectorBT | 0.26.2 | Backtest motoru |
| Backend | yfinance | 0.2.54 | Yahoo Finance veri kaynağı |
| Backend | Pandas | 2.2.3 | Veri manipülasyonu |
| Backend | NumPy | 1.26.4 | Sayısal hesaplama |
| Backend | Pydantic | 1.x | Validasyon |
| Deployment | Vercel | - | Frontend hosting |
| Deployment | Render | - | Backend hosting |

## Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    GitHub (Monorepo)                     │
│  ┌───────────────────┐    ┌──────────────────────────┐  │
│  │   frontend/       │    │      backend/            │  │
│  │   (Next.js)       │    │      (FastAPI)           │  │
│  └────────┬──────────┘    └───────────┬──────────────┘  │
└───────────┼───────────────────────────┼──────────────────┘
            │                           │
            ▼                           ▼
    ┌───────────────┐          ┌────────────────┐
    │    Vercel     │          │     Render     │
    │   (Frontend)  │◄────────►│    (Backend)   │
    └───────────────┘          └────────────────┘
```

### Frontend (Vercel)
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Build:** `npm run build`
- **Env:** `NEXT_PUBLIC_API_URL=https://tradeterminal-7aj1.onrender.com`
- **URL:** https://trade-terminal-vert.vercel.app

### Backend (Render)
- **Framework:** FastAPI 0.104.1
- **Build:** `pip install -r requirements.txt`
- **Start:** `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Env:** `FRONTEND_URL=https://trade-terminal-vert.vercel.app`
- **URL:** https://tradeterminal-7aj1.onrender.com

## Klasör Yapısı

```
tradeterminal/
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx             # Ana sayfa (Backtest / Compare / Options)
│   │   ├── layout.tsx           # Root layout (metadata, global CSS)
│   │   ├── globals.css          # Dark tema CSS değişkenleri
│   │   ├── api.ts               # Backend API client (tipler + fetch fonksiyonları)
│   │   └── components/
│   │       ├── BacktestForm.tsx      # Strateji + ticker + tarih formu
│   │       ├── PriceChart.tsx        # Candlestick/Line + overlay + sinyaller
│   │       ├── CandlestickChart.tsx  # Mum grafiği (Plotly)
│   │       ├── VolumeChart.tsx       # Hacim grafiği
│   │       ├── EquityChart.tsx       # Equity curve
│   │       ├── DrawdownChart.tsx     # Drawdown grafiği
│   │       ├── IndicatorChart.tsx    # RSI/MACD indikatör grafiği
│   │       ├── ComparePanel.tsx      # Strateji karşılaştırma
│   │       ├── FundamentalsPanel.tsx # Şirket çarpanları (P/E, P/B, vb.)
│   │       ├── OptionsFlowPanel.tsx  # Opsiyon akışı + LEAPS detay
│   │       └── TerminalHeader.tsx    # Terminal.AI başlık
│   ├── public/                  # Statik dosyalar
│   └── package.json
│
├── backend/                     # FastAPI Backend
│   ├── main.py                  # Endpoint'ler + CORS + Cache
│   ├── strategies.py            # SMA, EMA, Bollinger stratejileri + RSI, MACD
│   ├── data_fetcher.py          # yfinance OHLCV veri çekme
│   ├── encoder.py               # NaN/Inf/DateTime JSON serializer
│   ├── options_flow.py          # Tek hisse opsiyon zinciri analizi
│   ├── leaps_scanner.py         # S&P 100 concurrent LEAPS anomali tarama
│   ├── requirements.txt         # Python bağımlılıkları
│   └── start.sh                 # Başlatma scripti
│
├── .gitignore                   # Git ignore kuralları
└── README.md                    # Proje tanımı
```

## API Endpoint'ler

### Backtest & Analiz
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/strategies` | Strateji listesi |
| POST | `/api/backtest` | Backtest çalıştır |
| POST | `/api/compare` | Tüm stratejileri karşılaştır |
| GET | `/api/ticker/{ticker}` | Ticker bilgisi |
| GET | `/api/ticker/{ticker}/range` | Tarih aralığı (10dk cache) |
| GET | `/api/ticker/{ticker}/fundamentals` | Şirket çarpanları (10dk cache) |

### Opsiyon Akışı
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/ticker/{ticker}/options-flow` | Tek hisse opsiyon zinciri (5dk cache) |
| GET | `/api/options-flow/leaps-board` | 22 ticker LEAPS board |
| GET | `/api/leaps/scanner` | S&P 100 LEAPS anomali tarama |

## Veri Akışı

```
Kullanıcı → BacktestForm → page.tsx (handleBacktest)
  → api.ts (runBacktest) → FastAPI (/api/backtest)
    → strategies.py (run_strategy) → vectorbt
    → data_fetcher.py (fetch_ohlcv) → yfinance
    → JSON response → page.tsx → Plotly grafikler
```

## Özellikler

### 3 Strateji
- **SMA Crossover:** Hızlı SMA yavaş SMA'yı yukarı keserken al, aşağı keserken sat
- **EMA Crossover:** Hızlı EMA yavaş EMA'yı yukarı keserken al, aşağı keserken sat
- **Bollinger Bands:** Alt banda al, üst banda sat (mean reversion)

### İndikatörler
- **RSI:** Relative Strength Index (aşırı alım/satım seviyeleri)
- **MACD:** Moving Average Convergence Divergence

### Grafikler
- **Candlestick/Line:** Fiyat grafiği (toggle ile)
- **Volume:** İşlem hacmi
- **Equity Curve:** Portföy değer eğrisi
- **Drawdown:** Maksimum düşüş
- **RSI/MACD:** İndikatör grafikleri

### LEAPS Scanner
- S&P 100 ticker listesini concurrent tarar (~10 saniye)
- LEAPS = vade > 365 gün
- Anomali = volume/openInterest ≥ 2x
- Sonuçlar toplam LEAPS hacmine göre sıralı
- Satıra tıklayınca otomatik backtest

### Options Flow
- Tek hisse opsiyon zinciri analizi
- Per-expiry call/put volumes, OI, volume/OI ratios
- LEAPS vadeleri ayrı işaretlenmiş
- Anormal hacim/OI spike'ları (vol/OI ≥ 2x)

## Bilinen Sorunlar ve Çözümleri

### 1. vectorbt MACD — `histogram` attribute yok
**Hata:** `'MACD' object has no attribute 'histogram'`
**Çözüm:** `macd.histogram` yerine `macd.hist` kullanılmalı (vectorbt 0.26.2 API değişikliği).

### 2. vectorbt EMA yok
**Çözüm:** `close.ewm(span=N, adjust=False).mean()` ile pandas EMA, crossover manuel.

### 3. vectorbt BBANDS.run bug'li
**Çözüm:** `close.rolling(w).mean() + std()` ile manuel hesaplama.

### 4. Plotly TypeScript tipleri
**Hata:** `react-plotly.js` ile `plotly.js` versiyon mismatch
**Çözüm:** `// @ts-nocheck` ile TypeScript kontrolü bypass edildi.

### 5. pydantic-core Rust gerektiriyor
**Hata:** Render'da Rust toolchain yok, read-only filesystem
**Çözüm:** `pydantic>=1.10,<2` ile Rust'suz sürüm kullanıldı.

### 6. plotly.js 3.x `heatmapgl` desteklemiyor
**Hata:** vectorbt'nin template'inde `heatmapgl` tipi var ama plotly 3.x'de kaldırıldı
**Çözüm:** `plotly==5.24.1` sabit versiyonu kullanıldı.

## Geliştirme

### Gereksinimler
- Python 3.11+
- Node.js 20+

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# → http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### API Dokümantasyonu
Backend çalışırken: `http://localhost:8000/docs` (Swagger UI)

## Deployment

### Frontend (Vercel)
1. GitHub repo'yu importla
2. Root Directory: `frontend`
3. Environment: `NEXT_PUBLIC_API_URL=https://tradeterminal-7aj1.onrender.com`
4. Deploy

### Backend (Render)
1. New Web Service → GitHub repo
2. Root Directory: `backend`
3. Runtime: Python 3
4. Build: `pip install -r requirements.txt`
5. Start: `uvicorn main:app --host 0.0.0.0 --port 8000`
6. Environment: `FRONTEND_URL=https://trade-terminal-vert.vercel.app`

## CORS Yapılandırması

Backend'de `FRONTEND_URL` environment variable'ından okunur:
```python
_cors_origins = ["http://localhost:3000"]
_frontend_url = os.environ.get("FRONTEND_URL", "")
if _frontend_url:
    _cors_origins.append(_frontend_url)
```

## Cache Mekanizması

Backend'de 10 dakika TTL in-memory cache:
```python
_cache: dict = {}
_CACHE_TTL = 600  # 10 minutes
```

Options flow için 5 dakika cache:
```python
_cached = _cached(cache_key, ttl=300)
```

## Rate Limiting

- yfinance: IP bazlı ~2000 saatlik istek
- LEAPS Scanner: 100 ticker ~10 saniye
- Cache sayesinde tekrarlanan istekler sunucuya gitmez

## Güvenlik

- CORS: Sadece belirli origin'lere izin
- Environment değişkenleri: API key, URL gibi hassas bilgiler `.env` dosyasında
- Input validation: Pydantic modelleri ile

## Katkıda Bulunma

1. Fork'la
2. Feature branch oluştur (`git checkout -b feature/amazing-feature`)
3. Commit'le (`git commit -m 'Add amazing feature'`)
4. Push'la (`git push origin feature/amazing-feature`)
5. Pull Request aç

## Lisans

MIT License
