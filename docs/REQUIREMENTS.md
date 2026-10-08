# Bien Vendre — pemetaan kebutuhan PPT PPSI

Sumber: PPT PPSI KELOMPOK 4, 17 slide. Diagram use case (slide 7), class diagram (slide 11), dan uraian use case (slide 8–10) menjadi acuan.

| Aktor | Hak akses |
|---|---|
| Pelanggan, tanpa login | Katalog, detail produk (foto, harga, jenis, ukuran, deskripsi), rekomendasi menurut kategori, tautan kanal digital |
| Admin | Login/logout, CRUD produk, kategori dan rekomendasi, pencatatan serta pengelolaan pesanan |
| Owner | Login/logout, baca daftar pesanan, riwayat penjualan, laporan periode dan unduh PDF |

Owner tidak memiliki izin mengubah katalog atau pesanan. Pelanggan tidak diwajibkan membuat akun atau melakukan checkout: PPT menempatkan pencatatan pesanan pada admin. Tombol konsultasi akan memakai WhatsApp hanya setelah nomor toko dikonfigurasi.

## Entitas dan aturan

PostgreSQL 17: User, Category, Product, Recommendation, Order, OrderItem, Sale; Session ditambahkan untuk autentikasi server. Recommendation menghubungkan kategori momen dengan produk (produk dapat direkomendasikan di beberapa kategori). Harga item disimpan sebagai snapshot. Total dihitung server, bukan dipercaya dari browser. Satu pesanan selesai menghasilkan satu penjualan, secara atomik. Pesanan selesai menjadi riwayat tetap dan tidak dapat dihapus/diubah; produk dapat dinonaktifkan tanpa menghilangkan histori. Status tambahan pending → processing → completed, atau cancelled, dipakai untuk operasional. Tidak ada integrasi pembayaran, inventori/stok, atau pengiriman eksternal yang dinyatakan di PPT.

## Desain

Susunan referensi pengguna: sidebar kiri, topbar, empat kartu ringkasan, grafik dan panel produk, tabel pesanan. Tema sage, krem, dan peach; katalog pelanggan memakai foto/ilustrasi floral, responsif untuk smartphone. Data contoh diberi label demo. Kanal digital tidak diisi dengan nomor atau akun toko yang dibuat-buat.

## Batas lingkup

Implementasi dan pengujian lokal serta commit/push GitHub. Deploy belum diminta. Data seed adalah contoh dan bukan penjualan nyata.
