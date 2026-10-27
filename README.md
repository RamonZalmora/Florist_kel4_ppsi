# Bien Vendre · Florist & Gifts

Website katalog dan manajemen penjualan florist dengan tampilan pelanggan, dashboard admin, dan laporan untuk owner. Bahasa Indonesia, mata uang rupiah, dan zona waktu Asia/Jakarta.

![Dashboard Bien Vendre](docs/screenshots/admin-desktop.png)

## Fitur

- Katalog, pencarian, detail produk, dan rekomendasi menurut kategori momen.
- Pengelolaan produk, kategori, rekomendasi, dan pesanan oleh admin.
- Pesanan multi-item, permintaan khusus, status pemrosesan, dan riwayat penjualan.
- Dashboard owner, filter periode penjualan, dan unduhan laporan PDF.
- Login dengan hak akses, password bcrypt, sesi HttpOnly, serta perlindungan CSRF.
- Tampilan responsif untuk desktop dan HP.

| Pengguna | Akses |
|---|---|
| Pelanggan | Katalog, detail, dan rekomendasi tanpa login; konsultasi melalui kanal toko. |
| Admin | Mengelola katalog dan mencatat/memproses pesanan. |
| Owner | Melihat pesanan dan penjualan serta mengunduh laporan. |

## Mulai cepat di Windows

**Fokus saat ini adalah penggunaan lokal. Tidak perlu Render, Neon, Resend, Docker, atau akun layanan tambahan.**

1. Instal [Node.js LTS](https://nodejs.org/) versi 22 atau lebih baru.
2. Unduh/ekstrak kode terbaru ke folder lokal.
3. Klik dua kali **`Mulai-BienVendre.cmd`** pada folder proyek.
4. Tunggu setup selesai. Browser akan diminta membuka katalog secara otomatis. Jika tidak terbuka, ketik `http://localhost:3000/catalog` di browser.
5. Biarkan jendela launcher tetap berjalan. Untuk berhenti tekan Ctrl+C.

Kebutuhan aplikasi diunduh saat pertama kali jika belum terpasang; setelah itu gunakan launcher yang sama. Launcher menjalankan setup idempotent agar migrasi terbaru diterapkan tanpa menimpa data yang sudah ada. Kalau server sedang berjalan, hentikan dahulu sebelum membuka launcher lagi. Setelah perubahan dependency, jalankan `npm.cmd ci` sekali sebelum startup.

Login tim di `http://localhost:3000/login`; password awal admin/owner ada di `.env`. Data disimpan dalam `.local/database`. Memperbarui produk melalui dashboard tidak membutuhkan rebuild; perubahan kode tampilan langsung terbaca dalam mode dev.

Launcher khusus Windows disediakan; pengujian otomatis di runner ini dilakukan pada Linux. Langkah terminal berikut merupakan alternatif.

## Menjalankan di laptop (Tanpa Docker)

**Cukup instal [Node.js LTS](https://nodejs.org/) versi 22 atau lebih baru.** Database lokal berjalan bersama aplikasi; tidak perlu Docker Desktop, WSL, atau instalasi server PostgreSQL.

### 1. Unduh dan buka folder proyek

Unduh dari [GitHub](https://github.com/RamonZalmora/Florist_kel4_ppsi) → **Code → Download ZIP**, lalu ekstrak. Buka folder yang berisi `package.json`. Di kolom alamat File Explorer, ketik `powershell`, lalu Enter.

Jika menggunakan Git, clone repositori atau jalankan `git pull origin main` pada checkout yang sudah ada. Pertahankan `.env` dan folder data lokal.

### 2. Setup pertama

Di PowerShell Windows:

```powershell
npm.cmd install
npm.cmd run setup
```

Di terminal Linux/macOS, gunakan `npm install` dan `npm run setup`. Akhiran `.cmd` di Windows membantu menghindari pembatasan script PowerShell tanpa mengubah execution policy.

Setup membuat `.env` dengan password awal acak jika belum ada, menyiapkan database dan data contoh, lalu membangun website. File `.env` dan data yang sudah ada tidak ditimpa. Koneksi internet diperlukan saat memasang dependensi pertama kali.

### 3. Jalankan website

```powershell
npm.cmd run dev
```

Tunggu alamat frontend muncul di terminal, lalu buka Chrome/Edge:

| Halaman | Alamat |
|---|---|
| Katalog | http://localhost:3000/catalog |
| Login admin/owner | http://localhost:3000/login |

Terminal harus tetap terbuka. Untuk berhenti, tekan **Ctrl+C**. Penggunaan berikutnya cukup `npm.cmd run dev`; tidak perlu mengulang instalasi atau setup.

### 4. Login

Buka konfigurasi lokal dengan `notepad .env`:

| Username | Password awal |
|---|---|
| `admin` | Nilai `SEED_ADMIN_PASSWORD` |
| `owner` | Nilai `SEED_OWNER_PASSWORD` |

Salin nilai setelah tanda `=`. Jangan membagikan `.env` atau memasukkannya ke Git. Mengubah variabel seed tidak mereset password akun yang sudah ada.

## Memperbarui produk dan tampilan

**Data produk:** login sebagai admin → Produk → Tambah/Edit → Simpan. Perubahan langsung tersimpan dalam database. Buka atau refresh katalog untuk melihat data terbaru; tidak perlu build ulang atau restart aplikasi.

**Kode tampilan:** jalankan `npm run dev`, kemudian edit komponen di `web/src/main.jsx`, gaya di `web/src/styles.css`, atau aset di `web/public/assets/`. Vite memperbarui tampilan tanpa build ulang. Backend memakai Node watch agar perubahan kode server terbaca kembali.

Mode pengembangan memakai frontend pada port 3000 dan backend pada port 3001. Permintaan API diteruskan oleh Vite, sehingga pengguna cukup membuka alamat frontend. Jangan menjalankan `npm start` bersamaan dengan mode dev pada port yang sama.

Untuk menjalankan hasil build:

```bash
npm run build
npm start
```

Website hasil build juga memakai port 3000. Perubahan kode frontend memerlukan build ulang pada mode ini.

## Database lokal

Mode default menggunakan **PGlite**, mesin PostgreSQL yang berjalan di dalam proses Node.js. Data disimpan permanen di `.local/database`, bukan hanya di memori. Relasi tabel, foreign key, transaksi, dan histori penjualan tetap digunakan.

```dotenv
DB_DRIVER=pglite
DB_DIRECTORY=.local/database
```

Satu folder database hanya boleh digunakan oleh satu proses aplikasi. Hentikan server sebelum menjalankan setup, inspeksi, backup, atau import; pengunci database mencegah dua proses menulis bersamaan. Jangan hapus `.local/database` jika data ingin dipertahankan. Database ini tidak menyediakan port PostgreSQL untuk koneksi langsung DBeaver.

Untuk melihat jumlah baris tabel dan daftar produk dari terminal setelah server dihentikan:

```bash
npm run db:inspect
```

PostgreSQL eksternal tetap didukung untuk kebutuhan server atau hosting. Isi konfigurasi berikut dengan koneksi milik Anda, lalu jalankan migrasi:

```dotenv
DB_DRIVER=postgres
DATABASE_URL=postgresql://username:password@host:5432/bien_vendre
```

Mode eksternal memerlukan server PostgreSQL yang tersedia. Mode lokal ditujukan untuk pengembangan dan penggunaan pada satu laptop; jangan menggunakan folder PGlite bersama beberapa instance server.

## Beralih dari versi lama

Data PostgreSQL versi Docker **tidak otomatis dipindahkan** ke database lokal. Menghapus konfigurasi Docker dari repositori tidak menghapus container atau volume yang sudah ada di laptop. Pertahankan database lama dan `.env` hingga pemindahan selesai.

Lihat [panduan pemindahan data](docs/MIGRATION.md). Tersedia `npm run db:import` untuk memindahkan akun, hash password, katalog, pesanan, dan penjualan dari PostgreSQL yang masih dapat diakses. Import hanya diizinkan ke database tujuan kosong, sehingga tidak menimpa data lokal yang sudah ada.

## Konfigurasi toko

Isi `STORE_WHATSAPP`, `STORE_INSTAGRAM`, dan `STORE_ADDRESS` pada `.env` menggunakan kontak asli toko. Restart mode dev setelah perubahan konfigurasi. Tombol kanal digital tampil setelah dikonfigurasi.

Data dan ilustrasi awal adalah contoh. Ganti produk, harga, deskripsi, dan gambar melalui dashboard. Foto menggunakan URL HTTPS atau aset lokal; upload berkas langsung belum tersedia.

## Backup dan restore

Hentikan server dengan Ctrl+C terlebih dahulu:

```bash
npm run db:backup
```

Snapshot tersimpan di `.local/backups/` dan memuat data serta hash akun. Simpan aman dan jangan unggah ke Git.

Restore ke folder baru:

```bash
npm run db:restore -- .local/backups/NAMA_BACKUP.tar.gz .local/restored-database
```

Setelah berhasil, ubah `DB_DIRECTORY=.local/restored-database` pada `.env`, lalu jalankan website kembali. Restore menolak folder tujuan yang sudah ada; sesi login lama dibersihkan. Backup format ini untuk PGlite; PostgreSQL eksternal memakai fasilitas backup penyedia database.

## Pengujian

```bash
npm test
npm run build
npm run format:check
# Jalankan aplikasi dahulu, kemudian pada terminal lain:
npm run test:e2e
```

Tes backend memakai database sementara terpisah dari data aplikasi. Tes browser membutuhkan katalog contoh dan akun seed. Chromium default `/usr/bin/chromium`; gunakan `CHROMIUM_PATH` untuk executable lain dan `E2E_BASE_URL` untuk alamat/port berbeda. Detail hasil pengujian ada di [VALIDATION.md](docs/VALIDATION.md).

## Jika tidak bisa berjalan

- `npm` tidak dikenali: pastikan Node.js terinstal, lalu buka terminal baru.
- Script PowerShell diblokir: gunakan `npm.cmd` seperti panduan Windows di atas.
- Port digunakan: tutup server sebelumnya. Untuk port alternatif pada PowerShell, jalankan `$env:WEB_PORT="3002"; $env:API_PORT="3003"; npm.cmd run dev`, lalu buka `http://localhost:3002/catalog`.
- Database sedang dipakai: hentikan proses dev/start sebelum menjalankan perintah database.
- Tabel belum ada: jalankan `npm run setup` saat aplikasi berhenti.

## Teknologi dan batas versi

React, Vite, Lucide, Node.js/Express, PGlite/PostgreSQL, Zod, bcrypt, dan PDFKit. Struktur tabel dan aturan penjualan dijelaskan di [DATABASE.md](docs/DATABASE.md).

Pesanan selesai menghasilkan satu penjualan dalam transaksi database. Harga item disimpan sebagai snapshot; perubahan katalog tidak mengubah transaksi selesai. Daftar pesanan dibatasi 500 terbaru, sementara laporan mencakup semua penjualan dalam periode.

Pengelolaan akun lanjutan, upload foto, dan konfigurasi domain/HTTPS produksi belum tersedia. Website belum dideploy.

## Atelier: fitur terbaru

Identitas visual baru memakai hijau hutan, ivory, dan aset floral editorial. Visual produk awal merupakan gambar contoh hasil generasi; ganti dengan foto produk toko sebelum digunakan untuk penawaran nyata.

- **Pengaturan keamanan:** ganti password dan verifikasi email pemulihan. Lupa password memakai tautan sekali pakai yang berlaku 15 menit; semua sesi berakhir setelah reset.
- **Data bisnis owner:** lihat tabel tanpa aplikasi database tambahan dan unduh JSON setelah konfirmasi password. Ekspor tidak menyertakan akun, password/hash, sesi, atau token; ini bukan backup lengkap.

### Lupa password untuk pengujian lokal

Mode non-production default memakai `MAIL_MODE=local`. Tidak diperlukan API key atau pengirim email.

1. Login, buka **Pengaturan → Email pemulihan**, masukkan alamat email dan password saat ini.
2. Buka folder `.local/mail` dari File Explorer. Buka file `.txt` terbaru dengan Notepad, lalu salin tautan verifikasinya ke browser dan konfirmasikan.
3. Pada halaman login, pilih **Lupa password** dan masukkan alamat yang sudah diverifikasi.
4. Buka file reset terbaru di `.local/mail`, salin tautannya ke browser, lalu buat password baru.

File hanya disimpan pada laptop; tidak dikirim ke inbox email dan tidak disediakan melalui endpoint web. Tautan berlaku 15 menit, sekali pakai. Jaga folder tersebut secara pribadi dan hapus pesan yang tidak diperlukan. Jangan kirim screenshot tautan/token. Mode ini tidak membuktikan kepemilikan email nyata dan hanya untuk pengujian lokal; mode production menolaknya.

**Deployment ditunda sesuai instruksi.** Konfigurasi hosting sebelumnya disimpan sebagai referensi masa depan di [catatan hosting](docs/DEPLOYMENT.md), tetapi tidak diperlukan dan tidak dijalankan untuk penggunaan lokal.

[Arah produk dan batas fitur](docs/PRODUCT-DIRECTION.md).

<details>
<summary>Opsi lanjutan: Docker dan PostgreSQL server</summary>

Konfigurasi Docker Compose tetap tersedia sebagai alternatif untuk pengembang yang membutuhkannya. Mode lokal di atas tidak memerlukannya. Compose menjalankan layanan `web` dan `db`; jangan menjalankannya bersamaan pada port yang sama dengan `npm run dev`.

```bash
docker compose up -d --build
docker compose logs -f
docker compose stop
```

Data PostgreSQL mode ini terpisah dari folder PGlite. Pertahankan data lama sebelum berpindah mode.

</details>

## Pembaruan fitur operasional

- **Pengaturan toko (owner):** nama, alamat, deskripsi, logo, WhatsApp, Instagram, dan TikTok bisa diubah dari dashboard; tersimpan di database.
- **Laporan owner:** grafik tren mengikuti periode dan PDF berupa tabel dengan header berulang serta nomor halaman.
- **Pelanggan:** empat kartu statistik dan akses baca untuk owner; ringkasan tidak lagi terbatas pada 500 pesanan.
- **Katalog:** pilihan occasion dan urutan produk paling banyak difavoritkan. Favorit disimpan per browser dan jumlahnya terlihat di halaman produk admin.
- **Produk contoh:** 20 buket dengan ilustrasi yang dibuat secara digital ditambahkan saat setup jika data demo diaktifkan. Produk yang sudah ada tidak ditimpa; gambar dapat diganti dengan foto asli dari dashboard.
- **Tentang kami:** profil florist, panduan perawatan bunga, dan kanal WhatsApp, Instagram serta TikTok yang dapat diatur owner.
- **Foto produk/logo:** upload JPEG/PNG/WebP dari perangkat, maksimal 5 MB; tersimpan sebagai WebP di `.local/uploads`. Ganti password tetap tersedia di Pengaturan keamanan.

Setelah mengunduh pembaruan, hentikan server, jalankan `npm.cmd ci` sekali untuk memasang dependency baru, lalu buka `Mulai-BienVendre.cmd`. Data lama dipertahankan oleh migrasi. Backup juga folder `.local/uploads` selain database.

Lihat [audit fitur dan batas penggunaan](docs/FEATURE-AUDIT.md). Fokus tetap localhost; tidak perlu akun hosting atau deploy.
