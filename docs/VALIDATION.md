# Validasi penggunaan lokal

Deployment ditunda. Tidak ada layanan hosting dibuat atau situs internet diterbitkan.

- Backend/penyimpanan: 15 tes lulus, 0 gagal/skipped. Termasuk alur verifikasi/reset melalui file lokal tanpa layanan email, penolakan mode surat lokal pada production, token sekali pakai/kedaluwarsa, pencabutan sesi, pesanan/penjualan, dan ekspor owner.
- Browser: 14 tes desktop/HP lulus. Meliputi katalog/anggaran, dashboard dan hak akses, agenda, data/JSON, PDF, penjelasan surat lokal, dan tautan reset tidak valid.
- Build dan pemeriksaan format/whitespace lulus.
- Mode dev berjalan pada localhost; frontend Vite memakai hot reload dan backend Node watch. Server non-production secara default hanya bind loopback.
- Pengunci database satu proses, backup/restore folder baru, dan perlindungan data lama tetap dipertahankan.

## Launcher Windows

`Mulai-BienVendre.cmd` memeriksa Node.js 22+, memasang dependency jika belum tersedia, menjalankan setup idempotent, lalu mode dev dengan pembukaan katalog otomatis melalui Vite. Mode development, host loopback, dan surat lokal ditetapkan pada proses launcher. Entry point migrasi memakai path.basename agar sesuai dengan path Windows.

Runner pengujian adalah Linux, Node.js 24.19, PGlite dan Chromium. Eksekusi klik launcher/browser pada Windows belum diuji langsung; perintah setup, server, fitur surat lokal dan tampilan diuji pada runner tersebut.

## Surat lokal

Pesan disimpan di `.local/mail` di luar direktori public/dist dan diabaikan Git. File dibuat dengan permission privat pada sistem yang mendukungnya; tidak ada endpoint untuk membaca kotak surat tersebut. Pesan berisi tautan pribadi dan hanya untuk pengujian di laptop, bukan bukti akses inbox email nyata. Pengguna menghapus pesan yang tidak diperlukan dan tidak membagikan folder/token. Mode ini tidak dipakai untuk production.

Konfigurasi Render/Neon/Resend yang sebelumnya disiapkan hanya referensi masa depan. Tidak ada pengiriman email nyata atau verifikasi provider online dalam release lokal ini.
