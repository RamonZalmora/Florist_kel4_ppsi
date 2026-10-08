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

## Menjalankan website + database dengan Docker (direkomendasikan)

Docker sekarang menjalankan dua layanan: `web` (frontend hasil build dan backend Express) serta `db` (PostgreSQL). **Tidak perlu menginstal Node.js di laptop** untuk mode ini. Dockerfile memakai Node.js 22 dan multi-stage build; proses aplikasi berjalan sebagai user non-root. File `.env` dan data pelanggan tidak dimasukkan ke image. Compose menunggu database sehat sebelum migrasi dan startup web.

### Windows — sampai terbuka di browser

1. Instal dan buka **Docker Desktop**, gunakan Linux containers/WSL 2. Tunggu sampai Engine running. Periksa di PowerShell: `docker --version` dan `docker compose version`.
2. Unduh ZIP dari GitHub melalui **Code → Download ZIP**, ekstrak semua file. Bila memakai Git, gunakan `git clone` (checkout lama dapat diperbarui dengan `git pull origin main`). Pertahankan `.env` lama dan database jika sudah pernah menjalankan proyek.
3. Buka folder yang berisi `compose.yaml` dan `Dockerfile` di File Explorer. Klik address bar, ketik `powershell`, lalu Enter; terminal terbuka dalam folder proyek.
4. Jalankan:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-docker.ps1
   ```

   Pengaturan execution policy ini hanya berlaku pada proses PowerShell tersebut. Script membuat `.env` dengan password acak jika belum ada, menggunakan Node dari container sementara, kemudian membangun dan menjalankan aplikasi. Docker Desktop harus aktif. Saat pertama kali, image dan dependensi perlu diunduh; waktu tergantung koneksi.
5. Periksa:

   ```powershell
   docker compose ps
   ```

   Layanan `web` dan `db` harus `healthy`. Buka Chrome/Edge dan ketik **http://localhost:3000/catalog**. Login tim di **http://localhost:3000/login**. Untuk langsung membuka browser dari PowerShell:

   ```powershell
   Start-Process "http://localhost:3000/catalog"
   ```

6. Username **admin** atau **owner**. Buka `.env` lokal dengan editor teks untuk melihat password awal pada `SEED_ADMIN_PASSWORD` dan `SEED_OWNER_PASSWORD`; jangan membagikan file atau password. Untuk username admin gunakan password admin, untuk owner gunakan password owner.

### Linux/macOS

```bash
bash scripts/setup-docker.sh
```

Khusus runner Codex cloud yang memakai proxy dan CA platform, gunakan `bash scripts/setup-cloud-docker.sh`. Helper memakai sertifikat tepercaya melalui secret saat build, tanpa mematikan TLS atau menyimpan kredensial proxy di image. Ini tidak diperlukan pada instalasi Docker Desktop biasa.

### Menjalankan lagi, memperbarui kode, dan berhenti

Setelah setup pertama, nyalakan Docker Desktop lalu dari folder proyek:

```bash
docker compose up -d --wait
# Setelah mengubah/mengunduh kode terbaru, build ulang image web:
docker compose up -d --build --wait
# Melihat penyebab startup gagal:
docker compose logs --tail 80 web db
# Menghentikan aplikasi dan database, data tetap pada volume:
docker compose stop
```

Mode `-d` berjalan di background; terminal boleh ditutup, Docker Desktop tetap aktif. Tidak perlu menjalankan `npm start` bersamaan. Jangan memakai `down -v` jika ingin mempertahankan database. `.env` juga harus dipertahankan agar password cocok dengan volume PostgreSQL yang sudah ada.

Jika port 3000 digunakan aplikasi lain, isi `WEB_PORT=3001` dalam `.env`, jalankan lagi `docker compose up -d --wait`, lalu buka `http://localhost:3001/catalog`. `DATABASE_URL` pada `.env` tetap untuk mode npm di laptop; mode Docker memakai hostname `db` secara otomatis. Jangan menggantinya menjadi localhost di container.

**Jika gagal:** pastikan terminal berada di folder `compose.yaml`; Docker Desktop Engine running dan Linux containers dipilih; lihat log di atas. Error password database setelah mengganti `.env` berarti kredensial volume lama perlu digunakan kembali. Jangan menghapus volume untuk mengatasi error tersebut. Mode demo default `SEED_DEMO=true`; gunakan `SEED_DEMO=false` bila tidak ingin seed otomatis (akun awal harus sudah disiapkan). Port dibatasi ke laptop (`127.0.0.1`); website belum online.

## Menjalankan dengan npm (alternatif pengembangan)

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

Untuk mengaktifkan kanal toko, isi `.env` lalu jalankan `docker compose up -d web` agar konfigurasi diterapkan ulang (atau restart server pada mode npm):

```dotenv
STORE_WHATSAPP=62xxxxxxxxxxx
STORE_INSTAGRAM=https://www.instagram.com/akun_toko_asli/
STORE_ADDRESS=Alamat toko sebenarnya
```

Nilai di atas adalah placeholder, bukan kontak toko. Tombol WhatsApp/Instagram hanya tampil setelah dikonfigurasi. `COOKIE_SECURE=false` untuk HTTP lokal; gunakan `true` ketika kelak berjalan di HTTPS. Jangan commit `.env`, dump database, atau kredensial.

## Pengembangan dan pengujian

```bash
# Mode npm: hentikan container web terlebih dahulu agar port 3000 bebas
docker compose stop web
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

Browser test dapat mengakses web dalam Docker. Jika memakai port alternatif, set `E2E_BASE_URL`, misalnya `E2E_BASE_URL=http://127.0.0.1:3001 npm run test:e2e` pada Bash. Tool pengembangan/test membutuhkan Node.js dan npm di host; pengguna yang hanya menjalankan aplikasi Docker tidak membutuhkannya.

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
