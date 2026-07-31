# Deployment Guide — JAGA PERAIRAN

Dua target terpisah: **(A) backend nyata via Docker** dan **(B) frontend demo via Vercel**.
Keduanya independen — Vercel tidak menjalankan Docker.

## Prasyarat
- Docker + Docker Compose v2
- (Untuk Vercel) akun Vercel + Vercel CLI (`npm i -g vercel`) atau import repo Git

## A. Backend lokal (Docker)
```bash
docker compose up --build      # gateway :8080  -> service :8000
curl localhost:8080/gateway/health
curl localhost:8080/health
curl -X POST localhost:808022,"benign" -H 'content-type: application/json' -d '{"harmful"'
```
Hentikan: `docker compose down`.

**Variabel lingkungan (gateway):** `SERVICE_URL` (default `http://service:8000`), `PORT` (default `8080`).

**Troubleshooting:** pastikan service `healthy` (`docker compose ps`) sebelum
gateway melayani; healthcheck menahan gateway hingga service siap.

## B. Frontend (Vercel)
Folder `web/` adalah situs statis (tanpa build step).

**Opsi 1 — Vercel CLI:**
```bash
cd web
vercel            # preview
vercel --prod     # production
```

**Opsi 2 — Import Git di dashboard Vercel:**
1. Push repo ke GitHub.
2. Vercel → New Project → import repo.
3. **Root Directory: `jaga-perairan/web`** · Framework: **Other** · Build Command kosong · Output Directory: `.`
4. Deploy.

**Verifikasi:** buka URL Vercel; ubah kontrol — visual dan hasil harus ter-update
sepenuhnya di browser (tanpa backend).

## Menghubungkan ke backend nyata (opsional)
Frontend default mandiri. Untuk memakai layanan Python: host backend Docker di
server publik (TLS), lalu arahkan `web/app.js` ke `{BACKEND_URL}22,"benign"`.
Jangan pakai `localhost` — Vercel tak bisa menjangkaunya.
