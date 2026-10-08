# Bien Vendre · Florist & Gifts

Website katalog dan manajemen penjualan untuk bisnis florist. Bien Vendre membantu pelanggan menemukan rangkaian bunga untuk momen istimewa, serta membantu tim toko mengelola produk, pesanan, dan laporan penjualan dalam satu tempat.

Antarmuka tersedia dalam bahasa Indonesia, menggunakan mata uang rupiah dan zona waktu Asia/Jakarta.

![Dashboard Bien Vendre](docs/screenshots/admin-desktop.png)

## Fitur

- Katalog produk dengan pencarian, foto, harga, jenis bunga, ukuran, dan deskripsi.
- Rekomendasi produk berdasarkan kategori momen, seperti ulang tahun, wisuda, dan pernikahan.
- Pengelolaan produk, kategori, dan rekomendasi oleh admin.
- Pencatatan pesanan dengan beberapa produk dan permintaan khusus pelanggan.
- Pemantauan status pesanan dan ringkasan pelanggan.
- Dashboard penjualan, riwayat transaksi, dan laporan PDF berdasarkan periode.
- Tampilan responsif untuk desktop dan smartphone.

## Akses pengguna

| Pengguna | Akses |
|---|---|
| Pelanggan | Melihat katalog, detail, dan rekomendasi tanpa login; menghubungi toko melalui kanal yang tersedia. |
| Admin | Mengelola katalog, kategori, rekomendasi, serta mencatat dan memperbarui pesanan. |
| Owner | Memantau pesanan dan penjualan serta mengunduh laporan PDF. |

Pelanggan memilih produk dan berkonsultasi dengan toko. Admin kemudian mencatat pesanan dan memprosesnya hingga selesai. Pesanan selesai otomatis masuk ke riwayat penjualan. Harga transaksi tetap tersimpan meskipun harga produk di katalog berubah.

## Menjalankan website

**Persiapan:** instal [Docker Desktop](https://www.docker.com/products/docker-desktop/), buka aplikasinya, dan tunggu hingga **Engine running**. Di Windows, gunakan mode Linux containers / WSL 2. Website dan database dijalankan melalui Docker; Node.js dan PostgreSQL tidak perlu diinstal terpisah.

### 1. Unduh proyek

Unduh melalui [GitHub](https://github.com/RamonZalmora/Florist_kel4_ppsi) → **Code → Download ZIP**, lalu ekstrak. Buka folder yang berisi `compose.yaml` dan `Dockerfile`.

Jika menggunakan Git:

```bash
git clone https://github.com/RamonZalmora/Florist_kel4_ppsi.git
cd Florist_kel4_ppsi
```

### 2. Jalankan setup

**Windows:** di folder proyek, klik kolom alamat File Explorer, ketik `powershell`, lalu tekan Enter. Jalankan:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-docker.ps1
```

Pengaturan execution policy hanya berlaku pada proses tersebut.

**Linux/macOS:** buka terminal di folder proyek, lalu jalankan:

```bash
bash scripts/setup-docker.sh
```

Setup membuat konfigurasi lokal dan akun awal, membangun website, lalu menjalankan aplikasi beserta database. Unduhan pertama dapat membutuhkan beberapa menit. Konfigurasi dan data yang sudah ada dipertahankan.

### 3. Buka browser

Setelah setup selesai, buka:

| Halaman | Alamat |
|---|---|
| Katalog pelanggan | http://localhost:3000/catalog |
| Login admin dan owner | http://localhost:3000/login |

Untuk memeriksa apakah layanan siap, jalankan `docker compose ps`. Layanan `web` dan `db` harus berstatus **healthy**.

### 4. Login ke dashboard

Password awal dibuat secara acak dan disimpan dalam file `.env` di folder proyek.

| Username | Password yang digunakan |
|---|---|
| `admin` | Nilai `SEED_ADMIN_PASSWORD` di `.env` |
| `owner` | Nilai `SEED_OWNER_PASSWORD` di `.env` |

Di Windows, file tersebut dapat dibuka dengan `notepad .env`. Salin nilai setelah tanda `=` sesuai akun yang digunakan. Simpan file ini secara pribadi; jangan unggah ke GitHub.

Setup tidak mengganti password akun yang sudah ada. Mengubah variabel `SEED_*` tidak mereset password akun lama.

## Penggunaan sehari-hari

Jalankan perintah berikut dari folder proyek. Docker Desktop harus tetap berjalan; terminal boleh ditutup setelah aplikasi aktif.

| Kebutuhan | Perintah |
|---|---|
| Menyalakan website | `docker compose up -d --wait` |
| Menghentikan website dan database | `docker compose stop` |
| Menerapkan pembaruan kode | `docker compose up -d --build --wait` |
| Memeriksa status | `docker compose ps` |
| Melihat pesan error | `docker compose logs --tail 80 web db` |

Jika memakai Git, ambil pembaruan dengan `git pull origin main` sebelum membangun ulang aplikasi.

Jika port 3000 sedang digunakan, tambahkan `WEB_PORT=3001` pada `.env`, jalankan kembali `docker compose up -d --wait`, lalu buka `http://localhost:3001/catalog`.

## Konfigurasi toko

Isi pengaturan berikut pada `.env` menggunakan informasi toko yang sebenarnya:

| Variabel | Isi |
|---|---|
| `STORE_WHATSAPP` | Nomor WhatsApp dengan kode negara, hanya angka. |
| `STORE_INSTAGRAM` | URL lengkap profil Instagram toko. |
| `STORE_ADDRESS` | Alamat toko. |

Setelah diubah, jalankan `docker compose up -d web`. Kanal WhatsApp dan Instagram ditampilkan setelah dikonfigurasi.

Instalasi awal menyertakan produk, ilustrasi, dan transaksi contoh untuk mencoba fitur. Ganti informasi serta gambar produk melalui dashboard sebelum digunakan untuk operasional toko. Gambar produk saat ini menggunakan URL HTTPS atau aset lokal; unggah berkas foto belum tersedia.

## Data dan keamanan

PostgreSQL menyimpan data pada volume `florist_db`, sehingga data tetap tersedia ketika layanan dihentikan atau dinyalakan kembali. Pertahankan `.env` agar konfigurasi akses sesuai dengan database yang sudah digunakan. **Jangan menjalankan `docker compose down -v` jika data perlu dipertahankan**, karena perintah tersebut menghapus volume database.

Password akun di-hash dengan bcrypt. Server memvalidasi input, memeriksa hak akses, dan melindungi perubahan data dengan token CSRF. Total pesanan dihitung di server; penyelesaian pesanan dan pencatatan penjualan dilakukan dalam satu transaksi database untuk mencegah penjualan ganda. Pesanan selesai tidak dapat diubah atau dihapus.

Backup melalui Bash / Git Bash:

```bash
bash scripts/backup-db.sh
```

Backup tersimpan di `.local/backups/`. Simpan secara aman karena berisi data pelanggan dan informasi akun.

## Teknologi dan pengembangan

| Komponen | Teknologi |
|---|---|
| Frontend | React, Vite, Lucide |
| Backend | Node.js 22+, Express, Zod |
| Database | PostgreSQL 17 |
| Laporan | PDFKit |
| Infrastruktur lokal | Docker, Docker Compose |
| Pengujian | Node.js Test Runner, Playwright |

Dockerfile menggunakan multi-stage build dan menjalankan aplikasi sebagai user non-root. Compose menjalankan `web` dan `db`, menunggu database siap, lalu menerapkan migrasi sebelum website aktif.

Untuk pengembangan dengan perubahan kode langsung terbaca, instal Node.js 22+ dan npm di host:

```bash
docker compose stop web
bash scripts/setup.sh
# Terminal pertama
npm run dev
# Terminal kedua
npm run web:dev
```

Vite menampilkan alamat frontend di terminal dan meneruskan permintaan API ke backend. Mode npm memakai `DATABASE_URL` pada `.env`; container web terhubung ke database melalui hostname `db` secara otomatis.

Pemeriksaan pengembangan:

```bash
npm run build
npm test
npm run test:e2e
npm run format:check
```

Gunakan database pengembangan untuk pengujian. Tes browser membutuhkan aplikasi yang aktif, katalog contoh, dan Chromium; atur `CHROMIUM_PATH` jika lokasi browser berbeda dari `/usr/bin/chromium`. `E2E_BASE_URL` dapat diatur untuk port aplikasi yang berbeda.

Dokumentasi teknis: [struktur database](docs/DATABASE.md) dan [hasil validasi](docs/VALIDATION.md). Runner cloud dengan proxy platform menggunakan `scripts/setup-cloud-docker.sh` untuk menyiapkan koneksi build dan sertifikat tepercaya.

## Status pengembangan

Website dapat dijalankan secara lokal dengan Docker. Akses publik melalui domain dan konfigurasi produksi belum disiapkan. Pemesanan dikelola melalui konsultasi dan pencatatan admin; pembayaran online serta pengelolaan akun lanjutan belum tersedia. Daftar pesanan menampilkan maksimal 500 pesanan terbaru, sedangkan laporan mencakup semua penjualan dalam periode yang dipilih.
