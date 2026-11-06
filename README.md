# Bien Vendre Florist and Gifts

Website katalog dan pengelolaan operasional toko florist Bien Vendre. Sistem menghubungkan penelusuran produk oleh pelanggan, pencatatan pesanan oleh admin, dan pemantauan penjualan oleh owner dalam satu aplikasi berbasis web.

**Kunjungi website: [https://bienvendre.online](https://bienvendre.online)**

## Tentang Proyek

Bien Vendre menyediakan katalog rangkaian bunga artificial, bunga kering, dan hadiah untuk berbagai momen, seperti wisuda, ulang tahun, serta pernikahan. Pelanggan dapat melihat produk dan harga sebelum berkonsultasi melalui WhatsApp.

Sistem membantu toko mengelola informasi produk, mengelompokkan katalog, mencatat detail pesanan, dan menyusun laporan penjualan. Antarmuka menggunakan bahasa Indonesia, format rupiah, dan zona waktu Asia/Jakarta.

## Cara Mengakses Melalui Internet

1. Buka Google Chrome, Microsoft Edge, atau browser lain pada laptop maupun ponsel.
2. Kunjungi **[bienvendre.online](https://bienvendre.online)** menggunakan koneksi internet.
3. Pilih **Koleksi bunga** untuk menelusuri produk atau **Tentang kami** untuk melihat profil dan lokasi toko.
4. Gunakan tombol **Pesan via WhatsApp** pada produk untuk berkonsultasi dengan tim toko.
5. Admin dan owner dapat memilih **Login tim** atau membuka [halaman login](https://bienvendre.online/login) dengan akun yang diberikan pengelola.

Katalog publik dapat diakses tanpa akun. Tombol WhatsApp membuka percakapan; pesanan belum otomatis tersimpan di sistem sampai dicatat oleh admin.

## Fitur Utama

### Halaman Publik

- **Beranda:** identitas toko, pengenalan produk, dan akses menuju koleksi.
- **Katalog:** foto, nama, harga, deskripsi, dan detail produk.
- **Pencarian dan filter:** occasion, jenis produk, serta harga minimum dan maksimum yang dapat ditentukan pelanggan.
- **Koleksi bertahap:** tampilkan lebih banyak produk dan sembunyikan kembali tanpa berpindah halaman.
- **Pemesanan WhatsApp:** percakapan dengan konteks produk untuk membahas ketersediaan, detail, dan jadwal.
- **Tentang Kami:** cerita toko, alamat, peta, dan tautan kanal digital.
- **Desain responsif:** tampilan menyesuaikan layar desktop dan ponsel.

### Ruang Kerja Admin

- Dashboard ringkasan penjualan, grafik, kategori atau jenis produk terlaris, dan status pesanan.
- Pengelolaan produk, harga, foto, informasi bahan, serta status aktif katalog.
- Pengelolaan occasion dan jenis produk, termasuk hubungan produk dengan beberapa occasion.
- Pencatatan nama pemesan, nomor telepon, beberapa produk, jumlah, jadwal, dan catatan khusus.
- Perhitungan total pesanan berdasarkan harga produk dan jumlah yang dipilih.
- Pencarian, filter, pagination, dan tombol chat WhatsApp pada daftar pesanan.
- Penyelesaian pesanan yang menghasilkan catatan penjualan.
- Laporan dengan filter periode dan tanggal khusus, serta unduhan PDF berlogo toko dan Excel.

### Ruang Kerja Owner

- Pemantauan dashboard, daftar pesanan, serta riwayat dan laporan penjualan.
- Peninjauan dan ekspor data bisnis sesuai fasilitas yang tersedia.
- Pengaturan identitas toko, cerita Tentang Kami, alamat, koordinat atau tautan peta, serta kanal kontak.
- Informasi toko yang terhubung dengan halaman publik.
- Pengaturan keamanan akun dan perubahan password. Pemulihan melalui email memerlukan email terverifikasi serta konfigurasi layanan pengiriman.

## Alur Bisnis

1. Pelanggan menemukan produk melalui katalog dan filter.
2. Pelanggan berkonsultasi melalui WhatsApp untuk menyepakati detail pesanan.
3. Admin mencatat produk, jumlah, kontak pemesan, jadwal, dan permintaan khusus.
4. Tim toko menyiapkan pesanan sesuai kesepakatan.
5. Admin menandai pesanan sebagai selesai setelah penanganan selesai.
6. Catatan penjualan menjadi sumber dashboard dan laporan untuk evaluasi toko.

**Catatan:** status selesai bukan verifikasi pembayaran online otomatis. Laporan menunjukkan nilai penjualan dari pesanan selesai, bukan laba bersih.

## Keunggulan Website

- **Mudah memilih produk:** foto, harga, occasion, dan jenis produk membantu pelanggan menemukan pilihan sebelum menghubungi toko.
- **Pemesanan fleksibel:** WhatsApp mendukung diskusi kebutuhan khusus yang umum pada pesanan florist.
- **Pencatatan terstruktur:** detail pesanan disimpan dalam database dan dapat ditemukan melalui pencarian serta filter.
- **Pembagian tugas jelas:** admin menangani operasional, sedangkan owner memantau usaha dan mengatur informasi toko sesuai hak akses.
- **Evaluasi praktis:** ringkasan, grafik, periode khusus, serta ekspor PDF dan Excel membantu meninjau penjualan.
- **Informasi mudah diperbarui:** produk dan profil toko dapat dikelola melalui antarmuka tanpa mengubah kode untuk setiap pembaruan data.
- **Dapat dikembangkan:** pemisahan frontend, backend, dan database mendukung penambahan fitur berikutnya.

## Teknologi yang Digunakan

### Frontend

- **React 19** untuk antarmuka pengguna.
- **JavaScript dan JSX** untuk logika serta komponen halaman.
- **CSS** untuk desain, animasi, dan layout responsif.
- **Vite 6** untuk pengembangan dan build frontend.
- **Lucide React** untuk ikon antarmuka.
- **SVG dan komponen React** untuk grafik dashboard.

### Backend dan Database

- **Node.js 22** sebagai runtime pada deployment produksi.
- **Express 5** untuk API dan proses bisnis.
- **PostgreSQL 17** untuk database produksi pada VPS.
- **PGlite** untuk database pengembangan lokal.
- **node-postgres (`pg`)** untuk koneksi PostgreSQL.
- **SQL** untuk pengolahan data, relasi, transaksi, dan migrasi database.
- **Zod** untuk validasi input.
- **Multer dan Sharp** untuk penerimaan serta pengolahan gambar.
- **PDFKit dan write-excel-file** untuk ekspor laporan.
- **dotenv** untuk konfigurasi lingkungan.

### Autentikasi dan Keamanan

- Session berbasis cookie dan pemeriksaan hak akses admin atau owner pada backend.
- Hash password menggunakan **bcryptjs**.
- Perlindungan **CSRF**, header keamanan melalui **Helmet**, dan pembatasan permintaan pada endpoint tertentu melalui **express-rate-limit**.
- Akses website menggunakan **HTTPS**.

### Hosting dan Alat Pengembangan

- **VPS Rumahweb** dengan **Ubuntu 24.04 LTS**.
- **Docker dan Docker Compose** untuk menjalankan aplikasi, database, dan proxy.
- **Caddy** sebagai reverse proxy dan pengelola sertifikat HTTPS.
- **Git dan GitHub** untuk pengelolaan versi kode.
- **npm** untuk dependensi dan perintah proyek.
- **Node.js Test Runner dan Playwright** untuk pengujian backend dan browser.
- **Prettier** untuk konsistensi format kode.
- **GitHub Actions** untuk pemeriksaan build, pengujian, dan format kode. Workflow pemeriksaan tidak otomatis melakukan deployment VPS.

## Arsitektur Singkat

```text
Browser pelanggan atau tim toko
             |
            HTTPS
             |
       Caddy pada VPS
             |
    Node.js dan Express
      |              |
Frontend React   API aplikasi
                     |
                 PostgreSQL
```

Frontend dibangun menjadi file statis di `dist/` dan dilayani oleh Express. API memproses permintaan, memeriksa hak akses, serta membaca atau menulis database. Data PostgreSQL dan file upload produksi menggunakan volume Docker agar tetap tersedia pada pembaruan container normal.

## Struktur Proyek

```text
web/                       Frontend dan aset publik
  src/                     Komponen React, API client, dan CSS
  public/assets/           Logo dan gambar katalog
server/                    Backend Express
  routes/                  Endpoint API berdasarkan fitur
  db/                      Koneksi, migrasi, dan data awal
  reports/                 Pengolahan dan ekspor laporan
scripts/                   Setup, backup, dan deployment
deploy/                    Konfigurasi Caddy
docs/                      Dokumentasi teknis dan operasional
tests/                     Pengujian backend dan browser
.github/workflows/         Pemeriksaan otomatis GitHub Actions
compose.production.yaml    Layanan Docker untuk VPS
Dockerfile                 Tahapan build image aplikasi
package.json               Dependensi dan perintah proyek
```

Folder `.local/` berisi data dan file kerja lokal, termasuk database PGlite, upload, backup, serta kebutuhan pengujian. File `.env`, data lokal, dan kredensial tidak disertakan ke repositori.

## Pengembangan Lokal

Gunakan **Node.js 22 atau lebih baru** dan npm. Jalankan dari direktori proyek:

```bash
npm ci
npm run setup
npm run dev
```

Pada PowerShell Windows, gunakan `npm.cmd` jika eksekusi `npm` dibatasi. Alternatif peluncur Windows tersedia melalui `Mulai-BienVendre.cmd`.

- Katalog lokal: `http://localhost:3000/catalog`.
- Login tim lokal: `http://localhost:3000/login`.
- Konfigurasi akun awal dikelola secara privat melalui `.env`. Mengubah nilai seed tidak mereset password akun yang sudah dibuat.
- Database laptop dan database VPS merupakan penyimpanan terpisah; perubahan data lokal tidak otomatis tersinkron ke produksi.

Untuk memeriksa perubahan kode:

```bash
npm test
npm run build
npm run format:check
```

Pengujian browser tersedia melalui `npm run test:e2e` dan memerlukan aplikasi uji berjalan, browser yang sesuai, serta akun dan data pengujian.

## Pemeliharaan dan Dokumentasi

Pembaruan kode produksi dilakukan melalui GitHub dan proses deployment pada VPS. Skrip `scripts/update-vps.sh` menyiapkan backup sebelum mengambil kode terbaru dan memperbarui container. Simpan salinan cadangan database dan foto di luar VPS.

- [Panduan VPS Ubuntu dan pembaruan produksi](docs/VPS-UBUNTU.md)
- [Dokumentasi database](docs/DATABASE.md)
- [Panduan deployment](docs/DEPLOYMENT.md)
- [Panduan migrasi data](docs/MIGRATION.md)
- [Dokumentasi validasi](docs/VALIDATION.md)

## Arah Pengembangan

Pengembangan berikutnya dapat mencakup pemesanan langsung melalui website, integrasi pembayaran, notifikasi status, pengaturan kapasitas harian, persediaan bahan, dan pencatatan biaya untuk laporan laba. Prioritas ditentukan berdasarkan kebutuhan operasional toko.

**Bien Vendre membantu pelanggan memilih produk, admin mengelola pesanan, dan owner memantau usaha.**
