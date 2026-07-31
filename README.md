# JAGA PERAIRAN — HAB (Harmful Algal Bloom) Early Warning

Deteksi kepadatan fitoplankton dari citra mikroskop dan peringatan dini bloom
(AMAN / WASPADA / BAHAYA) berdasarkan kepadatan partikel berbahaya.

## Apa yang nyata vs demo
- **Berjalan end-to-end pada piksel nyata:** deteksi partikel (thresholding +
  connected-components) dan klasifikasi **berdasarkan ukuran** di
  `service/app/engine.py`. Ini **detektor klasik placeholder**, *bukan* model
  spesies terlatih — ia membedakan "harmful-like" dari benign lewat ukuran blob,
  bukan identifikasi spesies. Ganti `detect()` dengan detektor terlatih untuk
  deployment nyata.
- **Sintetis:** citra mikroskop dibangkitkan (`synth_field`) dengan partikel
  besar-gelap (harmful-like) dan kecil-terang (benign). Endpoint `/detect` juga
  menerima citra nyata (base64).

## Arsitektur
```
Web (Vercel, client-side)             Docker stack
  citra + overlay + alert    │        gateway (Go) :8080 ─► service (FastAPI) :8000
  deteksi blob di browser    │        reverse proxy       deteksi + klasifikasi + alert
```

## Quickstart (Docker)
```bash
docker compose up --build
curl -X POST localhost:8080/synthetic/detect -H 'content-type: application/json' \
  -d '{"harmful":22,"benign":35,"seed":3,"return_image":false}'
```

## API
| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | status |
| POST | `/detect` | deteksi dari citra base64 (`image_b64`) |
| POST | `/synthetic/detect` | bangkitkan citra lalu deteksi; opsi kembalikan PNG base64 |

## Web demo (Vercel)
`web/` situs statis; atur kepadatan spesies berbahaya untuk melihat overlay
deteksi dan tingkat peringatan. Lokal: `cd web && python3 -m http.server 5173`.

## Struktur
```
gateway/  Go reverse proxy
service/  FastAPI + detektor klasik (placeholder)
web/      Vercel client-side demo
docker-compose.yml
```
> Gateway Go belum di-compile di lingkungan build ini; `docker compose build` yang meng-compile.
