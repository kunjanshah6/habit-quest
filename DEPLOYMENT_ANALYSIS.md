# Deployment Architecture & Project Analysis

## 1. Detected Architecture

### Frontend
- **Framework**: React 19 (`react` ^19.2.8, `react-dom` ^19.2.8) with TypeScript and Vite (`vite` ^8.2.2).
- **Styling**: Tailwind CSS (`tailwindcss` ^3.4.19) with PostCSS and Autoprefixer.
- **State Management & Persistence**: Zustand (`zustand` ^5.0.15) with `persist` middleware storing data in browser `localStorage` under the key `'habit-quest-storage'`.
- **Routing / Navigation**: Single Page Application (SPA) with tab/modal state switching managed in Zustand (`activePage`: `'today' | 'insights' | 'history' | 'achievements' | 'profile' | 'settings'`).
- **Additional UI Libraries**: Framer Motion (`framer-motion`), Lucide React (`lucide-react`), Recharts (`recharts`), Date-fns (`date-fns`). Mobile packaging with Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`).

### Backend
- **Framework**: No server-side Python / Node.js backend currently exists in this repository. The application is currently a pure client-side SPA (Single Page Application) with client-side state persisted in `localStorage`.
- **Backend Entry Point**: Currently N/A (no Python backend files in repo). For an optional / future Python backend or companion API, standard FastAPI (`app.main:app` with Uvicorn) or Flask (`app:app` with Gunicorn) can be routed at `/api/` on internal port `127.0.0.1:8000`.
- **Companion / Recommended Backend Setup**: To satisfy requirements where a Python backend or API server is added or if health/companion endpoints are hosted alongside the frontend, a production Python backend template and systemd/Nginx configurations are prepared. If deployed as pure SPA, Nginx serves the static build directly from `dist/` with SPA fallback.

## 2. Backend Entry Point
- **Current State**: Client-only SPA.
- **Production API Target** (if companion Python service is used): `127.0.0.1:8000`.
- **Production Server**: Gunicorn / Uvicorn (configured with environment-controlled port, defaulting to 8000).

## 3. Frontend Build Process
- **Package Manager**: `npm` (with `package-lock.json`)
- **Build Command**: `npm run build` (runs `tsc -b && vite build`)
- **Output Directory**: `dist/` containing `index.html`, `favicon.svg`, `icons.svg`, and `assets/` (`index-*.js`, `index-*.css`).
- **Dev Command**: `npm run dev` (starts Vite dev server on `http://localhost:5173`)

## 4. Frontend → Backend Communication
- **Current Communication**: In-memory state and `localStorage` via Zustand `persist` middleware.
- **Network Calls**: No external API calls or hardcoded backend URLs currently present in frontend source code.
- **Future / Production API Base Path**: Same-origin `/api` (configured via Nginx reverse proxy to `http://127.0.0.1:8000`), completely eliminating cross-origin CORS issues and hardcoded ports.

## 5. Required Environment Variables
- **Frontend**: Optional `VITE_API_BASE_URL` (defaults to `/api` for same-origin routing).
- **Backend (if present / deployed)**:
  - `APP_ENV=production`
  - `HOST=0.0.0.0`
  - `PORT=8000`
  - `APP_DOMAIN=YOUR_DUCKDNS_DOMAIN`

## 6. Required Ports
- **Public**:
  - `22` (SSH for administrative access)
  - `80` (HTTP for Let's Encrypt ACME challenges and HTTP→HTTPS redirect)
  - `443` (HTTPS for public secure traffic)
- **Internal Only**:
  - `8000` (Backend API listener bound to `127.0.0.1` / `0.0.0.0`, never exposed to the public internet)

## 7. Current Deployment Blockers & Resolution
1. **Static Build Serving**: The app requires Nginx configured to serve the `dist/` directory with `try_files $uri $uri/ /index.html;` to properly handle SPA routing and avoid 404s.
2. **Missing Production & Deployment Scaffolding**: No systemd service, startup scripts, `.env.example`, or Nginx configs existed.
3. **HTTPS / Domain Setup**: Needs automated Let's Encrypt / Certbot integration and DuckDNS hostname routing.

## 8. Recommended Production Architecture

```
Internet
   │
   ▼
[DuckDNS Domain: example.duckdns.org]
   │
   ▼
[Oracle Cloud Always Free VM (Ubuntu 22.04 / 24.04)]
   │
   ▼ (Ports 80 / 443 with UFW & Oracle Security List)
[Nginx Reverse Proxy & Web Server + Let's Encrypt SSL]
   ├─── GET / (and static assets) ──► Serves /var/www/habit-quest/dist/ (SPA)
   └─── /api/* ───────────────────► Proxies to http://127.0.0.1:8000 (Python backend / systemd)
```

## 9. Exact Changes That Will Be Made
1. **`.env.example`**: Create standardized production environment configuration template.
2. **`.gitignore`**: Ensure `.env`, virtualenvs (`venv/`), Python cache (`__pycache__/`, `*.pyc`), and server logs are ignored.
3. **`deployment/nginx.conf`**: Nginx configuration serving `dist/` with gzip, security headers, SPA fallback, and proxying `/api/` to `http://127.0.0.1:8000`.
4. **`deployment/habit-quest.service`**: systemd unit file for 24/7 background process management with auto-restart on failure.
5. **`scripts/start-production.sh`**: Production startup script that verifies dependencies, environment variables, and starts the production server.
6. **`DEPLOYMENT.md`**: Complete, step-by-step Oracle Cloud + Ubuntu + DuckDNS + Let's Encrypt deployment guide.
7. **`DEPLOYMENT_CHECKLIST.md`**: Step-by-step verification checklist.
8. **`DEPLOYMENT_TROUBLESHOOTING.md`**: Detailed troubleshooting guide for 502s, Nginx errors, DNS issues, systemd failures, and SSL issues.
