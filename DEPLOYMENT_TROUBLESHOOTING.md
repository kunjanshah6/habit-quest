# Deployment Troubleshooting Guide

This guide covers common issues, debugging commands, and resolutions when deploying HabitQuest on an Oracle Cloud Ubuntu VM.

---

## 1. 502 Bad Gateway

### Symptoms
Visiting `https://YOUR_DOMAIN/api/...` returns `502 Bad Gateway`.

### Cause
Nginx is unable to connect to the backend server listening on `127.0.0.1:8000`.

### Troubleshooting & Resolution
1. **Check if the backend process is active**:
   ```bash
   sudo systemctl status habit-quest.service
   ```
2. **Check recent application crash logs**:
   ```bash
   sudo journalctl -u habit-quest.service -n 100 --no-pager
   ```
3. **Check if port 8000 is listening locally**:
   ```bash
   sudo ss -tulpn | grep 8000
   # or
   sudo lsof -i :8000
   ```
4. **Test internal backend response**:
   ```bash
   curl -i http://127.0.0.1:8000/
   ```
5. **Restart the application service**:
   ```bash
   sudo systemctl restart habit-quest.service
   ```

---

## 2. Nginx Configuration or Startup Errors

### Symptoms
`sudo systemctl reload nginx` fails or Nginx service is stopped.

### Troubleshooting & Resolution
1. **Validate Nginx syntax**:
   ```bash
   sudo nginx -t
   ```
   This will pinpoint the exact file and line number containing any syntax error.
2. **Inspect Nginx error logs**:
   ```bash
   sudo tail -n 50 /var/log/nginx/error.log
   ```
3. **Check Nginx systemd journal**:
   ```bash
   sudo journalctl -u nginx -n 50 --no-pager
   ```
4. **Verify permissions on static files directory**:
   ```bash
   # Ensure Nginx (www-data) can read the dist directory
   sudo chmod 755 /var/www /var/www/habit-quest /var/www/habit-quest/dist
   ```

---

## 3. Frontend Works but Refresh Gives 404 (SPA Routing Issue)

### Symptoms
Navigating within the app works, but refreshing the page on any deep route returns Nginx `404 Not Found`.

### Cause
Single Page Applications (SPAs) require the web server to fallback to `index.html` for client-side routing.

### Resolution
Ensure your `/etc/nginx/sites-available/habit-quest` includes:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```
Then test and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Direct IP Works but Domain Does Not

### Symptoms
You can reach the server by IP, but entering `yourdomain.duckdns.org` in the browser fails or times out.

### Troubleshooting & Resolution
1. **Check DuckDNS IP Mapping**:
   Verify that your DuckDNS subdomain resolves to your Oracle VM public IP:
   ```bash
   nslookup yoursubdomain.duckdns.org
   # or
   dig yoursubdomain.duckdns.org +short
   ```
2. **Update DuckDNS**:
   Log into [duckdns.org](https://www.duckdns.org) and update the IP address to match your Oracle VM public IP.
3. **Verify Nginx `server_name`**:
   Check `/etc/nginx/sites-available/habit-quest` has:
   ```nginx
   server_name yoursubdomain.duckdns.org;
   ```

---

## 5. Site Not Reachable from the Internet (Connection Timed Out)

### Symptoms
Browser hangs when connecting to `http://YOUR_IP` or `http://yourdomain.duckdns.org`.

### Cause
Firewall blocking port 80 or 443 at the Oracle Cloud VCN level or Ubuntu OS level.

### Troubleshooting & Resolution
1. **Check Oracle Cloud VCN Ingress Rules**:
   - Go to Oracle Cloud Console → Networking → Virtual Cloud Networks → Your VCN → Security Lists → Default Security List.
   - Confirm **Ingress Rules** exist for:
     - `0.0.0.0/0`, TCP, Port `80`
     - `0.0.0.0/0`, TCP, Port `443`
2. **Check Ubuntu UFW**:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```
3. **Check Oracle Linux `iptables` rules**:
   Oracle Ubuntu images often ship with default drop rules in `iptables`:
   ```bash
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

---

## 6. Let's Encrypt / Certbot SSL Certificate Fails

### Symptoms
Running `sudo certbot --nginx` gives an ACME challenge failure or validation error.

### Cause
Let's Encrypt servers cannot connect to port 80 on your VM to verify domain ownership.

### Troubleshooting & Resolution
1. Verify DNS is fully propagated:
   ```bash
   ping yoursubdomain.duckdns.org
   ```
2. Confirm port 80 is reachable from the outside before running Certbot:
   ```bash
   curl -I http://yoursubdomain.duckdns.org
   ```
3. If using Certbot standalone mode, temporarily stop Nginx:
   ```bash
   sudo systemctl stop nginx
   sudo certbot certonly --standalone -d yoursubdomain.duckdns.org
   sudo systemctl start nginx
   ```
4. Verify certificate paths in Nginx:
   Certbot updates `/etc/nginx/sites-available/habit-quest` automatically with `ssl_certificate` and `ssl_certificate_key` pointing to `/etc/letsencrypt/live/yoursubdomain.duckdns.org/`.

---

## 7. Useful Diagnostic Commands Quick Reference

```bash
# Nginx syntax test
sudo nginx -t

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Systemd service management
sudo systemctl status habit-quest.service
sudo systemctl restart habit-quest.service
sudo journalctl -u habit-quest.service -f

# Network and open listening ports
sudo ss -tulpn

# UFW Firewall status
sudo ufw status verbose
```
