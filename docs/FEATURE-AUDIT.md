# Audit fitur operasional lokal

## P1 — Pengaturan toko

Sebelumnya profil/kontak dibaca dari environment. Owner dapat mengubah nama, alamat, deskripsi, cerita toko, layanan, tips perawatan, WhatsApp, Instagram, TikTok, dan logo pada Pengaturan. Nilai disimpan di tabel singleton `store_settings` melalui `PUT /api/store`; katalog dan PDF membaca pengaturan tersebut. Konfigurasi lama tetap menjadi fallback sampai owner menyimpan pengaturan. Admin hanya membaca profil toko.

Nomor WhatsApp berupa angka dengan kode negara dan URL Instagram dibatasi ke profil instagram.com. Tidak perlu restart untuk perubahan data; refresh katalog yang sudah terbuka untuk mengambil nilai terbaru.

## P1 — Laporan admin dan owner

Halaman laporan mempunyai grafik periode. Agregasi harian untuk rentang sampai 62 hari dan bulanan untuk rentang lebih panjang; hanya tanggal/bulan dengan transaksi yang ditampilkan. Total grafik sama dengan total transaksi pada periode terpilih.

PDF memakai nama toko, periode, waktu cetak WIB, tabel kolom tetap, baris berselang warna, header berulang, jumlah transaksi/total dan nomor halaman. Skenario banyak halaman diuji dengan 45 transaksi berisi nama panjang. Periode kosong tetap menghasilkan dokumen yang valid.

## P2 — Pelanggan

Admin dan owner dapat membuka halaman Pelanggan; endpoint hanya GET. Empat kartu mencakup total pelanggan, pelanggan dengan lebih dari satu pesanan tercatat, total nilai pesanan selesai, dan pesanan aktif. Metrik dihitung dari seluruh database. Tabel menampilkan maksimal 500 pelanggan terbaru, dikelompokkan berdasarkan nomor telepon. Tombol Chat membuka kanal WhatsApp, tidak mengirim pesan otomatis.

## P2 — Katalog

Halaman utama menampilkan hingga sembilan produk berdasarkan jumlah favorit. Occasion menampilkan sembilan produk per halaman dan dapat diurutkan berdasarkan pembaruan terbaru atau jumlah favorit. Fitur pelacakan pelanggan tidak aktif.

## P3 — Upload foto dan password

Upload multipart tersedia melalui `POST /api/uploads`, untuk admin dan owner dan dilindungi sesi/CSRF. Input JPEG/PNG/WebP maksimal 5 MB dan 25 megapiksel. Isi berkas benar-benar didecode, bukan dipercaya dari ekstensi/MIME. SVG/HTML dan input rusak ditolak. Foto dirotasi sesuai orientasi, diperkecil hingga 1600×1600 tanpa memperbesar, dikonversi WebP, dan metadata asli tidak dipertahankan. Nama file acak; nama asli tidak dipakai sebagai path.

Foto tersimpan di `.local/uploads` dan disajikan melalui `/uploads/`. Form produk dan logo toko dapat mengunggah dari perangkat atau memakai URL. Foto yang diunggah bersifat publik seperti foto katalog; jangan mengunggah dokumen pribadi. Upload yang dibatalkan atau foto lama belum dihapus otomatis agar tidak menghapus berkas yang masih dipakai.

Form ganti password admin/owner sudah tersedia sebelumnya pada panel Keamanan; dipertahankan tanpa membuat form duplikat. Password lama wajib benar, password baru di-hash bcrypt dan seluruh sesi berakhir setelah pergantian. Pemulihan tetap dapat diuji melalui file lokal tanpa akun email.

## Data, update dan backup

Migrasi 003 menambah tabel pengaturan dan kode tracking, tanpa menghapus data sebelumnya. Setelah memperbarui kode, hentikan server dan jalankan `npm.cmd ci`, lalu buka launcher `Mulai-BienVendre.cmd`. Launcher menjalankan setup/migrasi sebelum mode dev.

Backup PGlite melalui `npm run db:backup` hanya menyimpan database. Salin juga `.local/uploads` secara terpisah saat server berhenti; database menyimpan URL foto, bukan byte foto. Jangan menghapus `.env`, folder database, atau upload saat mengganti kode. Export JSON owner bukan backup penuh. Import database lama yang belum memiliki tracking menghasilkan kode baru melalui default skema; snapshot database mempertahankan kode yang sudah ada.

## Validasi

16 tes backend/penyimpanan dan 20 tes browser desktop/HP lulus. Pemeriksaan mencakup role, settings, validasi rentang, tracking tanpa PII, upload isi palsu/oversize, foto nyata pada form, metrik owner, grafik, PDF banyak halaman, serta alur lama. PDF contoh dirender dan teksnya diperiksa pada runner. Pengujian dilakukan pada Linux cloud; klik launcher pada Windows belum dijalankan langsung. Deployment tetap ditunda.
