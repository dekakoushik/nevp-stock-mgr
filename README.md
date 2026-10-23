# NEVP Stock Manager

Enterprise Factory Production & Multi-User Inventory Management System.

Built with:
- **Frontend**: React 19, Vite, Lucide Icons, Vanilla CSS Design System
- **Backend**: Node.js, Express, Better-SQLite3 (with WAL mode), JWT Authentication
- **Mobile**: React Native & Expo (tested via Expo Go)
- **Deployment**: Docker, Docker Compose, Nginx Reverse Proxy (Ready for **Dokploy** / Coolify / VPS)

---

## 🚀 Quick Deployment with Dokploy

This repository is pre-configured for automated deployment on **Dokploy**:

1. In your Dokploy dashboard, create a new **Compose** application (or Git-based service).
2. Connect this repository: `https://github.com/dekakoushik/nevp-stock-mgr.git`.
3. Set your branch (e.g. `main`).
4. (Optional) Set environment variables:
   - `JWT_SECRET`: Your production secret key.
   - `FRONTEND_PORT`: `80` (or leave default).
   - `BACKEND_PORT`: `5000` (or leave default).
5. Deploy! Dokploy will build the multi-stage images, link the internal network, mount the persistent database volume, and configure reverse proxy routing.

---

## 🐳 Local Docker Deployment

Run the entire stack locally with:

```bash
docker compose up -d --build
```

- **Web Portal**: http://localhost
- **Backend API**: http://localhost:5000/api
- **Persistent Data**: SQLite database stored in named volume `stock_data`.

---

## 📱 Mobile App (Android / iOS via Expo Go)

Located in `mobile/`:
```bash
cd mobile
npx expo start
```
Scan the QR code with **Expo Go** on Android to run the mobile suite.
