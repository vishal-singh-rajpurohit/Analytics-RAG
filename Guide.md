# Syntropic Analytics — Production Deployment & Operations Guide

A comprehensive, production-grade guide to containerizing the **Syntropic Analytics Platform**, automating tests and deployment with **GitHub Actions CI/CD**, provisioning an **AWS Ubuntu EC2** server, and securing traffic with **SSL certificates via Let's Encrypt, Certbot, and an automated shell script (`init-letsencrypt.sh`)**.

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Docker Containerization Architecture](#2-docker-containerization-architecture)
3. [GitHub Actions CI/CD Explained](#3-github-actions-cicd-explained)
4. [Git Repository Setup & Branching Strategy](#4-git-repository-setup--branching-strategy)
5. [AWS Ubuntu EC2 Setup (Step-by-Step)](#5-aws-ubuntu-ec2-setup-step-by-step)
6. [Domain & DNS Configuration](#6-domain--dns-configuration)
7. [Automated SSL with Certbot & init-letsencrypt.sh](#7-automated-ssl-with-certbot--init-letsencryptsh)
8. [Deploying with Docker Compose](#8-deploying-with-docker-compose)
9. [Automating Continuous Deployment (CD) with GitHub Actions](#9-automating-continuous-deployment-cd-with-github-actions)
10. [Maintenance, Backups & Troubleshooting](#10-maintenance-backups--troubleshooting)

---

## 1. Architecture Overview

The Syntropic Analytics Platform consists of five core tiers:

```
                  [ Internet Users / Browsers ]
                                |
                   (HTTPS :443 / HTTP :80)
                                |
                  [ Nginx Reverse Proxy / SSL ]
                     |                     |
         (Path: /)   |                     |   (Path: /api/*)
                     v                     v
          [ Next.js Frontend ]   [ FastAPI Backend Engine ]
             (Port 3000)             (Port 8000, 4 Workers)
                                           |
                               +-----------+-----------+
                               |                       |
                               v                       v
                     [ PostgreSQL + pgvector ]     [ Redis Cache ]
                           (Port 5432)               (Port 6379)
```

- **Frontend (`client/`)**: Next.js 16 (App Router), Tailwind CSS v4, Lucide icons, NextAuth.js authentication.
- **Backend (`Server/`)**: FastAPI, LangGraph multi-agent execution pipeline (Cleaner, Analyst, Visualizer, Sandbox), Taskiq.
- **Vector Database (`db`)**: PostgreSQL 17 with `pgvector` extension for embeddings and metadata storage.
- **Cache & Message Broker (`redis`)**: Redis Alpine with append-only persistence.
- **Reverse Proxy & SSL (`nginx` + `certbot`)**: High-performance HTTP/2 reverse proxy, Gzip compression, WebSockets support, Let's Encrypt SSL termination, and automated renewal.

---

## 2. Docker Containerization Architecture

The project includes purpose-built Docker configurations for development and production:

### Compose Files
| File | Environment | Purpose |
| :--- | :--- | :--- |
| `docker-compose.prod.yml` | **Production & Testing** | Multi-worker production stack with Nginx, Certbot SSL automation, and a dedicated `--profile test` runner for CI/CD test execution. |
| `docker-compose.yml` | **Production Full Stack** | Orchestrates Frontend, Backend, Postgres (pgvector), Redis, Nginx reverse proxy, and Certbot. |
| `docker-compose.dev.yml` | **Local Development** | Fast hot-reloading with host volume mounting for real-time code changes. |

### Volume Management
- `pgdata_prod`: Persistent storage for PostgreSQL databases and vector tables.
- `redisdata_prod`: Persistent cache and task queue data.
- `shared_uploads_prod`: Uploaded user CSV files (`/app/uploads/raw`) and generated Matplotlib/Seaborn chart figures (`/app/uploads/charts`).
- `./certbot/conf` (`/etc/letsencrypt`): Stores Let's Encrypt SSL certificates, private keys, and renewal parameters.
- `./certbot/www` (`/var/www/certbot`): Stores HTTP-01 ACME challenge tokens served by Nginx over port 80.

---

## 3. GitHub Actions CI/CD Explained

The pipeline is defined in `.github/workflows/ci.yml` and runs automatically on every **push** and **pull request** to `main` (or `master`), as well as manual triggers via `workflow_dispatch`.

```
[ Push / PR to main ]
         |
         +-----------------------+-----------------------+
         |                                               |
         v                                               v
[ 1. Backend Pytest Job ]                     [ 2. Frontend Check Job ]
  - Spin up Postgres (pgvector)                  - Install Node.js 20
  - Spin up Redis                                - Run npx tsc --noEmit
  - Install Python 3.12 requirements             - Run npm run build
  - Run 11 unit & integration tests
         |                                               |
         +-----------------------+-----------------------+
                                 |
                                 v
                 [ 3. Docker Compose Validation ]
                   - Validate Compose YAML configs
                   - Build production Docker images
                                 |
                                 v (Push to main only)
                 [ 4. Deploy to AWS EC2 via SSH ]
                   - SSH into AWS Ubuntu server
                   - Pull latest Git commits
                   - Zero-downtime docker compose up -d
                   - Prune unused images
```

### Key Workflow Jobs
1. **`backend-tests`**:
   - Launches real `pgvector/pgvector:pg17` and `redis:alpine` service containers with health checks.
   - Installs `Server/requirements.txt` with pip caching.
   - Executes all test suites (`test_auth_enforcement.py`, `test_cleaner.py`, `test_graph.py`, `test_sandbox.py`, `test_single_csv_constraint.py`).
2. **`frontend-checks`**:
   - Installs dependencies using `npm ci` with caching.
   - Validates TypeScript definitions with `npx tsc --noEmit`.
   - Verifies the production build with `npm run build`.
3. **`docker-compose-validate`**:
   - Verifies that `docker-compose.yml` and `docker-compose.prod.yml` are syntactically valid.
   - Builds production images using BuildKit to ensure zero Dockerfile regressions.
4. **`deploy-to-aws`**:
   - Executes only when all tests pass on `main`.
   - Connects to the AWS EC2 instance via SSH and triggers an automated update.

---

## 4. Git Repository Setup & Branching Strategy

### Initializing and Pushing to GitHub
```bash
# 1. Initialize git
git init

# 2. Add files and commit
git add .
git commit -m "feat: complete containerization, SSL script, CI/CD, and typography system"

# 3. Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/analytics-dashboard.git

# 4. Push to main branch
git branch -M main
git push -u origin main
```

### GitHub Repository Secrets
To enable automated deployments to AWS, navigate to your GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `EC2_HOST` | Public Elastic IP of your AWS instance | `54.210.12.34` or `yourdomain.com` |
| `EC2_USER` | SSH username for Ubuntu instances | `ubuntu` |
| `EC2_SSH_KEY` | Private SSH key (`.pem`) used to access EC2 | `-----BEGIN RSA PRIVATE KEY----- ...` |
| `EC2_PORT` | SSH port (optional, defaults to 22) | `22` |

---

## 5. AWS Ubuntu EC2 Setup (Step-by-Step)

### Step 5.1: Launching the EC2 Instance
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/ec2/).
2. Click **Launch Instance**.
3. **Name**: `analytics-dashboard-prod`.
4. **AMI**: **Ubuntu Server 24.04 LTS** (or 22.04 LTS), 64-bit (x86).
5. **Instance Type**:
   - Recommended: **`t3.medium`** (2 vCPUs, 4 GiB RAM) or **`t3.large`** for heavy data processing.
   - Minimum: `t3.small` (requires creating swap space to avoid build OOM).
6. **Key Pair**: Select an existing key pair or create a new one (download the `.pem` file).
7. **Storage**: Configure **25–30 GiB** `gp3` SSD storage.

### Step 5.2: Configure Security Group Inbound Rules
In the **Network settings**, configure the Security Group with the following inbound rules:

| Type | Protocol | Port Range | Source | Reason |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `My IP` (or `0.0.0.0/0`) | Remote terminal access |
| **HTTP** | TCP | `80` | `0.0.0.0/0` | Web traffic & Let's Encrypt ACME challenge |
| **HTTPS** | TCP | `443` | `0.0.0.0/0` | Secure encrypted web traffic |

> [!IMPORTANT]
> Do **NOT** expose ports `5432`, `5431`, or `6379` to `0.0.0.0/0`. In `docker-compose.prod.yml`, database ports are securely bound to `127.0.0.1` only.

### Step 5.3: Allocate an Elastic IP
1. In the EC2 left sidebar, go to **Network & Security** → **Elastic IPs**.
2. Click **Allocate Elastic IP address** → **Allocate**.
3. Select the allocated IP → **Actions** → **Associate Elastic IP address**.
4. Choose your running instance and click **Associate**.
*(This prevents your server IP address from changing on reboot or stop/start).*

### Step 5.4: Connect to Your Server via SSH
From your local terminal:

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

### Step 5.5: System Updates & Swap Configuration
Once logged into your Ubuntu server:

```bash
# 1. Update package lists and upgrade system
sudo apt update && sudo apt upgrade -y

# 2. Add 4GB swap space (prevents Out-Of-Memory errors during npm/docker builds)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify swap
free -h
```

### Step 5.6: Install Docker Engine & Docker Compose
Run the official Docker installation commands:

```bash
# 1. Install prerequisite utilities
sudo apt install -y ca-certificates curl gnupg lsb-release git ufw

# 2. Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 3. Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker Engine, CLI, and Compose Plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 5. Enable non-root user execution
sudo usermod -aG docker ubuntu
newgrp docker

# 6. Verify installation
docker --version
docker compose version
```

### Step 5.7: Configure UFW Firewall
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 6. Domain & DNS Configuration

To enable SSL/TLS, point your domain `analytics.vishalsingh.me` to your AWS Elastic IP `16.176.226.219`:

1. Log in to your DNS provider for `vishalsingh.me` (e.g. Cloudflare, Namecheap, GoDaddy, AWS Route 53).
2. Add an **A Record**:
   - **Type**: `A`
   - **Name**: `analytics` (resolves as `analytics.vishalsingh.me`)
   - **Value / Target**: `16.176.226.219`
   - **TTL**: `Auto` or `300 seconds` (if using Cloudflare, set proxy to DNS Only during initial SSL challenge)
3. Verify DNS propagation (from your terminal):
   ```bash
   dig +short analytics.vishalsingh.me
   # Output should return: 16.176.226.219
   ```

---

## 7. Automated SSL with Certbot & init-letsencrypt.sh

### The Chicken-and-Egg Problem Solved
When using Nginx with SSL in Docker, a classic paradox occurs:
1. Nginx refuses to start if the SSL certificate files (`fullchain.pem` and `privkey.pem`) do not exist yet.
2. Certbot cannot obtain the certificate using the HTTP-01 ACME challenge because Nginx is not running to serve port 80.

The included **`init-letsencrypt.sh`** script solves this problem automatically through a multi-step bootstrap:
1. Validates input domain and email parameters.
2. Creates dummy self-signed certificates with OpenSSL inside the `certbot` container so Nginx can start safely.
3. Dynamically generates `nginx/nginx.conf` from `nginx/nginx.ssl.conf.template` by substituting `${DOMAIN}`.
4. Starts the `nginx` container on port 80 and 443.
5. Deletes the temporary dummy certificate.
6. Requests real Let's Encrypt certificates using Certbot's webroot challenge (`/var/www/certbot`).
7. Reloads Nginx (`nginx -s reload`) to apply the valid certificates with zero downtime.

---

### Step 7.1: The Nginx SSL Configuration Template (`nginx/nginx.ssl.conf.template`)
This template is used by the script to generate the final Nginx configuration:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile        on;
    keepalive_timeout  65;

    # Allow large CSV dataset uploads (up to 100MB)
    client_max_body_size 100M;

    # Gzip Compression for fast load times
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Upstream container services on Docker bridge network
    upstream frontend_upstream {
        server frontend:3000;
        keepalive 32;
    }

    upstream backend_upstream {
        server backend:8000;
        keepalive 32;
    }

    # HTTP Server (Port 80)
    # Serves ACME challenge for Let's Encrypt and redirects all other traffic to HTTPS
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};

        # Let's Encrypt ACME challenge endpoint
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Force redirect all HTTP traffic to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS Server (Port 443) - SSL with Let's Encrypt Certificate
    server {
        listen 443 ssl;
        http2 on;
        server_name ${DOMAIN} www.${DOMAIN};

        ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers on;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints -> FastAPI Backend
        location /api/ {
            proxy_pass http://backend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 300s;
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
        }

        # Uploaded static datasets and chart visualizations
        location /uploads/ {
            proxy_pass http://backend_upstream/uploads/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend Next.js application
        location / {
            proxy_pass http://frontend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

---

### Step 7.2: The SSL Bootstrap Script (`init-letsencrypt.sh`)
The file `init-letsencrypt.sh` is located in your project root:

```bash
#!/usr/bin/env bash
set -e

DOMAIN=$1
EMAIL=$2
STAGING=${3:-0} # Set to 1 for testing against Let's Encrypt staging servers

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "================================================================="
    echo "Error: Missing required arguments."
    echo "Usage:   ./init-letsencrypt.sh <domain> <email> [staging (0 or 1)]"
    echo "Example: ./init-letsencrypt.sh example.com admin@example.com 0"
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

docker compose -f docker-compose.prod.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email '$EMAIL' \
    -d '$DOMAIN' \
    -d 'www.$DOMAIN' \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

echo "### Reloading Nginx with the new SSL certificate ..."
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "================================================================="
echo " SSL Certificate issued successfully for $DOMAIN & www.$DOMAIN!"
echo " Automatic renewal is handled by the certbot container."
echo " You can now access https://$DOMAIN in your browser!"
echo "================================================================="
```

---

### Step 7.3: Running the SSL Script on EC2

1. Make the script executable:
   ```bash
   chmod +x init-letsencrypt.sh
   ```

2. **First Test with Staging Mode (`1`)** *(Optional but recommended to avoid Let's Encrypt rate limits)*:
   ```bash
   ./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 1
   ```
   If this succeeds without errors, proceed to Production Mode.

3. **Run Production Mode (`0`) to obtain real valid certificates**:
   ```bash
   ./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 0
   ```

4. **Verify Certificate**:
   Open `https://analytics.vishalsingh.me` in your browser. You will see a secure padlock with a valid Let's Encrypt certificate!

---

### Step 7.4: Automatic SSL Certificate Renewal
Let's Encrypt certificates expire every 90 days. In `docker-compose.prod.yml`, the `certbot` container runs a background daemon:
```yaml
  certbot:
    image: certbot/certbot:latest
    container_name: analytics_certbot_prod
    restart: unless-stopped
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```
- Every 12 hours, the container executes `certbot renew`.
- When the certificate has less than 30 days of validity remaining, it is renewed automatically.
- No manual intervention is needed.

---

## 8. Deploying with Docker Compose

### Step 8.1: Clone the Codebase to EC2
```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/analytics-dashboard.git
cd analytics-dashboard
```

### Step 8.2: Configure Environment Variables
Generate secure random secrets:
```bash
openssl rand -hex 32   # Use for ACCESS_TOKEN_SECRET
openssl rand -hex 32   # Use for REFRESH_TOKEN_SECRET
openssl rand -hex 32   # Use for NEXTAUTH_SECRET
```

Create your production `.env` file:
```bash
cp .env.example .env
nano .env
```

Configure your production values:
```env
# Domain & Host Configuration
DOMAIN=analytics.vishalsingh.me
PUBLIC_IP=16.176.226.219

# Database Configuration
POSTGRES_USER=analytics_admin
POSTGRES_PASSWORD=your_super_secure_postgres_password_here
POSTGRES_DB=analytics_prod_db

# AI / LLM Configuration
LLM_PROVIDER=google
GOOGLE_API_KEY=your_google_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=
OPENAI_MODEL_NAME=gpt-4o-mini

# Authentication Security Tokens
ACCESS_TOKEN_SECRET=your_generated_access_token_secret_here
REFRESH_TOKEN_SECRET=your_generated_refresh_token_secret_here

# NextAuth Configuration
NEXTAUTH_URL=https://analytics.vishalsingh.me
NEXTAUTH_SECRET=your_generated_nextauth_secret_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Frontend API Endpoint (Routed via Nginx HTTPS)
NEXT_PUBLIC_API_URL=https://analytics.vishalsingh.me/api/v1
NEXT_PUBLIC_API_URL_VERSION=v1
CORS_ORIGINS=["https://analytics.vishalsingh.me","http://analytics.vishalsingh.me","http://16.176.226.219","http://localhost:3000","http://127.0.0.1:3000"]
```

### Step 8.3: Build & Launch All Containers
```bash
# 1. Build and start services
docker compose -f docker-compose.prod.yml up -d --build

# 2. Initialize SSL (if not already done)
./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 0

# 3. Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

Expected output:
```
NAME                          IMAGE                         STATUS                    PORTS
analytics_backend_prod        analyticsdashboard-backend    Up 2 minutes (healthy)    127.0.0.1:8000->8000/tcp
analytics_frontend_prod       analyticsdashboard-frontend   Up 2 minutes (healthy)    127.0.0.1:3000->3000/tcp
analytics_redis_prod          redis:alpine                  Up 2 minutes (healthy)    127.0.0.1:6379->6379/tcp
customer_care_db_prod         pgvector/pgvector:pg17        Up 2 minutes (healthy)    127.0.0.1:5431->5432/tcp
analytics_nginx_prod          nginx:alpine                  Up 2 minutes              0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
analytics_certbot_prod        certbot/certbot:latest        Up 2 minutes
```

### Step 8.4: View Live Logs
```bash
# Follow logs for all containers
docker compose -f docker-compose.prod.yml logs -f

# Follow logs for backend only
docker compose -f docker-compose.prod.yml logs -f backend

# Follow logs for frontend only
docker compose -f docker-compose.prod.yml logs -f frontend

# Follow logs for Nginx only
docker compose -f docker-compose.prod.yml logs -f nginx
```

---

## 9. Automating Continuous Deployment (CD) with GitHub Actions

### Step 9.1: Generate a Dedicated Deployment SSH Key (on your local machine)
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

### Step 9.2: Add Public Key to EC2
Copy the contents of `~/.ssh/github_deploy_key.pub`:
```bash
cat ~/.ssh/github_deploy_key.pub
```
On your AWS EC2 instance, append it to `~/.ssh/authorized_keys`:
```bash
echo "ssh-ed25519 AAAAC3... github-actions-deploy" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 9.3: Add Private Key to GitHub Secrets
Copy the contents of `~/.ssh/github_deploy_key` (private key):
```bash
cat ~/.ssh/github_deploy_key
```
In your GitHub repo:
1. Go to **Settings** → **Secrets and variables** → **Actions**.
2. Add secret **`EC2_SSH_KEY`** = Paste private key.
3. Add secret **`EC2_HOST`** = Your AWS Elastic IP.
4. Add secret **`EC2_USER`** = `ubuntu`.

Now, when you push code to `main`:
1. GitHub Actions runs Python unit & integration tests on Ubuntu runners.
2. It validates TypeScript and builds the Next.js production bundle.
3. It validates Docker Compose configs.
4. It SSHs into your EC2 server, pulls the latest code, and runs `docker compose -f docker-compose.prod.yml up -d --build --remove-orphans`.

---

## 10. Maintenance, Backups & Troubleshooting

### Database Backups (PostgreSQL)
```bash
# Manual Backup
docker exec -t customer_care_db_prod pg_dump -U analytics_admin analytics_prod_db > ~/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore Backup
cat ~/backup_file.sql | docker exec -i customer_care_db_prod psql -U analytics_admin -d analytics_prod_db
```

#### Automated Daily Backup Cron Job
```bash
crontab -e
```
Add the following line to run daily at 3:00 AM:
```cron
0 3 * * * docker exec -t customer_care_db_prod pg_dump -U analytics_admin analytics_prod_db | gzip > /home/ubuntu/db_backup_$(date +\%F).sql.gz
```

### Disk Space Maintenance
Docker builds can accumulate dangling layers over time. Clean unused resources:
```bash
# Remove dangling images, containers, and build cache
docker system prune -f

# Check disk usage
df -h
docker system df
```

### Common Troubleshooting

#### 1. "Missing required arguments" when running `init-letsencrypt.sh`
Ensure you pass both the domain and email:
```bash
./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 0
```

#### 2. Let's Encrypt Rate Limit Exceeded
If you hit rate limits during testing, switch to staging mode:
```bash
./init-letsencrypt.sh analytics.vishalsingh.me admin@vishalsingh.me 1
```

#### 3. ACME Challenge Fails
- Ensure your DNS A-record for `analytics.vishalsingh.me` resolves to your EC2 Elastic IP `16.176.226.219`.
- Ensure AWS Security Group allows inbound traffic on **Port 80** and **Port 443** from `0.0.0.0/0`.
- Ensure UFW on Ubuntu has opened port 80: `sudo ufw allow 80/tcp && sudo ufw reload`.

#### 4. NextAuth `OAuthSignin` / `redirect_uri_mismatch` Error
Ensure `NEXTAUTH_URL` in `.env` matches your exact public domain with `https://`:
```env
NEXTAUTH_URL=https://analytics.vishalsingh.me
```
In Google Cloud Console (OAuth Credentials), add:
- **Authorized JavaScript origins**: `https://analytics.vishalsingh.me`
- **Authorized redirect URIs**: `https://analytics.vishalsingh.me/api/auth/callback/google`

#### 5. Inspect Container Health Failures
If a container shows `(unhealthy)`:
```bash
docker inspect --format='{{json .State.Health}}' analytics_backend_prod | jq
```

---

## Summary Checklist

- [x] **`init-letsencrypt.sh`**: Automated shell script resolving the Nginx dummy certificate bootstrap and Let's Encrypt ACME challenge.
- [x] **`nginx/nginx.ssl.conf.template`**: Production Nginx configuration template with `${DOMAIN}` placeholder, Gzip compression, WebSockets, and 100MB CSV upload limit.
- [x] **`docker-compose.prod.yml` & `docker-compose.yml`**: Production Compose setups with `nginx`, `certbot`, `backend`, `frontend`, `db`, and `redis`.
- [x] **`.github/workflows/ci.yml`**: Automated GitHub Actions CI/CD with Pytest, TypeScript verification, Next.js build, and automated AWS EC2 SSH deploy.
- [x] **`Guide.md`**: Exhaustive step-by-step guide for Git, AWS Ubuntu EC2, Docker Compose, and Let's Encrypt SSL via `init-letsencrypt.sh`.
