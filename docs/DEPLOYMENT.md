# Catatan hosting — ditunda

**Status: tidak ada deployment yang dilakukan. Fokus proyek saat ini hanya localhost. Tidak perlu membuat akun layanan di bawah untuk menjalankan aplikasi.**

## Opsi masa depan: Render + Neon + Resend

Aplikasi lokal dan konfigurasi deployment sudah disiapkan. Publikasi memerlukan akun layanan yang dimiliki pengguna. Tidak ada URL online yang dianggap berhasil sebelum pemeriksaan pada URL publik selesai. Ketersediaan paket gratis, kuota, sleep, region, dan biaya mengikuti ketentuan terbaru masing-masing penyedia; periksa sebelum membuat layanan.

## 1. Neon: database permanen

1. Daftar di https://neon.tech dan buat project PostgreSQL. Pilih region dekat region aplikasi Render.
2. Di panel Connect, pilih koneksi PostgreSQL untuk aplikasi Node.js; gunakan URL pooled untuk runtime bila tersedia.
3. Simpan URL pada pengaturan rahasia aplikasi Render sebagai `DATABASE_URL`, bukan pada repositori/chat. Gunakan TLS dengan verifikasi sertifikat (`sslmode=verify-full` bila memilih parameter eksplisit); jangan menonaktifkan pemeriksaan sertifikat.
4. Database di hosting harus memakai `DB_DRIVER=postgres`. Folder PGlite lokal tidak digunakan untuk data produksi karena filesystem layanan hosting dapat bersifat sementara.

Database dapat dilihat melalui **SQL Editor** pada dashboard Neon. Untuk pengguna owner, halaman **Data bisnis** juga menyediakan tabel baca-saja, paginasi, dan ekspor JSON tanpa akun, hash password, atau token. JSON ini adalah ekspor data bisnis, bukan backup database lengkap; gunakan fasilitas backup/restore PostgreSQL untuk pemulihan menyeluruh.

## 2. Render: website dan backend

1. Daftar di https://render.com dan hubungkan akses GitHub ke repositori ini.
2. Pilih pembuatan **Web Service**, runtime **Node**, branch `main`. `render.yaml` tersedia jika menggunakan Blueprint.
3. Build command: `npm ci && npm run build`.
4. Start command: `node scripts/start-cloud.js`.
5. Health check: `/api/health`.
6. Isi variabel berikut melalui Environment pada Render:

| Nama | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `DB_DRIVER` | `postgres` |
| `DATABASE_URL` | Koneksi Neon rahasia |
| `PUBLIC_URL` | Alamat HTTPS layanan yang ditampilkan Render, tanpa path |
| `COOKIE_SECURE` | `true` |
| `TRUST_PROXY` | `1` untuk satu reverse proxy Render |
| `SEED_DEMO` | `false` untuk instalasi bisnis tanpa transaksi fiktif |
| `SEED_ADMIN_PASSWORD` | Password awal admin yang kuat, minimal 12 karakter |
| `SEED_OWNER_PASSWORD` | Password awal owner yang kuat dan berbeda |
| `RESEND_API_KEY` | API key Resend rahasia |
| `MAIL_FROM` | Nama dan alamat pengirim yang diizinkan/terverifikasi di Resend |
| `STORE_WHATSAPP` | Nomor WhatsApp asli dengan kode negara |
| `STORE_INSTAGRAM` | URL profil toko yang asli |
| `STORE_ADDRESS` | Alamat toko |

Render menyediakan `PORT`; aplikasi sudah membacanya. Jangan memasukkan `.env` lokal ke Git. `scripts/start-cloud.js` menolak mode embedded untuk hosting, memeriksa URL HTTPS, menjalankan migrasi berversi, membuat akun awal bila belum ada, lalu memulai server. Password seed tidak menimpa akun yang sudah ada. Setelah akun dibuat, ganti password melalui Pengaturan dan simpan kredensial baru secara aman.

Jalankan deploy dari dashboard. Jika Render belum menyediakan URL ketika mengisi variabel, buat layanan dahulu, ambil URL yang ditampilkan, isi `PUBLIC_URL`, lalu lakukan deploy kembali. Jangan memakai URL contoh/domain yang belum dimiliki.

Mode `SEED_DEMO=false` membuat katalog awal kosong. Admin mengisi produk dan kategori sebenarnya, menghubungkan rekomendasi, dan mulai mencatat pesanan. Untuk demonstrasi terpisah, `SEED_DEMO=true` menambahkan data fiktif saat katalog kosong; jangan campur transaksi contoh dengan data bisnis sebenarnya.

## 3. Resend: email akun

1. Daftar di https://resend.com, buat API key, dan simpan pada `RESEND_API_KEY` di Render.
2. Siapkan pengirim yang diizinkan Resend. Untuk mengirim ke pengguna umum, verifikasi domain melalui record DNS yang diberikan Resend, lalu isi `MAIL_FROM`.
3. Mode pengujian/alamat bawaan Resend dapat membatasi penerima ke email pemilik akun. Ini belum cukup untuk pemulihan akun pengguna umum. Jika belum memiliki domain/pengirim terverifikasi, fitur email belum siap dipakai secara umum.
4. Login sebagai admin/owner, buka **Pengaturan → Email pemulihan**, isi email dan password saat ini, lalu buka tautan verifikasi dari email.
5. Setelah terverifikasi, coba **Lupa password** dari halaman login. Tautan berlaku 15 menit, hanya dapat dipakai sekali; reset mengakhiri seluruh sesi akun.

Token disimpan sebagai hash dan ditempatkan pada fragmen URL agar tidak dikirim sebagai path/query HTTP. Halaman menghapus fragmen dari address bar setelah dibaca. Jangan membagikan email/tautan pemulihan. Jika layanan email belum diatur, UI menampilkan keterbatasannya dan tidak mengklaim email berhasil dikirim.

## 4. Checklist setelah deploy

- Halaman katalog/login dan aset gambar dapat dibuka dari jaringan di luar laptop.
- `/api/health` memberi HTTP 200 dengan `driver: postgres`.
- Login admin dan owner berhasil melalui HTTPS; owner tidak bisa mengubah data admin.
- Produk yang dibuat tetap ada setelah restart/deploy ulang.
- Pesanan → diproses → selesai menghasilkan tepat satu penjualan.
- Owner dapat mengunduh PDF, melihat agenda, tabel bisnis dan ekspor JSON.
- Verifikasi email dan lupa password benar-benar sampai ke penerima, bukan hanya respons API.
- Data contoh dipisahkan, kontak serta foto produk toko diperiksa, backup PostgreSQL tersedia.

Pengujian lokal otomatis tidak menggantikan checklist URL publik ini. Jangan menandai deploy selesai hanya karena build berhasil.

## Status verifikasi

Integrasi email diuji dengan transport pengujian; pengiriman Resend nyata, koneksi Neon milik pengguna, eksekusi Render, dan URL publik belum diverifikasi karena kredensial/akun belum tersedia pada runner. Setelah variabel diisi melalui pengaturan aman, langkah deploy dan pemeriksaan publik dapat dilanjutkan. Tidak diperlukan plugin tambahan.
