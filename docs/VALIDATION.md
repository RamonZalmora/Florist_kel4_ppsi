# Hasil validasi implementasi

Lingkungan yang diuji: Node.js 24.19, PostgreSQL 17 pada Docker Compose, Chromium sistem `/usr/bin/chromium`. Ini adalah validasi pada instance pengembangan saat ini; belum ada deploy, publish environment, atau uji restore pada cloud task baru.

| Pemeriksaan | Hasil akhir |
|---|---|
| `bash scripts/setup.sh` | Lulus: install frozen lockfile (`npm ci`), database healthy, migrasi dan seed ulang tanpa duplikasi, build berhasil |
| `npm run build` | Lulus: bundle React/Vite produksi |
| `npm test` | **8 lulus**, 0 gagal, 0 skipped |
| `npm run test:e2e` | **8 lulus**, 0 gagal, desktop dan mobile; proses keluar 0 |
| `npm run format:check` | Lulus |
| `GET /api/health` | HTTP 200, database PostgreSQL terhubung |
| `bash scripts/backup-db.sh` | Lulus, dump non-kosong tersimpan pada `.local/backups/`, tidak masuk Git |
| `git diff --check` | Lulus |

## Perilaku yang diverifikasi

- Katalog publik, pencarian, kategori rekomendasi, detail produk termasuk jenis/ukuran/harga.
- Form admin membuat kategori dan produk, mengubah harga produk, membuat rekomendasi; API publik menampilkan hasil database yang sesuai.
- Login admin/owner, cookie HttpOnly, hash bcrypt, pembatasan role di backend, validasi CSRF, penolakan kredensial salah.
- Pencatatan dan perubahan pesanan; total dihitung dari harga database meskipun client mengirim total palsu.
- Transaksi rollback untuk produk tidak ditemukan; penolakan item berulang dan tanggal tidak valid.
- Status wajib Baru → Diproses → Selesai. Dua permintaan penyelesaian bersamaan menghasilkan tepat satu Sale.
- Pesanan selesai tidak bisa diubah/dihapus/dibatalkan, owner tidak memiliki kontrol mutasi.
- Filter periode laporan, periode kosong, PDF dengan signature `%PDF-` dan unduhan nyata melalui browser.
- Tidak ada overflow horizontal pada halaman katalog, dashboard dan laporan di viewport 1440×1000 dan 390×844. Tabel panjang memiliki scroll internal.
- Browser pelanggan tidak mengeluarkan error JavaScript. Screenshot akhir tersedia pada `docs/screenshots/`.
- Data tes sementara dibersihkan. Kondisi akhir: 6 produk, 4 kategori, 8 rekomendasi, 7 pesanan demo dan 4 penjualan demo.

Tes browser awal gagal karena pencari menu mengabaikan badge jumlah, asumsi urutan produk, cara mencari label select, dan konteks cookie cleanup yang berbeda dari browser. Pencari dan cleanup tes diperbaiki; seluruh rangkaian final selesai dengan hasil di atas. Tidak ada assertion yang dinonaktifkan. Pengunduhan browser Playwright diblokir kebijakan domain; pengujian memakai Chromium sistem yang sudah tersedia.

## Belum dilakukan / batas versi

Deploy, domain, TLS produksi, publish/restore task baru, load testing, integrasi pembayaran, dan audit aksesibilitas lengkap belum dilakukan. Kontak toko nyata belum diberikan; tombol kanal digital menunggu konfigurasi. Foto produk masih ilustrasi demo dengan URL yang dapat diedit; upload berkas foto belum tersedia. Daftar pesanan dibatasi 500 terbaru; laporan memakai semua penjualan dalam periode. CI telah ditulis, tetapi hasil GitHub Actions baru dapat dibuktikan setelah workflow dijalankan di GitHub.
