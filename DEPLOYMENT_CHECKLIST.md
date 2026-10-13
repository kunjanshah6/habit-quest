# Deployment Checklist

Use this checklist to track your Oracle Cloud + DuckDNS + Nginx deployment.

## Cloud Infrastructure & DNS
- [ ] Oracle Cloud account created and verified
- [ ] Oracle Cloud Compute VM created (Ubuntu 22.04 or 24.04 LTS)
- [ ] Reserved/static public IP assigned to VM
- [ ] Oracle VCN Security List ingress rules opened for Port 80 (HTTP)
- [ ] Oracle VCN Security List ingress rules opened for Port 443 (HTTPS)
- [ ] Port 8000 kept CLOSED to the public internet
- [ ] DuckDNS free hostname created (e.g. `yourname.duckdns.org`)
- [ ] DuckDNS points to Oracle VM public IP
- [ ] DNS resolution confirmed via `ping yourname.duckdns.org`

## Server Configuration
- [ ] SSH connection established (`ssh ubuntu@YOUR_IP`)
- [ ] System packages updated (`sudo apt update && sudo apt upgrade -y`)
- [ ] Required tools installed: `nginx`, `git`, `nodejs`, `python3`, `python3-venv`, `certbot`, `ufw`
- [ ] Node.js (v20+ LTS) and npm verified (`node -v && npm -v`)
- [ ] UFW configured with ports 22, 80, 443 allowed
- [ ] iptables persistent rules configured for Oracle network stack

## Application Setup
- [ ] Code cloned to `/var/www/habit-quest`
- [ ] Production `.env` created from `.env.example`
- [ ] `APP_DOMAIN` set in `.env`
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Frontend production build created (`npm run build`)
- [ ] Static output verified in `dist/` (`dist/index.html` exists)
- [ ] Startup script permissions set (`chmod +x scripts/start-production.sh`)

## Service & Web Server
- [ ] systemd service installed (`/etc/systemd/system/habit-quest.service`)
- [ ] systemd daemon reloaded (`sudo systemctl daemon-reload`)
- [ ] systemd service enabled on boot (`sudo systemctl enable habit-quest.service`)
- [ ] systemd service started and running (`sudo systemctl start habit-quest.service`)
- [ ] Nginx configuration installed to `/etc/nginx/sites-available/habit-quest`
- [ ] `YOUR_DUCKDNS_DOMAIN` replaced in Nginx config with actual domain
- [ ] Nginx site enabled via symlink to `/etc/nginx/sites-enabled/`
- [ ] Default Nginx site removed (`/etc/nginx/sites-enabled/default`)
- [ ] Nginx syntax validated (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)
- [ ] HTTP site loads successfully in browser

## SSL & Final Verification
- [ ] Certbot SSL certificate obtained (`sudo certbot --nginx -d yourname.duckdns.org`)
- [ ] Automatic HTTPS redirect verified
- [ ] Certbot dry-run renewal succeeded (`sudo certbot renew --dry-run`)
- [ ] HTTPS site verified in browser with valid lock icon
- [ ] SPA route refresh tested (e.g. `/` and deep links do not 404)
- [ ] Server reboot test performed (`sudo reboot`)
- [ ] Site and services automatically recover and remain operational after reboot
