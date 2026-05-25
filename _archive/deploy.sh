#!/bin/bash
# Terminal.AI Deploy Script
# Kullanım: ./deploy.sh

set -e

echo "========================================="
echo "  Terminal.AI Deployment"
echo "========================================="

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Dizin kontrol
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}Hata: docker-compose.yml bulunamadı!${NC}"
    echo "Lütfen proje kök dizininde çalıştırın."
    exit 1
fi

# SSL dizinleri oluştur
mkdir -p nginx/ssl

# Güncel kodu çek (git kullanıyorsan)
if [ -d ".git" ]; then
    echo -e "${YELLOW}Güncel kod çekiliyor...${NC}"
    git pull origin main 2>/dev/null || true
fi

# Docker Compose ile build & deploy
echo -e "${YELLOW}Container'lar build ediliyor...${NC}"
docker compose build --no-cache

echo -e "${YELLOW}Container'lar başlatılıyor...${NC}"
docker compose up -d

# Health check
echo -e "${YELLOW}Health check...${NC}"
sleep 5

if curl -sf http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}Backend: OK${NC}"
else
    echo -e "${RED}Backend: FAIL${NC}"
fi

if curl -sf http://localhost > /dev/null 2>&1; then
    echo -e "${GREEN}Frontend: OK${NC}"
else
    echo -e "${RED}Frontend: FAIL${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  Deployment tamamlandı!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Logları izle:  docker compose logs -f"
echo "Durdur:        docker compose down"
echo "Yeniden başlat: docker compose restart"
