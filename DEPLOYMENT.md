# HabitQuest Deployment Guide (Oracle Cloud + Ubuntu + DuckDNS + Nginx + Let's Encrypt)

This guide walks you through deploying **HabitQuest** on an Oracle Cloud Always Free Ubuntu VM with DuckDNS, Nginx, systemd, and Let's Encrypt SSL.

---

## Architecture Overview

- **Cloud VM**: Oracle Cloud Always Free (Compute VM: Ubuntu 22.04 or 24.04 LTS)
- **Domain**: Free DuckDNS domain (`YOUR_DUCKDNS_DOMAIN.duckdns.org`)
- **Web Server & Reverse Proxy**: Nginx
- **Frontend**: React 19 + Vite SPA served statically from `/var/www/habit-quest/dist`
- **Backend**: Optional Python companion API on `http://127.0.0.1:8000/` routed via `/api/`
- **Process Manager**: systemd (`habit-quest.service`)
- **SSL / HTTPS**: Let's Encrypt automated via Certbot

---

## Prerequisites

1. Oracle Cloud Free Tier account.
2. DuckDNS account (create a domain like `myhabitquest.duckdns.org`).
3. SSH key pair on your local machine.

---

## Step 1: Provision Oracle Cloud VM & Security Rules

1. Log in to the [Oracle Cloud Console](https://cloud.oracle.com).
2. Go to **Compute** → **Instances** → **Create Instance**.
   - **Image**: Ubuntu 22.04 / 24.04 LTS.
   - **Shape**: `VM.Standard.E2.1.Micro` (or `VM.Standard.A1.Flex` with Ampere AArch64).
   - **Networking**: Assign a Public IPv4 Address.
   - **SSH Keys**: Paste your public SSH key (`~/.ssh/id_rsa.pub` or `~/.ssh/id_ed25519.pub`).
3. Click **Create**.
4. Configure Oracle Cloud Ingress Security Rules (VCN Virtual Cloud Network):
   - Navigate to **Networking** → **Virtual Cloud Networks** → Select your VCN → **Security Lists** → **Default Security List**.
   - Add **Ingress Rules**:
     - Port `80`: Source `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `80` (HTTP).
     - Port `443`: Source `0.0.0.0/0`, IP Protocol `TCP`, Destination Port Range `443` (HTTPS).
     - Port `22`: SSH (enabled by default).
   - *Note*: Do **NOT** open port `8000` to the internet.

---

## Step 2: Configure DuckDNS

1. Go to [duckdns.org](https://www.duckdns.org) and log in.
2. Under **Domains**, create a subdomain name (e.g. `myhabitquest`).
3. Copy the **Public IP** of your Oracle Cloud instance and enter it into the **IP** box in DuckDNS.
4. Click **update ip**.

---

## Step 3: Connect to Server & Update Packages

SSH into your Oracle Cloud VM:

```bash
ssh ubuntu@YOUR_ORACLE_PUBLIC_IP
```

Update system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

Install essential system packages, Nginx, Node.js, Python, and Git:

```bash
# Install Nginx, Git, Python venv, Certbot
sudo apt install -y nginx git python3 python3-venv python3-pip certbot python3-certbot-nginx curl ufw

# Install Node.js LTS (v20 or v22)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installed versions:

```bash
node -v
npm -v
python3 --version
nginx -v
```

---

## Step 4: Configure Ubuntu Firewall (UFW) & iptables

Oracle Ubuntu images have both `iptables` and `ufw`. Open ports 22, 80, and 443:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

# Ensure Oracle iptables allows HTTP/HTTPS
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save || sudo apt install -y iptables-persistent
```

---

## Step 5: Clone & Build Application

Clone the repository to `/var/www/habit-quest`:

```bash
# Set ownership of /var/www
sudo chown -R ubuntu:ubuntu /var/www

# Clone repository
git clone https://github.com/YOUR_USER/habit-quest.git /var/www/habit-quest
cd /var/www/habit-quest

# Configure environment
cp .env.example .env
nano .env
# Set APP_DOMAIN=yoursubdomain.duckdns.org

# Install frontend dependencies & build
npm install
npm run build
```

Ensure the build output exists in `/var/www/habit-quest/dist`:

```bash
ls -la /var/www/habit-quest/dist
```

---

## Step 6: Configure systemd Service (Optional Companion API)

If using a Python backend or background process:

```bash
# Make production startup script executable
chmod +x /var/www/habit-quest/scripts/start-production.sh

# Copy systemd service unit
sudo cp /var/www/habit-quest/deployment/habit-quest.service /etc/systemd/system/habit-quest.service

# Reload systemd daemon, enable & start service
sudo systemctl daemon-reload
sudo systemctl enable habit-quest.service
sudo systemctl start habit-quest.service

# Verify service status
sudo systemctl status habit-quest.service
```

---

## Step 7: Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /var/www/habit-quest/deployment/nginx.conf /etc/nginx/sites-available/habit-quest

# Replace placeholder with your actual DuckDNS domain
sudo sed -i 's/YOUR_DUCKDNS_DOMAIN/yoursubdomain.duckdns.org/g' /etc/nginx/sites-available/habit-quest

# Enable the site and remove default site
sudo ln -sf /etc/nginx/sites-available/habit-quest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

Test your HTTP site by visiting: `http://yoursubdomain.duckdns.org` in a browser or via `curl`:

```bash
curl -I http://yoursubdomain.duckdns.org
```

---

## Step 8: Install Let's Encrypt SSL with Certbot

Run Certbot to obtain and install a free SSL certificate:

```bash
sudo certbot --nginx -d yoursubdomain.duckdns.org --non-interactive --agree-tos -m your-email@example.com --redirect
```

Test automatic certificate renewal:

```bash
sudo certbot renew --dry-run
```

---

## Step 9: Verification

Run these commands to verify complete deployment:

```bash
# 1. Check Nginx status
sudo systemctl status nginx

# 2. Check systemd service status
sudo systemctl status habit-quest.service

# 3. Check service logs
sudo journalctl -u habit-quest.service -n 50 --no-pager

# 4. Check HTTPS response
curl -ILs https://yoursubdomain.duckdns.org | head -n 20
```

Congratulations! Your application is now accessible 24/7 at `https://yoursubdomain.duckdns.org`.
