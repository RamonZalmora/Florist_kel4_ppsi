# Validasi mode lokal

Mode utama: Node.js langsung, PGlite pada disk, frontend Vite dengan hot reload. Docker tidak diperlukan oleh instalasi, aplikasi, maupun CI.

## Hasil

| Pemeriksaan | Hasil |
|---|---|
| Setup pertama dan setup ulang | Migrasi, seed, build berhasil; akun/katalog yang sudah ada dipertahankan |
| `npm test` | 11 lulus, 0 gagal, 0 skipped |
| `npm run test:e2e` | 8 lulus, desktop dan HP, melalui frontend Vite dan backend lokal |
| Build frontend | Berhasil |
| Pemeriksaan format dan whitespace | Lulus |
| Startup `npm run dev` | Backend siap lebih dahulu, lalu frontend pada port 3000 |
| Hot reload CSS | Perubahan gaya muncul di browser tanpa build atau reload halaman; file uji dikembalikan |
| Inspeksi dan backup database | Berhasil; snapshot tersimpan di folder Git-ignored |
| Persistensi/restart dan restore | Data tetap ada; restore memakai folder baru dan menolak overwrite |
| Pencegahan dua penulis | Database menolak proses kedua pada folder yang sedang dipakai |
| Duplikasi server dev | Ditolak pada pemeriksaan port sebelum menyentuh database aktif |

Pengujian dilakukan pada Linux cloud, Node.js 24.19, PGlite yang dipin lockfile, dan Chromium sistem. Pengujian langsung pada Windows belum dilakukan; script setup/dev menggunakan Node.js lintas platform dan dokumentasi Windows menggunakan `npm.cmd`.

## Perilaku yang diperiksa

- Katalog publik, pencarian, detail produk, dan filter rekomendasi.
- Form kategori/produk/rekomendasi mengubah data API/database, termasuk harga.
- Login, bcrypt, cookie HttpOnly, CSRF, dan pembatasan role pada server.
- Total pesanan dihitung server, validasi tanggal/item, dan rollback transaksi.
- Dua permintaan penyelesaian pesanan menghasilkan tepat satu penjualan.
- Owner hanya membaca pesanan/penjualan; PDF periode dapat diunduh dari browser.
- Import fixture menjaga ID, relasi, hash akun, harga/subtotal, dan sequence; target berisi data ditolak.
- Backup lokal dapat direstore ke folder baru; sesi dibersihkan setelah restore.
- Seluruh data tes backend menggunakan folder sementara terpisah; data browser sementara dibersihkan. Database aplikasi kembali berisi 6 produk, 4 kategori, 8 rekomendasi, 7 pesanan contoh dan 4 penjualan contoh.

## Batas verifikasi

Import dari PostgreSQL nyata pada laptop pengguna belum dapat dijalankan dari runner ini. Script koneksi tersedia; logika transfer diuji memakai fixture PostgreSQL-compatible. Database sumber tidak diubah dan transfer tujuan memakai transaksi.

CI sudah diperbarui agar tanpa layanan Docker; hasil GitHub Actions baru dapat dinyatakan setelah eksekusinya diamati. Deployment, domain/HTTPS produksi, pengujian beban, serta audit keamanan/aksesibilitas lengkap belum dilakukan. Mode PGlite ditujukan untuk satu proses pada satu laptop; PostgreSQL eksternal tetap tersedia untuk lingkungan server.
