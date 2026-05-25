# Terminal.AI — Production Deployment

VectorBT tabanlı finansal backtest ve LEAPS opsiyon tarama platformu.

## Gereksinimler

- Docker >= 24.0
- Docker Compose >= 2.20
- Domain adı (SSL için)
- Sunucu: en az 1GB RAM, 1 vCPU

## Hızlı Kurulum

```bash
# 1. Projeyi klonla
git clone https://github.com/username/terminal-ai.git
cd HERMES(deneme)

# 2. Environment dosyasını oluştur
cp .env.example .env
# .env dosyasını domain'ine göre düzenle

# 3. Deploy et
chmod +x deploy.sh
./deploy.sh
```

## SSL Kurulumu (Opsiyonel ama önerilir)

```bash
# Domain'i DNS'de sunucu IP'sine yönlendirdikten sonra:
chmod +x setup-ssl.sh
./setup-ssl.sh yourdomain.com
```

## Komutlar

```bash
# Çalıştır
docker compose up -d

# Durdur
docker compose down

# Logları izle
docker compose logs -f

# Sadece backend/backend logları
docker compose logs -f backend
docker compose logs -f frontend

# Yeniden build & deploy
docker compose up -d --build

# Container durumu
docker compose ps
```

## Yapı

```
├── backend/          # FastAPI + vectorbt + yfinance
├── frontend/         # Next.js + React + Plotly
├── nginx/            # Reverse proxy + SSL
├── docker-compose.yml
├── deploy.sh
└── setup-ssl.sh
```

## Portlar

- 80  → Nginx (HTTP)
- 443 → Nginx (HTTPS, SSL aktifken)
- 3000 → Next.js (sadece internal)
- 8000 → FastAPI (sadece internal)

## Notlar

- Backend cache: 10 dakika (in-memory, container restart'ında temizlenir)
- LEAPS Scanner: S&P 100 taraması ~10 saniye
- yfinance rate limit: ~2000 saatlik istek (IP bazlı)
- SSL olmadan da çalışır (HTTP)
