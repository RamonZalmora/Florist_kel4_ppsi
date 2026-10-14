# Memindahkan data PostgreSQL lama ke database lokal

Pemindahan bersifat opsional. Jika sebelumnya hanya memakai data contoh, setup baru dapat digunakan langsung. Jika sudah menambah produk atau transaksi pada database lama, pertahankan database tersebut sampai data berhasil dipindahkan dan diperiksa.

## Persiapan

1. Hentikan aplikasi baru dengan Ctrl+C. Pastikan PostgreSQL lama masih dapat diakses. Jangan hapus volume/database lama atau menghapus `.env` yang menyimpan kredensialnya.
2. Instal dependensi dengan `npm install` (`npm.cmd install` pada PowerShell).
3. Edit `.env`. Pilih folder database lokal **baru**, bukan folder yang telah diisi setup:

   ```dotenv
   DB_DRIVER=pglite
   DB_DIRECTORY=.local/from-postgres
   ```

4. Isi `IMPORT_DATABASE_URL` dengan koneksi database lama. Password berasal dari `POSTGRES_PASSWORD` pada konfigurasi lama; jangan mengirimnya ke chat atau memasukkannya ke Git. Bentuk koneksi:

   ```dotenv
   IMPORT_DATABASE_URL=postgresql://florist:PASSWORD_DATABASE_LAMA@localhost:5433/bien_vendre
   ```

   Contoh port 5433 berlaku jika sebelumnya mengganti port laptop dari 5432 ke 5433. Pakai port yang benar pada laptop Anda. Karakter khusus pada password harus di-URL-encode. `DATABASE_URL` lama juga dapat digunakan jika `IMPORT_DATABASE_URL` tidak diisi.

## Import

```powershell
npm.cmd run db:import
```

Script membuat skema tujuan, membaca snapshot konsisten dari PostgreSQL, lalu memasukkan data dalam satu transaksi. Akun dan hash password, ID, kategori, produk, rekomendasi, pesanan, item, dan penjualan dipertahankan. Sequence ID disesuaikan agar data berikutnya tidak bertabrakan. Sesi lama tidak dipindahkan; pengguna login kembali.

Import menolak database tujuan yang sudah berisi data. Jangan menghapus database untuk mengatasi penolakan; pilih folder tujuan baru. Kegagalan saat transfer membatalkan transaksi data tujuan. Database sumber tidak diubah.

Setelah berhasil:

```powershell
npm.cmd run db:inspect
npm.cmd run setup
npm.cmd run dev
```

Seed setup mempertahankan akun dan katalog yang sudah ada. Jika database lama kosong, setup dapat menambahkan data contoh. Periksa produk, login dengan password lama, pesanan, dan laporan. Buat backup lokal sebelum menghentikan layanan database lama.

Mode baru tidak menjalankan atau menghapus Docker Desktop. Setelah pemindahan diverifikasi, layanan lama dapat dihentikan lewat Docker Desktop agar port localhost bebas. Jangan menghapus volume lama sampai backup dipastikan dapat digunakan.

## Batas verifikasi

Logika transfer, pelestarian relasi/ID/hash/total, dan penolakan target berisi data diuji dengan fixture PostgreSQL-compatible. Pemindahan dari database pengguna di laptop harus diverifikasi di laptop tersebut karena database itu tidak dapat diakses dari runner ini.
