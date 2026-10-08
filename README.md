# Bien Vendre · Florist & Gifts

Sistem informasi rekomendasi katalog dan manajemen penjualan florist, berdasarkan **PPT PPSI Kelompok 4**. React + Vite untuk antarmuka, Express untuk API, dan PostgreSQL 17 untuk database relasional. Bahasa antarmuka Indonesia, mata uang rupiah, tanggal operasional Asia/Jakarta.

![Dashboard admin](docs/screenshots/admin-desktop.png)

## Peran dan alur

| Peran | Fitur |
|---|---|
| Pelanggan (tanpa login) | Katalog, pencarian produk, detail foto/harga/jenis/ukuran/deskripsi, rekomendasi berdasarkan kategori momen, kanal digital toko |
| Admin | Login, CRUD produk/kategori/rekomendasi, catat pesanan multi-item, ubah pesanan aktif, proses/selesaikan/batalkan, ringkasan pelanggan |
| Owner | Login, dashboard, daftar/detail pesanan baca saja, riwayat penjualan per periode, unduh PDF |

**Alur pelanggan sesuai PPT:** lihat katalog → pilih kategori/rekomendasi → lihat detail → konsultasi melalui kanal toko. Admin mencatat pesanan setelah konsultasi. Tidak ada akun pelanggan, checkout mandiri, atau payment gateway dalam PPT.

**Alur pesanan:** Baru → Diproses → Selesai; Baru/Diproses dapat dibatalkan. Pesanan baru dapat dihapus. Penyelesaian atomik membuat tepat satu baris penjualan. Pesanan selesai dibekukan untuk menjaga histori; tanggal laporan adalah tanggal penyelesaian. Harga dan nama item tersimpan sebagai snapshot, sehingga perubahan katalog tidak mengubah transaksi lampau. Total dihitung di server.

Diagram dan pemetaan fitur: [REQUIREMENTS.md](docs/REQUIREMENTS.md). Implementasi menambahkan status operasional dan sesi untuk menjalankan kebutuhan PPT.

## Menjalankan lokal

Prasyarat: Node.js **22+**, npm, Docker Engine dengan Compose. Port 5432 dan 3000 tersedia. Setup tidak membuat worktree: gunakan checkout yang ada.

```bash
git clone https://github.com/RamonZalmora/Florist_kel4_ppsi.git
cd Florist_kel4_ppsi
bash scripts/setup.sh
npm start
```

Di komputer Anda, buka aplikasi pada port **3000**. `/catalog` untuk pelanggan, `/login` untuk tim. `/api/health` memeriksa koneksi database. Setup membuat `.env` lokal dengan password acak, menjalankan database, migrasi, seed demo dan build; jika `.env` sudah ada, file dipertahankan. Jika memakai database PostgreSQL sendiri, atur `DATABASE_URL` di `.env` dan jalankan `npm ci`, `npm run db:migrate`, `npm run db:seed`, `npm run build` tanpa Compose.

Username awal: **admin** dan **owner**. Password awal terdapat dalam `.env` lokal pada `SEED_ADMIN_PASSWORD` dan `SEED_OWNER_PASSWORD`; tidak ditulis ke Git, chat, atau dokumentasi. Seed meng-hash password dengan bcrypt, tidak menimpa akun yang sudah ada. Mengubah variabel seed tidak mengganti password akun lama. Pengelolaan/reset akun lanjutan belum termasuk lingkup versi ini.

Seed menambahkan **6 produk, 4 kategori, 8 rekomendasi dan 7 pesanan fiktif** saat katalog kosong. Seed ulang tidak menggandakan data. Ilustrasi produk merupakan demo; admin dapat menggantinya melalui URL foto HTTPS. Banner floral dibuat dengan generator gambar. Tidak ada unggah berkas foto dalam versi ini.

Untuk mengaktifkan kanal toko, isi `.env` lalu restart server:

```dotenv
STORE_WHATSAPP=62xxxxxxxxxxx
STORE_INSTAGRAM=https://www.instagram.com/akun_toko_asli/
STORE_ADDRESS=Alamat toko sebenarnya
```

Nilai di atas adalah placeholder, bukan kontak toko. Tombol WhatsApp/Instagram hanya tampil setelah dikonfigurasi. `COOKIE_SECURE=false` untuk HTTP lokal; gunakan `true` ketika kelak berjalan di HTTPS. Jangan commit `.env`, dump database, atau kredensial.

## Pengembangan dan pengujian

```bash
# Terminal 1: backend dengan auto-reload
npm run dev
# Terminal 2: frontend Vite, proxy /api ke backend
npm run web:dev

# Integration test, memakai PostgreSQL pada DATABASE_URL
npm test
# Browser test, backend dan build harus sudah berjalan
npm run test:e2e
```

Tes integrasi membuat akun/data sementara dengan identifier unik lalu membersihkan data miliknya; jalankan hanya pada database pengembangan. Tes browser memakai akun seed dan katalog demo tanpa modifikasi; membuat lalu menghapus pesanan uji. Browser test menjalankan **Chromium yang terpasang di `/usr/bin/chromium`**. Set `CHROMIUM_PATH` untuk lokasi executable lain. Bila belum ada browser, instal Chromium atau browser Playwright dari sumber resminya dan arahkan variabel tersebut. Tes dijalankan pada viewport desktop 1440×1000 dan HP 390×844.

Perintah wajib setelah perubahan: `npm run build`, `npm test`, dan `npm run test:e2e` untuk perubahan UI. [VALIDATION.md](docs/VALIDATION.md) mencatat hasil aktual. Screenshot ada di `docs/screenshots/`.

## Database dan API

Skema SQL berversi: `server/db/001_initial.sql`, runner migrasi memakai advisory lock dan tabel `schema_migrations`. Semua query input menggunakan parameter. Foreign key, constraint, snapshot harga, lock pesanan, dan transaksi PostgreSQL menjaga konsistensi. Diagram [DATABASE.md](docs/DATABASE.md) menjelaskan relasi.

| API | Akses |
|---|---|
| `GET /api/products`, `/products/:id`, `/categories`, `/store` | Publik |
| `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` | Login/sesi |
| `/api/manage/products`, `/categories`, `/recommendations` | Admin (POST/PUT/DELETE); daftar internal produk/rekomendasi GET |
| `GET /api/orders`, `/api/dashboard` | Admin & owner |
| `POST/PUT/DELETE /api/orders`, `PATCH /api/orders/:id/status` | Admin |
| `GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`, `/api/reports/pdf` | Owner |

Mutasi terautentikasi wajib header `X-CSRF-Token` dari login/me. Sesi acak disimpan sebagai hash di DB, cookie HttpOnly/SameSite Strict, masa berlaku 12 jam. Login dibatasi 20 percobaan/15 menit/IP. Validasi input menggunakan Zod; owner tidak dapat mengubah data walaupun memanggil API langsung. Daftar pesanan dibatasi 500 terbaru; laporan periode mencakup seluruh penjualan dalam periode. Paginasi pesanan dan unggah foto dapat ditambahkan pada iterasi berikutnya.

## Persistensi dan backup

Compose menyimpan PostgreSQL dalam named volume `florist_db`. Stop/start database tidak menghapus data. **Jangan menjalankan `docker compose down -v`** pada database yang ingin dipertahankan. Sebelum memindahkan lingkungan, buat backup:

```bash
bash scripts/backup-db.sh
# Restore ke database pengembangan kosong setelah memeriksa file backup:
docker compose --env-file .env exec -T db psql -U florist -d bien_vendre < .local/backups/NAMA_BACKUP.sql
```

Backup berisi data pelanggan dan hash password: simpan aman, jangan unggah ke GitHub. Restore ke cloud task baru belum diverifikasi; jangan mengandalkan proses hidup atau volume Docker ikut dipindahkan tanpa backup. Deploy, domain, TLS, email, pembayaran dan konfigurasi produksi belum dilakukan sesuai permintaan.
