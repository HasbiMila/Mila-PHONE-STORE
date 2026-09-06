# MILA PHONE STORE — Full-Stack Production Starter

Versi ini adalah kode sumber full-stack yang bisa dijalankan sendiri.

## Fitur
- Frontend toko premium responsive
- Katalog + pencarian + filter brand
- Keranjang persisten di browser
- Checkout WhatsApp
- Database SQLite persisten
- Login admin dengan bcrypt + session
- Dashboard omzet/pesanan/terjual/stok menipis
- CRUD produk
- Upload foto produk
- Stok divalidasi dan dikurangi saat order
- Manajemen status pesanan
- Store settings
- Seed produk demo
- Struktur siap dikembangkan ke payment gateway

## Jalankan
1. Install Node.js 18+.
2. Extract ZIP.
3. Jalankan:
   npm install
4. Copy `.env.example` menjadi `.env` dan ubah password admin + SESSION_SECRET.
5. Jalankan:
   npm start
6. Buka `http://localhost:3000`
7. Admin: `http://localhost:3000/admin`

## Penting untuk production
- Set SESSION_SECRET acak yang panjang.
- Gunakan HTTPS.
- Ganti password admin default melalui environment.
- Gunakan reverse proxy/hosting yang mendukung Node.js.
- Untuk trafik besar, pindahkan SQLite ke PostgreSQL/MySQL.
- Untuk upload gambar skala besar, gunakan object storage.
- Tambahkan rate limiting, CSRF protection, backup database, dan payment gateway sebelum transaksi uang nyata.

## Deployment
Project ini dapat dideploy ke platform Node.js seperti Render, Railway, VPS, atau server Node.js lain. Pastikan persistent disk digunakan jika tetap memakai SQLite/uploads.

## WhatsApp
Nomor WhatsApp dapat diubah dari Dashboard Admin > Pengaturan. Format internasional tanpa tanda `+`, misalnya `62812xxxxxxx`.
