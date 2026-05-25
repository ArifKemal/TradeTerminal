#!/bin/bash
# SSL Sertifika Kurulumu (Let's Encrypt)
# Kullanım: ./setup-ssl.sh yourdomain.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Kullanım: ./setup-ssh.sh yourdomain.com"
    exit 1
fi

echo "SSL kurulumu başlıyor: $DOMAIN"

# Nginx config'i güncelle
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/nginx.conf

# HTTP server'ı comment out, HTTPS server'ı aktif et
sed -i 's/^    # server {/    server {/' nginx/nginx.conf
sed -i 's/^    #     listen 443/    listen 443/' nginx/nginx.conf
sed -i 's/^    #     ssl_certificate/    ssl_certificate/' nginx/nginx.conf
# ... (tüm comment'leri kaldır)

# Certbot ile sertifika al
docker run -it --rm \
    -v $(pwd)/certbot-webroot:/var/www/certbot \
    -v $(pwd)/certbot-certs:/etc/letsencrypt \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Nginx'i yeniden başlat
docker compose restart nginx

echo "SSL kurulumu tamamlandı!"
echo "https://$DOMAIN adresinden erişebilirsiniz."
