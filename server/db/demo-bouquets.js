// Sample photography and fictional catalogue, installed once without changing existing products.
const flowers = [
  ['Ivory Romance', 'Mawar putih', 650000, 'Pernikahan'],
  ['Blushing Rose', 'Mawar pink', 325000, 'Ulang Tahun'],
  ['Sunny Wishes', 'Bunga matahari', 225000, 'Wisuda'],
  ['Lily Grace', 'Lily putih', 550000, 'Pernikahan'],
  ['Scarlet Love', 'Mawar merah', 575000, 'Hadiah Spesial'],
  ['Pastel Dreams', 'Hydrangea dan mawar', 395000, 'Ulang Tahun'],
  ['Tulip Celebration', 'Tulip warna-warni', 495000, 'Wisuda'],
  ['Orchid Elegance', 'Anggrek dan mawar putih', 875000, 'Pernikahan'],
  ['Pink Garden', 'Mawar dan lisianthus', 355000, 'Ulang Tahun'],
  ['Golden Graduation', 'Bunga matahari dan daisy', 285000, 'Wisuda'],
  ['Ruby Affection', 'Mawar merah dan pink', 475000, 'Hadiah Spesial'],
  ['Blue Serenity', 'Hydrangea biru dan mawar', 625000, 'Pernikahan'],
  ['Lavender Wishes', 'Mawar dan lavender', 345000, 'Ulang Tahun'],
  ['Joyful Bloom', 'Mawar dan hydrangea', 315000, 'Wisuda'],
  ['Calla Forever', 'Calla lily putih', 795000, 'Pernikahan'],
  ['Peony Delight', 'Peony pink', 725000, 'Hadiah Spesial'],
  ['Autumn Celebration', 'Dahlia dan mawar', 425000, 'Hadiah Spesial'],
  ['Blue Skies', 'Mawar putih dan delphinium', 385000, 'Wisuda'],
  ['Pink Lily', 'Lily dan mawar pink', 375000, 'Ulang Tahun'],
  ['Lavender Love', 'Mawar ungu dan lavender', 465000, 'Hadiah Spesial'],
];
const birthdayExamples = {
  1: [
    'Birthday Rose Box',
    'Mawar merah dan krisan putih',
    'Box · 15 cm',
    'Rangkaian bunga dalam kotak untuk merayakan ulang tahun.',
    '/assets/birthdays/birthday-rose-box.webp',
  ],
  5: [
    'Blush Cake & Flowers',
    'Mawar dan gerbera pink',
    'Gift box · bunga dan kue',
    'Kotak hadiah ulang tahun berisi rangkaian bunga dan kue. Detail kue dikonfirmasi dengan toko.',
    '/assets/birthdays/birthday-blush-cake.webp',
  ],
  8: [
    'Ruby Cake & Flowers',
    'Mawar merah dan bunga pink',
    'Gift box · bunga dan kue',
    'Kotak bunga dan kue bernuansa merah untuk hadiah ulang tahun. Detail kue dikonfirmasi dengan toko.',
    '/assets/birthdays/birthday-ruby-cake.webp',
  ],
  12: [
    'Lavender Cake & Flowers',
    'Mawar dan bunga lavender',
    'Gift box · bunga dan kue',
    'Hadiah ulang tahun bernuansa lavender dengan bunga dan kue. Detail kue dikonfirmasi dengan toko.',
    '/assets/birthdays/birthday-lavender-cake.webp',
  ],
  18: [
    'Pink Lily Birthday Box',
    'Lily dan mawar pink',
    'Flower box · medium',
    'Rangkaian lily dan mawar dalam kotak untuk momen ulang tahun.',
    '/assets/birthdays/birthday-pink-lily.webp',
  ],
};

export async function addDemoBouquets(client) {
  for (let i = 0; i < flowers.length; i++) {
    const [originalName, originalType, price, category] = flowers[i];
    const [name, type, size, description, photo] = birthdayExamples[i] || [
      originalName,
      originalType,
      'Medium',
      'Rangkaian bunga untuk melengkapi momen istimewa Anda.',
      `/assets/bouquets/bouquet-${String(i + 1).padStart(2, '0')}.webp`,
    ];
    // The reserved marker prevents re-adding products deleted by the shop later.
    const marker = `demo-bouquet-${i + 1}`;
    const done = await client.query('SELECT version FROM schema_migrations WHERE version=$1', [
      marker,
    ]);
    if (done.rowCount) continue;
    let cat = (await client.query('SELECT id FROM categories WHERE name=$1', [category])).rows[0];
    if (!cat)
      cat = (
        await client.query('INSERT INTO categories(name,description) VALUES($1,$2) RETURNING id', [
          category,
          'Pilihan bunga untuk momen istimewa',
        ])
      ).rows[0];
    const product = (
      await client.query(
        'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [name, price, type, size, description, photo],
      )
    ).rows[0];
    await client.query(
      'INSERT INTO recommendations(category_id,product_id,note) VALUES($1,$2,$3)',
      [cat.id, product.id, 'Pilihan untuk momen istimewa'],
    );
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
  }
}
