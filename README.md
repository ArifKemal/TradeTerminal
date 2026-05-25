<div align="center">

# ⚡ TradeTerminal

**VectorBT Finansal Backtest + LEAPS Opsiyon Scanner**

[Demo](https://tradeterminal.vercel.app) · [Hataları Bildir](https://github.com/ArifKemal/TradeTerminal/issues) · [Özellik İste](https://github.com/ArifKemal/TradeTerminal/issues)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

[Demo](https://tradeterminal.vercel.app) · [Hataları Bildir](https://github.com/ArifKemal/TradeTerminal/issues) · [Özellik İste](https://github.com/ArifKemal/TradeTerminal/issues)

</div>

---

## 📖 Hakkında

TradeTerminal, **VectorBT** kütüphanesini temel alan, profesyonel trading terminallerinden ilham alan bir **finansal backtest ve opsiyon analiz platformudur**. Siyah zemin üzerine turuncu aksanlarla kurgulanmış terminal estetiğiyle, teknik göstergeleri test etmenizi ve sonuçları interaktif grafiklerle görmenizi sağlar.

### Temel Özellikler

- **3 Strateji:** SMA Crossover, EMA Crossover, Bollinger Bands
- **İndikatörler:** RSI, MACD
- **Grafikler:** Candlestick, Volume, Equity Curve, Drawdown, RSI/MACD
- **Strateji Karşılaştırma:** Tüm stratejileri tek seferde karşılaştır
- **Fundamentals Paneli:** Market Cap, P/E, P/B, EV/EBITDA, ROE, Beta
- **Options Flow:** Tek hisse opsiyon zinciri analizi (LEAPS + anormal hacim/OI)
- **LEAPS Scanner:** S&P 100 concurrent taraması (~10 saniye), tıklanabilir satırlar

---

## 🏗️ Mimari

Bu proje **monorepo** yapısında olup **PaaS (Platform as a Service)** mimarisinde deploy edilmiştort.

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

### Frontend → Vercel
- **Root Directory:** `frontend/`
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Build Command:** `npm run build`
- **Output Directory:** `.next/`
- **Environment:** `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`

### Backend → Render
- **Root Directory:** `backend/`
- **Runtime:** Python 3.11
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Environment:** `FRONTEND_URL=https://your-frontend.vercel.app`

---

## 📁 Klasör Yapısı

```
tradeterminal/
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx             # Ana sayfa (Backtest / Compare / Options)
│   │   ├── layout.tsx           # Root layout
│   │   ├── globals.css          # Dark tema CSS
│   │   ├── api.ts               # Backend API client
│   │   └── components/
│   │       ├── BacktestForm.tsx
│   │       ├── PriceChart.tsx
│   │       ├── CandlestickChart.tsx
│   │       ├── VolumeChart.tsx
│   │       ├── EquityChart.tsx
│   │       ├── DrawdownChart.tsx
│   │       ├── IndicatorChart.tsx
│   │       ├── ComparePanel.tsx
│   │       ├── FundamentalsPanel.tsx
│   │       ├── OptionsFlowPanel.tsx
│   │       └── TerminalHeader.tsx
│   ├── public/
│   └── package.json
│
├── backend/                     # FastAPI Backend
│   ├── main.py                  # Endpoint'ler + CORS + Cache
│   ├── strategies.py            # SMA, EMA, Bollinger + RSI, MACD
│   ├── data_fetcher.py          # yfinance OHLCV
│   ├── encoder.py               # NaN/Inf/DateTime serializer
│   ├── options_flow.py          # Tek hisse opsiyon zinciri
│   ├── leaps_scanner.py         # S&P 100 LEAPS anomali tarama
│   ├── requirements.txt
│   └── start.sh
│
├── _archive/                    # Eski Docker deployment dosyaları
│   ├── docker-compose.yml
│   ├── nginx/
│   ├── deploy.sh
│   ├── setup-ssl.sh
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── DEPLOY.md
│
├── .gitignore                   # Kök + alt dizin ignore kuralları
├── AGENTS.md                    # Proje bağlam dosyası (AI agent'ları için)
├── GEMINI.md                    # Proje bağlam dosyası (Gemini için)
└── README.md                    # Bu dosya
```

---

## 🚀 Deploy Rehberi

### Frontend (Vercel)

1. [Vercel](https://vercel.com)'e GitHub hesabınla giriş yap
2. **Add New Project** → Repository'yi seç
3. **Root Directory:** `frontend` olarak ayarla
4. **Framework Preset:** Next.js
5. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```
6. **Deploy** butonuna tıkla

### Backend (Render)

1. [Render](https://render.com)'e giriş yap
2. **New +** → **Web Service**
3. GitHub repo'nu bağla
4. **Root Directory:** `backend` olarak ayarla
5. **Runtime:** Python 3
6. **Build Command:** `pip install -r requirements.txt`
7. **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
8. **Environment Variables:**
   ```
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
9. **Create Web Service** butonuna tıkla

### Environment Değişkenleri

| Değişken | Servis | Açıklama |
|-----------|--------|----------|
| `NEXT_PUBLIC_API_URL` | Frontend | Backend URL'si (örn: `https://tradeterminal-api.onrender.com`) |
| `FRONTEND_URL` | Backend | Frontend URL'si (CORS için, örn: `https://tradeterminal.vercel.app`) |

---

## 💻 Geliştirme

### Gereksinimler
- Python 3.11+
- Node.js 20+
- npm veya yarn

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

---

## 📡 API Endpoint'ler

### Backtest & Analiz
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/health` | Health check |
| GET | `/api/strategies` | Strateji listesi |
| POST | `/api/backtest` | Backtest çalıştır |
| POST | `/api/compare` | Tüm stratejileri karşılaştır |
| GET | `/api/ticker/{ticker}` | Ticker bilgisi |
| GET | `/api/ticker/{ticker}/range` | Tarih aralığı |
| GET | `/api/ticker/{ticker}/fundamentals` | Şirket çarpanları |

### Opsiyon Akışı
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/ticker/{ticker}/options-flow` | Tek hisse opsiyon zinciri |
| GET | `/api/options-flow/leaps-board` | 22 ticker LEAPS board |
| GET | `/api/leaps/scanner` | S&P 100 LEAPS anomali tarama |

---

## ⚠️ Bilinen Sorunlar

1. **vectorbt MACD:** `histogram` attribute'ı yok, `hist` kullanılıyor
2. **vectorbt EMA:** Yok, pandas `ewm()` ile manuel hesaplanıyor
3. **vectorbt BBANDS:** `.run()` bug'lı, pandas `rolling()` ile manuel
4. **Plotly TS tipleri:** Versiyon mismatch var ama Turbopack ignore ediyor
5. **yfinance rate limit:** IP bazlı, aşırı sorgu yapılmamalı

---

## 📄 Lisans

MIT License — Detaylar için [LICENSE](LICENSE) dosyasına bakın.

---

<div align="center">

**⭐ Beğendiyseniz yıldız vermeyi unutmayın!**

</div>
