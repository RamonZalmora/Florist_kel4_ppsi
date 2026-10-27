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
export async function addDemoBouquets(client) {
  for (let i = 0; i < flowers.length; i++) {
    const [name, type, price, category] = flowers[i];
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
        [
          name,
          price,
          type,
          'Medium',
          'Rangkaian bunga untuk melengkapi momen istimewa Anda.',
          `/assets/bouquets/bouquet-${String(i + 1).padStart(2, '0')}.webp`,
        ],
      )
    ).rows[0];
    await client.query(
      'INSERT INTO recommendations(category_id,product_id,note) VALUES($1,$2,$3)',
      [cat.id, product.id, 'Pilihan untuk momen istimewa'],
    );
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
  }
}
