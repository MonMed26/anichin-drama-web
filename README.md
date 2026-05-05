# DramaKilat — Web Nonton Drama Pendek

[![Status](https://img.shields.io/badge/status-static%20site-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Aggregator drama pendek (short drama) berbasis browser. Mengambil data dari
[Anichin API](https://github.com/NingRong2/anichin-api) yang menyatukan 14+ platform
seperti **ReelShort**, **ShortMax**, **DramaNova**, **GoodShort**, dll. dalam satu skema endpoint.

## Fitur

- 🔥 **Trending** — daftar drama populer per sumber
- ✨ **For You** — feed rekomendasi
- 🔎 **Search** — cari drama berdasarkan judul
- 🎬 **Detail drama** — sinopsis + daftar episode (badge gembok untuk episode premium)
- ▶️ **Player** dengan dukungan:
  - HLS (`.m3u8`) via [hls.js](https://github.com/video-dev/hls.js)
  - MP4 native
  - Pemilih kualitas (1080p / 720p / 540p / 480p)
  - Subtitle multi-bahasa (jika tersedia dari sumber)
  - Tombol previous / next episode
- 🎯 **Source switcher** — ganti sumber drama (preferensi disimpan di `localStorage`)
- 🌙 Dark theme bergaya streaming, mobile-first responsive

## Teknologi

- HTML + CSS + JavaScript murni (tidak butuh build step)
- [Tailwind CSS](https://tailwindcss.com) via CDN
- [hls.js](https://github.com/video-dev/hls.js) via CDN
- Hash-based router (single-page app)

## Cara menjalankan secara lokal

Cukup serve folder ini lewat HTTP server apa pun. Contoh:

```bash
# Python 3
python3 -m http.server 8000

# atau Node.js
npx serve -l 8000 .
```

Lalu buka <http://localhost:8000>.

> Tidak boleh dibuka via `file://` karena CORS — wajib via HTTP server.

## Konfigurasi

API key trial sudah di-embed di `app.js`:

```js
const API_KEY = 'TRIAL-ANICHIN-2026';
```

Token trial ini gratis dengan rate limit **50 req/menit**. Untuk produksi, ganti dengan token premium yang Anda dapatkan dari Anichin.

## Catatan tentang sumber

API mengembalikan format URL berbeda per sumber:

| Sumber | Format video | Status |
|---|---|---|
| ReelShort, ShortMax | HLS `.m3u8` | ✅ Playable |
| DramaNova, GoodShort, NetShort, dll | MP4 / HLS | ✅ Playable |
| Melolo | MP4 + DRM (TikTok CDN) | ⚠️ Mungkin gagal play (DRM) |
| **DramaBox** | `dramabox-hls://` (custom protocol) | ❌ Tidak didukung di browser |

Sumber yang tidak didukung diberi badge `(tidak didukung)` di selector dan halaman detail.

## Struktur file

```
.
├── index.html       # Layout dasar + template card
├── style.css        # Custom styles (skeleton, player, episode buttons)
├── app.js           # Routing, API client, render logic, player
└── README.md
```

## Disclaimer

DramaKilat hanyalah agregator. Semua hak konten dan stream milik platform sumber masing-masing.
Project ini dibuat untuk tujuan demonstrasi penggunaan Anichin API.
