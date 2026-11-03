# Bien Vendre: menjalankan di VPS Ubuntu

Panduan ini untuk satu VPS baru dan database PostgreSQL yang masih kosong. Baca seluruh langkah sebelum mulai. File transfer dan backup memuat data pemesan serta hash password; simpan privat, jangan unggah ke GitHub, dan gunakan SSH/SCP.

## 1. Persiapan

- VPS Ubuntu 24.04, akses SSH dan sidik jari server yang sudah diverifikasi.
- Domain yang dikelola pemilik. DNS tidak perlu diubah sampai aplikasi dan data berhasil diuji.
- Folder proyek di laptop dengan versi kode yang sama seperti di VPS.
- Hentikan sementara aplikasi laptop saat membuat ekspor agar data tidak berubah selama pemindahan.

## 2. Buat backup dan ekspor di laptop

Di PowerShell, dari folder proyek setelah server lokal berhenti:

```powershell
npm run db:backup
npm run db:export-vps
```

Perintah ekspor menampilkan lokasi file JSON di `.local/vps-transfer/` dan jumlah baris setiap tabel. Ekspor berisi data bisnis, password hash, dan pengaturan; sesi dan token sementara tidak dipindahkan. Simpan juga folder `.local/uploads`. Bila folder upload tersedia, arsipkan:

```powershell
tar.exe -czf .local/vps-transfer/uploads.tar.gz -C .local/uploads .
```

Simpan backup PGlite dan salinan foto di laptop atau penyimpanan privat terpisah. Pencatatan pesanan baru di laptop perlu dihentikan sejak ekspor terakhir sampai perpindahan selesai.

## 3. Siapkan VPS

Masuk ke VPS via SSH, lalu unduh versi proyek yang berisi file produksi ini. Contoh berikut menggunakan akun root; jika memakai akun lain, sesuaikan lokasi folder dan gunakan sudo sesuai kebutuhan.

```sh
apt-get update
apt-get install -y git openssl
git clone https://github.com/RamonZalmora/Florist_kel4_ppsi.git /root/Florist_kel4_ppsi
cd /root/Florist_kel4_ppsi
sh scripts/install-docker-ubuntu.sh
sh scripts/init-vps-env.sh
```

Skrip terakhir membuat `.env.production` dengan password database acak bila belum ada; file yang sudah ada tidak ditimpa. Pastikan `SITE_ADDRESS` benar untuk domain milik sendiri. Dockerfile dan Compose produksi memisahkan volume PostgreSQL, upload, dan sertifikat TLS; database tidak menerbitkan port ke publik.

Di firewall penyedia, pastikan SSH tetap bisa diakses dan port 80/443 tersedia. Jangan aktifkan firewall atau ubah aturan SSH tanpa memastikan akses tetap berfungsi.

## 4. Pindahkan file ekspor

Gunakan SCP dari laptop ke direktori privat VPS, misalnya `/root/bien-vendre-import.json` dan `/root/bien-vendre-uploads.tar.gz`. Ambil path JSON dari keluaran langkah 2. Jangan menaruh file ini di direktori website atau Git.

```powershell
scp "PATH_JSON_DARI_LANGKAH_2" root@IP_VPS:/root/bien-vendre-import.json
scp .local/vps-transfer/uploads.tar.gz root@IP_VPS:/root/bien-vendre-uploads.tar.gz
```

## 5. Inisialisasi PostgreSQL dan impor

Di VPS:

```sh
cd /root/Florist_kel4_ppsi
chmod 600 /root/bien-vendre-import.json /root/bien-vendre-uploads.tar.gz
docker compose --env-file .env.production -f compose.production.yaml up -d db
docker compose --env-file .env.production -f compose.production.yaml build web
docker compose --env-file .env.production -f compose.production.yaml run --rm --no-deps --user root -v /root/bien-vendre-import.json:/run/import.json:ro web node scripts/import-vps.js /run/import.json
```

Impor menolak database yang sudah memiliki tabel aplikasi. Periksa jumlah baris hasil impor dengan angka hasil ekspor. Jika gagal, hentikan dan periksa penyebabnya; jangan hapus volume database atau jalankan ulang pada database berisi data.

Jika ada foto upload:

```sh
docker compose --env-file .env.production -f compose.production.yaml run --rm --no-deps -T web tar -xzf - -C /app/.local/uploads < /root/bien-vendre-uploads.tar.gz
```

Lalu mulai aplikasi dan cek database dari dalam container:

```sh
docker compose --env-file .env.production -f compose.production.yaml up -d web
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml exec -T web node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(await r.text());if(!r.ok)process.exit(1)})"
```

Respons harus menunjukkan `status: ok` dan `driver: postgres`. Akun yang dipindahkan menggunakan password sebelumnya. Jika tidak ada akun di sumber, akun awal perlu dibuat sebelum publikasi.

## 6. DNS, HTTPS dan pemeriksaan

Setelah data dan aplikasi siap, ubah A record untuk domain yang digunakan ke IP VPS dan tunggu DNS mengarah ke VPS. Periksa AAAA atau record www yang sudah ada sebelum mengubahnya; jangan mengubah record email. `www.bienvendre.id` harus mengarah ke domain utama atau IP VPS dan akan dialihkan ke `bienvendre.id`.

```sh
docker compose --env-file .env.production -f compose.production.yaml up -d proxy
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 proxy
```

Pastikan HTTPS aktif, lalu uji login admin/owner, jumlah produk/occasion/pesanan/penjualan, foto katalog, upload foto baru, ekspor PDF/Excel, dan persistensi setelah container restart. Jangan menghapus data laptop sampai seluruh pemeriksaan berhasil. Setelah yakin, simpan backup offline dan hapus salinan transfer privat di VPS dengan hati-hati.

## 7. Backup dan pembaruan

Dari folder VPS:

```sh
sh scripts/backup-vps.sh
sh scripts/update-vps.sh
```

Backup menyimpan dump PostgreSQL dan arsip upload dalam `.local/server-backups/`; simpan salinan terenkripsi di lokasi lain. Skrip update membuat backup, menjalankan `git pull --ff-only`, lalu membangun ulang container. Kode perubahan harus sudah di-commit dan di-push ke branch main terlebih dahulu. Jangan gunakan `docker compose down -v` pada data yang ingin disimpan karena opsi tersebut menghapus volume.

Email pemulihan produksi membutuhkan konfigurasi layanan email dan pengirim yang tervalidasi; tanpa itu fitur tersebut belum dapat diandalkan. Periksa RAM, swap, kapasitas disk, dan log, terutama pada VPS 1 GB.
