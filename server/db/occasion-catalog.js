import { realCatalog } from './real-catalog.js';
import { catalogBatchTwo } from './catalog-batch-two.js';

// Initial suggestions only; the admin can change these recommendations afterwards.
export const occasionCatalog = [
  {
    name: 'Wedding',
    description: 'Untuk hari bahagia dan janji selamanya.',
    photo: 9,
    products: [2, 9, 12, 15, 21, 25, 27, 33, 37, 48, 49, 50, 55, 56, 57, 58, 59, 60],
  },
  {
    name: 'Wisuda',
    description: 'Rayakan langkah baru dan pencapaian istimewa.',
    photo: 54,
    products: [5, 6, 11, 14, 17, 20, 24, 26, 34, 36, 39, 40, 42, 43, 44, 46, 47, 53, 54, 62, 63],
  },
  {
    name: 'Hadiah',
    description: 'Hadiah penuh perhatian untuk orang tersayang.',
    photo: 31,
    products: [
      1, 2, 3, 4, 5, 6, 10, 11, 13, 14, 17, 18, 19, 20, 23, 24, 26, 27, 28, 29, 30, 31, 32, 34, 35,
      36, 38, 39, 40, 42, 43, 44, 45, 46, 47, 51, 52, 53, 54, 62, 63, 65,
    ],
  },
  {
    name: 'Suvenir',
    description: 'Kenang-kenangan kecil yang berkesan.',
    photo: 22,
    products: [18, 19, 22, 25, 27, 28, 32, 33, 35, 41, 51, 61, 62, 65],
  },
  {
    name: 'Dekorasi',
    description: 'Percantik sudut dan momen spesial.',
    photo: 7,
    products: [
      7, 8, 16, 22, 25, 27, 33, 37, 41, 49, 50, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
    ],
  },
  {
    name: 'Ulang Tahun',
    description: 'Kejutan manis untuk hari istimewa.',
    photo: 10,
    products: [1, 4, 5, 6, 10, 13, 17, 20, 26, 31, 34, 36, 38, 39, 40, 42, 43, 44, 47, 52, 53, 63],
  },
  {
    name: 'Hari Guru',
    description: 'Ucapan terima kasih untuk guru tercinta.',
    photo: 51,
    products: [18, 19, 22, 26, 28, 32, 35, 51, 53, 65],
  },
];

export async function installOccasionCatalog(client) {
  const marker = 'occasion-catalog-2026-11';
  if (
    (await client.query('SELECT version FROM schema_migrations WHERE version=$1', [marker]))
      .rowCount
  )
    return;
  const products = [...realCatalog, ...catalogBatchTwo];
  for (const occasion of occasionCatalog) {
    let category = (
      await client.query(
        'SELECT id FROM categories WHERE lower(name)=lower($1) ORDER BY id LIMIT 1',
        [occasion.name],
      )
    ).rows[0];
    if (!category)
      category = (
        await client.query(
          'INSERT INTO categories(name,description,photo) VALUES($1,$2,$3) RETURNING id',
          [
            occasion.name,
            occasion.description,
            `/assets/catalog/product-${String(occasion.photo).padStart(2, '0')}.webp`,
          ],
        )
      ).rows[0];
    for (const image of occasion.products) {
      const item = products.find((p) => p.image === image);
      if (!item) continue;
      await client.query(
        `INSERT INTO recommendations(category_id,product_id)
        SELECT $1,p.id FROM products p WHERE p.active=true AND (p.photo=$2 OR p.name=$3)
        ON CONFLICT(category_id,product_id) DO NOTHING`,
        [category.id, `/assets/catalog/product-${String(image).padStart(2, '0')}.webp`, item.name],
      );
    }
  }
  await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
}
