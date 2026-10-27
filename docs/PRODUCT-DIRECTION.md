# Bien Vendre — arah produk Atelier

## Tujuan

Membuat katalog florist yang meyakinkan dan ruang kerja toko yang dapat dipakai sehari-hari. Fondasi tetap: katalog/detail, rekomendasi kategori, pengelolaan produk/kategori/pesanan, riwayat serta laporan penjualan. Pelanggan tidak dipaksa membuat akun; konsultasi dan pencatatan admin tetap menjadi alur pemesanan.

## Desain

Hijau hutan, ivory, rose, foto editorial hasil generasi, tipografi serif untuk judul dan sans-serif untuk interaksi. Banner menjadi identitas visual; dashboard memprioritaskan keterbacaan angka dan status. Menu berbeda menurut peran. Gambar koleksi awal adalah visual contoh hasil generasi dan harus diganti dengan foto produk nyata sebelum menawarkan barang kepada pelanggan.

## Penambahan yang tersedia

- Pemulihan akun: email harus diverifikasi dengan bukti akses ke alamat tersebut; perubahan alamat memerlukan password saat ini. Reset sekali pakai, kedaluwarsa 15 menit, hash token di DB, password bcrypt, dan pencabutan sesi setelah reset/ganti password.
- Agenda pengiriman: pilih tanggal, lihat pesanan aktif, catatan khusus, dan jumlah pesanan melewati jadwal. Cakupan adalah maksimal 500 pesanan terbaru; tidak mengklaim jadwal pengiriman dari pihak ketiga.
- Data bisnis khusus owner: tabel baca-saja berpaginasi dan ekspor JSON setelah konfirmasi password. Tidak membuka endpoint SQL bebas atau mengirim hash/token ke browser.
- Jalur hosting native Node dan PostgreSQL eksternal, dengan email Resend serta panduan pengisian kredensial.

## Batas yang tetap jelas

Rekomendasi dikurasi admin, bukan AI perilaku. Tidak ada payment gateway, integrasi kurir, inventori stok, atau notifikasi otomatis pengiriman dalam versi ini. Ekspor JSON bukan backup pemulihan penuh. Data seed adalah fiktif. Layanan email dan publikasi internet memerlukan akun/pengaturan nyata; fitur tidak boleh mengklaim siap ketika dependensinya belum diaktifkan.
