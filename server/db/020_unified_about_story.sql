UPDATE store_settings
SET about_story = $story$Bien Vendre adalah toko florist dan hadiah di Pekanbaru yang menghadirkan rangkaian bunga artificial dan bunga kering untuk berbagai momen istimewa. Mulai dari wisuda, ulang tahun, pernikahan, hingga ungkapan terima kasih, kami membantu Anda menemukan rangkaian yang sesuai dengan kebutuhan dan anggaran.

Melalui katalog kami, Anda dapat melihat pilihan produk, foto, dan harga sebelum memesan. Untuk menanyakan ketersediaan, pilihan warna, ucapan, serta jadwal pengambilan atau pengiriman, silakan berkonsultasi dengan tim Bien Vendre melalui WhatsApp. Setiap detail pesanan dikonfirmasi bersama agar rangkaian yang dipilih sesuai dengan momen yang ingin Anda rayakan.$story$,
    about_service = '',
    care_tips = '',
    updated_at = now()
WHERE id = 1;
