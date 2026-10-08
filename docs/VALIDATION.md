# Hasil validasi implementasi

## Pembaruan: website dan database dalam Docker

Validasi aktual pada Linux cloud dengan Docker Engine 28.4 dan Compose 2.40.3:

| Pemeriksaan | Hasil |
|---|---|
| Build Dockerfile multi-stage | Lulus, Node.js 22 Alpine, frontend dikompilasi Vite di build stage |
| Startup Compose | `web` dan `db` healthy; web menunggu database lalu migrasi dan seed |
| HTTP dari container web | `/catalog`, `/login`, `/api/health`, `/api/products` HTTP 200 |
| `npm test` | 8 lulus, 0 gagal |
| `E2E_BASE_URL=http://127.0.0.1:3001 npm run test:e2e` | 8 lulus, 0 gagal; browser desktop dan HP mengakses web container |
| Instalasi kosong | Bootstrap .env dari Node container; PostgreSQL baru; login admin/owner berhasil; 6 produk dan 7 pesanan demo |
| Restart instalasi kosong | Login owner dan 7 pesanan dipertahankan, seed tidak ganda |
| Runtime image | UID 1000 (non-root), tidak membawa `.env`, sertifikat build, atau compiler Vite |
| `scripts/setup-cloud-docker.sh` | Lulus, build ulang memakai cache dan startup pada port default 3000 |
| Pemeriksaan format dan whitespace | Lulus |

Volume database proyek yang sudah ada dipertahankan. Database/volume percobaan baru dibuat pada project Compose terpisah dan dihapus setelah pengujian; volume proyek utama tidak dihapus.

Build awal terhambat DNS proxy dan trust certificate dalam BuildKit cloud. Koreksi memakai pemetaan DNS proxy yang tersedia, build proxy bawaan Docker, serta bundle CA tepercaya melalui mount build secret opsional. TLS dan integrity package tetap diverifikasi. Helper cloud menulis referensi variabel proxy, bukan nilai kredensial, ke `.local/cloud-compose.json` yang diabaikan Git. Laptop tidak memerlukan helper cloud ini.

Panduan dan script PowerShell disediakan untuk Windows; eksekusi pada Windows/Docker Desktop belum diuji langsung karena runner ini Linux. Alur Docker, bootstrap Node container, startup kosong, restart, dan browser telah diuji sebagaimana di atas. Deploy tetap belum dilakukan. CI ditambah build Dockerfile; hasil eksekusinya di GitHub belum diverifikasi.

## Validasi implementasi awal

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
