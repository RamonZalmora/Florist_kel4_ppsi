// Initial catalog supplied by the shop owner. Photo files are illustrative regenerations.
// The reference prices are used only to derive the initial direct-store price.
export const realCatalog = [
  {
    name: 'Bouquet Bunga Matahari Ceria',
    referencePrice: 172800,
    type: 'Bunga matahari dan bunga kecil',
    image: 1,
    description: 'Buket bunga matahari bernuansa cerah dengan bungkus kraft dan pita.',
  },
  {
    name: 'Bouquet Dried & Artificial Flower',
    referencePrice: 252500,
    type: 'Bunga kering dan bunga artificial',
    image: 2,
    description: 'Rangkaian bunga kering dan artificial dengan nuansa krem yang lembut.',
  },
  {
    name: 'Buket Bunga Merah Simple',
    referencePrice: 72000,
    type: 'Bunga hias merah dan putih',
    image: 3,
    description: 'Buket sederhana dengan aksen merah dan bungkus biru muda.',
  },
  {
    name: 'Bouquet Kupu-Kupu Pastel',
    referencePrice: 78500,
    type: 'Dekorasi kupu-kupu',
    image: 4,
    description: 'Buket dekorasi kupu-kupu dengan perpaduan warna pastel.',
  },
  {
    name: 'Bouquet Foto Personal',
    referencePrice: 125000,
    type: 'Bunga dan foto personal',
    image: 5,
    description: 'Buket dengan tempat foto personal. Materi foto dikonsultasikan dengan toko.',
  },
  {
    name: 'Bouquet Bunga Big Size',
    referencePrice: 325800,
    type: 'Bunga campuran',
    image: 6,
    description: 'Rangkaian bunga campuran berukuran besar dengan bungkus bernuansa lembut.',
  },
  {
    name: 'Bunga Vas Dekorasi Meja',
    referencePrice: 275000,
    type: 'Bunga dekorasi dan vas',
    image: 7,
    description: 'Rangkaian bunga bernuansa netral dalam vas untuk dekorasi meja.',
  },
  {
    name: 'Bloom Box Akrilik Ucapan',
    referencePrice: 350800,
    type: 'Bunga dan akrilik',
    image: 8,
    description:
      'Rangkaian bunga dengan papan akrilik untuk ucapan. Isi tulisan dikonsultasikan dengan toko.',
  },
  {
    name: 'Bouquet Wedding Baby’s Breath',
    referencePrice: 200000,
    type: 'Bunga kecil putih',
    image: 9,
    description: 'Hand bouquet berbentuk bulat dengan bunga-bunga kecil warna putih.',
  },
  {
    name: 'Bouquet Elsa Pink',
    referencePrice: 285800,
    type: 'Bunga campuran pink',
    image: 10,
    description: 'Rangkaian bunga bernuansa pink dengan aksen bunga lily.',
  },
  {
    name: 'Bouquet Boneka Wisuda Biru',
    referencePrice: 75000,
    type: 'Boneka dan bunga hias',
    image: 11,
    description: 'Buket boneka dengan nuansa biru dan aksen bunga.',
  },
  {
    name: 'Hand Bouquet Wedding Dried',
    referencePrice: 300000,
    type: 'Bunga kering dan bunga putih',
    image: 12,
    description: 'Hand bouquet pernikahan dengan rangkaian warna netral dan batang hias.',
  },
  {
    name: 'Bouquet Boneka Black',
    referencePrice: 72000,
    type: 'Boneka dan bunga hias',
    image: 13,
    description: 'Buket boneka dengan bungkus hitam dan aksen bunga.',
  },
  {
    name: 'Bouquet Wedding Premium',
    referencePrice: 550000,
    type: 'Bunga campuran pink',
    image: 21,
    description: 'Buket pernikahan dengan rangkaian menjuntai bernuansa pink.',
  },
  {
    name: 'Bouquet Wisuda Boneka',
    referencePrice: 175800,
    type: 'Boneka dan bunga hias',
    image: 14,
    description: 'Buket wisuda dengan boneka dan rangkaian bunga bernuansa hangat.',
  },
  {
    name: 'Bouquet Wedding Dried Gold',
    referencePrice: 375000,
    type: 'Bunga kering warna emas',
    image: 15,
    description: 'Hand bouquet pernikahan bernuansa emas dan bunga kering.',
  },
  {
    name: 'Bunga Vas Dekorasi Ungu',
    referencePrice: 325800,
    type: 'Bunga dekorasi dan vas',
    image: 16,
    description: 'Rangkaian bunga dan daun hias bernuansa ungu dalam vas.',
  },
  {
    name: 'Bouquet Estetik Edelweiss',
    referencePrice: 135500,
    type: 'Bunga hias putih',
    image: 17,
    description: 'Buket bunga putih dengan bungkus lembut bernuansa pink.',
  },
  {
    name: 'Mawar Satuan Spesial',
    referencePrice: 15000,
    type: 'Mawar merah',
    image: 18,
    description: 'Mawar merah dalam bungkus transparan untuk hadiah sederhana.',
  },
  {
    name: 'Mini Bouquet',
    referencePrice: 9800,
    type: 'Bunga mini',
    image: 19,
    description: 'Buket mini dengan rangkaian bunga kecil dan bungkus pastel.',
  },
  {
    name: 'Bouquet Mawar Merah Black',
    referencePrice: 192500,
    type: 'Mawar merah',
    image: 20,
    description: 'Buket mawar merah dengan bungkus hitam dan bunga kecil.',
  },
];
export const directPrice = (referencePrice) => Math.floor((referencePrice * 95) / 100 / 500) * 500;
export async function installRealCatalog(client) {
  const marker = 'real-catalog-2026-11';
  if (
    (await client.query('SELECT version FROM schema_migrations WHERE version=$1', [marker]))
      .rowCount
  )
    return;
  // Products remain in the database for past orders and can be reactivated by admin.
  await client.query('UPDATE products SET active=false WHERE active=true');
  for (const p of realCatalog) {
    await client.query(
      'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6)',
      [
        p.name,
        directPrice(p.referencePrice),
        p.type,
        'Konfirmasi dengan toko',
        p.description + ' Bentuk, ukuran, dan ketersediaan dapat dikonfirmasi sebelum memesan.',
        `/assets/catalog/product-${String(p.image).padStart(2, '0')}.webp`,
      ],
    );
  }
  await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
}
