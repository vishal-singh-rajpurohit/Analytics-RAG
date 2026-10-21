#!/usr/bin/env bash
set -e

DOMAIN=$1
EMAIL=$2
STAGING=${3:-0} # Set to 1 for testing against Let's Encrypt staging servers

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "================================================================="
    echo "Error: Missing required arguments."
    echo "Usage:   ./init-letsencrypt.sh <domain> <email> [staging (0 or 1)]"
    echo "Example: ./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 0"
    echo "================================================================="
    exit 1
fi

RSA_KEY_SIZE=4096
DATA_PATH="./certbot"

echo "### Checking existing certificates for $DOMAIN ..."
if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
    read -p "Existing data found for $DOMAIN. Continue and replace certificate? (y/N) " decision
    if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
        exit 0
    fi
fi

# Ensure directories exist
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
mkdir -p "$DATA_PATH/www"

echo "### Creating dummy certificate for $DOMAIN so Nginx can start ..."
DUMMY_PATH="/etc/letsencrypt/live/$DOMAIN"
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout '$DUMMY_PATH/privkey.pem' \
    -out '$DUMMY_PATH/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Generating Nginx SSL configuration from template ..."
sed "s/\${DOMAIN}/$DOMAIN/g" ./nginx/nginx.ssl.conf.template > ./nginx/nginx.conf

echo "### Starting Nginx container ..."
docker compose -f docker-compose.prod.yml up --force-recreate -d nginx

echo "### Deleting dummy certificate for $DOMAIN ..."
docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting real Let's Encrypt certificate for $DOMAIN ..."
# Staging argument for testing to avoid rate limits
STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
    STAGING_ARG="--staging"
    echo "--> Running in STAGING mode (test certificate, will not be valid in browser)"
fi

# Build domain arguments: add www for apex domains (example.com), omit for subdomains (analytics.example.com)
DOMAIN_ARGS="-d $DOMAIN"
DOT_COUNT=$(echo "$DOMAIN" | tr -cd '.' | wc -c)
if [ "$DOT_COUNT" -eq 1 ]; then
    DOMAIN_ARGS="$DOMAIN_ARGS -d www.$DOMAIN"
fi

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email '$EMAIL' \
    $DOMAIN_ARGS \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

echo "### Reloading Nginx with the new SSL certificate ..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "================================================================="
echo " SSL Certificate issued successfully for $DOMAIN!"
echo " Automatic renewal is handled by the certbot container."
echo " You can now access https://$DOMAIN in your browser!"
echo "================================================================="
