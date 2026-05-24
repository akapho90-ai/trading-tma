# 🚀 Panduan Deploy Trading Dashboard v2.0 ke Telegram

## Yang Baru di v2.0
- ✅ Harga Forex & Saham REAL dari Alpha Vantage API
- ✅ Ticker strip di header sinkron dengan harga live
- ✅ Win Rate di kalkulator bisa diubah sendiri
- ✅ Validasi kalkulator: warning jika net harian negatif
- ✅ Chart kalkulator titik dinamis (tidak terpotong)
- ✅ Telegram SDK terintegrasi (nama user muncul otomatis)
- ✅ Key unik pada semua list (tidak pakai index)
- ✅ vite.config.js dengan base './' (support semua hosting)

---

## Gambaran Besar
```
Kode → GitHub → Vercel (hosting gratis) → BotFather → Telegram Mini App ✅
```

---

## LANGKAH 1 — Buat Akun GitHub (jika belum punya)
1. Buka https://github.com
2. Klik **Sign up** → isi email, password, username
3. Verifikasi email

---

## LANGKAH 2 — Upload Kode ke GitHub

### A. Buat repository baru
1. Login GitHub → klik tombol **+** (pojok kanan atas) → **New repository**
2. Isi:
   - Repository name: `trading-tma`
   - Pilih: **Public**
3. Klik **Create repository**

### B. Upload file-file ini ke GitHub
Struktur folder yang harus ada:
```
trading-tma/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx
```

---

## LANGKAH 3 — Deploy ke Vercel (GRATIS)

1. Buka https://vercel.com
2. Klik **Sign Up** → pilih **Continue with GitHub**
3. Setelah login, klik **Add New Project**
4. Pilih repo `trading-tma` → klik **Import**
5. Di halaman konfigurasi:
   - **Framework Preset**: pilih **Vite**
   - Sisanya biarkan default
6. Klik **Deploy**
7. Tunggu 1–2 menit → URL seperti:
   ```
   https://trading-tma-abc123.vercel.app
   ```
   **Simpan URL ini!**

---

## LANGKAH 4 — Buat Bot Telegram

1. Buka Telegram → cari **@BotFather**
2. Ketik `/newbot`
3. Ikuti instruksi (nama bot, username)
4. Simpan **token** yang diberikan — jangan dibagikan!

---

## LANGKAH 5 — Sambungkan Web App ke Bot

Masih di chat dengan **@BotFather**:

1. Ketik `/mybots` → pilih bot kamu
2. Klik **Bot Settings** → **Menu Button** → **Configure menu button**
3. Masukkan URL Vercel kamu (https, bukan http)
4. Masukkan teks tombol: `📊 Buka Dashboard`

---

## LANGKAH 6 — Test

1. Buka bot kamu di Telegram
2. Klik tombol **📊 Buka Dashboard**
3. Dashboard akan terbuka langsung di dalam Telegram!

---

## ℹ️ Tentang Alpha Vantage API

- API Key sudah tertanam di App.jsx
- Free tier: **25 request/menit**, **500 request/hari**
- App melakukan refresh harga setiap **60 detik** untuk hemat quota
- Jika limit tercapai, app otomatis beralih ke **mode simulasi** (tetap berjalan, harga tidak real)
- Indikator: `● hijau` = harga real API, `◎ abu` = simulasi

---

## ❓ Troubleshoot

| Masalah | Solusi |
|---|---|
| Vercel error "Build failed" | Pastikan semua 5 file sudah benar |
| App tidak muncul di Telegram | Pastikan URL di BotFather pakai https |
| Nama tidak muncul | Normal jika buka dari browser biasa |
| Harga tidak berubah | API limit tercapai, mode simulasi aktif |
| Tampilan kacau | Clear cache Telegram: Settings → Advanced → Clear cache |

---

## 📌 Catatan Penting

- Hosting Vercel **gratis** untuk proyek personal
- Update kode: edit file di GitHub → Vercel otomatis rebuild
- API Alpha Vantage gratis sudah cukup untuk penggunaan personal
