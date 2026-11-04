UPDATE store_settings
SET address = 'Jl. Bangau Sakti, Simpang Baru, Binawidya, Kota Pekanbaru, Riau 28292',
    map_url = 'https://maps.app.goo.gl/JaEdz7xbLw2YZqXo9',
    latitude = NULL,
    longitude = NULL,
    updated_at = now()
WHERE id = 1;
