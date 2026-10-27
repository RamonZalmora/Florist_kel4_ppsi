import bcrypt from 'bcryptjs';
import { db, transaction } from './pool.js';
import { migrate } from './migrate.js';
import { addDemoBouquets } from './demo-bouquets.js';
const products = [
  [
    'Rosy Reverie',
    285000,
    'Mawar pink, eucalyptus',
    'Medium · 12 tangkai',
    'Rangkaian mawar merah muda dengan sentuhan eucalyptus. Pilihan lembut untuk mengungkapkan rasa sayang.',
    '/assets/bouquet-rose.svg',
  ],
  [
    'Sunshine Bouquet',
    195000,
    'Bunga matahari, baby’s breath',
    'Medium · 8 tangkai',
    'Bawa energi ceria di hari istimewa dengan bunga matahari dan bungkus bernuansa krem.',
    '/assets/bouquet-sun.svg',
  ],
  [
    'Ivory Wedding',
    650000,
    'Mawar putih, ranunculus',
    'Large · 24 tangkai',
    'Handbouquet elegan untuk pernikahan, dirangkai dengan bunga putih dan pita satin.',
    '/assets/bouquet-ivory.svg',
  ],
  [
    'Blush Graduation',
    225000,
    'Mawar, baby’s breath',
    'Medium · 10 tangkai',
    'Hadiah manis untuk merayakan kelulusan dan awal perjalanan yang baru.',
    '/assets/bouquet-rose.svg',
  ],
  [
    'Memories Frame',
    175000,
    'Bunga kering, frame kayu',
    'Frame · 20 × 25 cm',
    'Frame gift dengan dekorasi bunga kering untuk menyimpan kenangan istimewa. Foto pelanggan disesuaikan melalui konsultasi.',
    '/assets/frame.svg',
  ],
  [
    'Mahar Elegance',
    475000,
    'Bunga kering, frame akrilik',
    'Frame · 30 × 40 cm',
    'Frame mahar minimalis dengan aksen floral krem. Isi mahar disediakan pelanggan.',
    '/assets/frame.svg',
  ],
];
try {
  await migrate();
  await transaction(async (client) => {
    for (const [username, name, role, variable] of [
      ['admin', 'Admin Toko', 'admin', 'SEED_ADMIN_PASSWORD'],
      ['owner', 'Owner Bien Vendre', 'owner', 'SEED_OWNER_PASSWORD'],
    ]) {
      const exists = await client.query('SELECT id FROM users WHERE username=$1', [username]);
      if (!exists.rowCount) {
        const password = process.env[variable];
        if (!password || password.length < 12)
          throw new Error(`${variable} wajib diisi minimal 12 karakter sebelum seed.`);
        await client.query(
          'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4)',
          [username, await bcrypt.hash(password, 12), name, role],
        );
      }
    }
    if (process.env.SEED_DEMO === 'false') return;
    if ((await client.query('SELECT id FROM products LIMIT 1')).rowCount) {
      await addDemoBouquets(client);
      return;
    }
    const cats = [];
    for (const [name, description] of [
      ['Ulang Tahun', 'Rayakan hari yang penuh kebahagiaan'],
      ['Wisuda', 'Untuk langkah baru yang membanggakan'],
      ['Pernikahan', 'Cerita cinta yang indah'],
      ['Hadiah Spesial', 'Perhatian kecil, makna besar'],
    ])
      cats.push(
        (
          await client.query(
            'INSERT INTO categories(name,description) VALUES($1,$2) RETURNING id',
            [name, description],
          )
        ).rows[0].id,
      );
    const ids = [];
    for (const p of products)
      ids.push(
        (
          await client.query(
            'INSERT INTO products(name,price,flower_type,size,description,photo) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
            p,
          )
        ).rows[0].id,
      );
    for (const [c, p, note] of [
      [0, 0, 'Mawar pink untuk hari penuh cinta'],
      [0, 1, 'Warna cerah untuk ulang tahun'],
      [1, 3, 'Buket perayaan kelulusan'],
      [1, 1, 'Semangat untuk perjalanan baru'],
      [2, 2, 'Handbouquet untuk pengantin'],
      [2, 5, 'Frame mahar untuk akad'],
      [3, 0, 'Ungkapkan perhatian'],
      [3, 4, 'Kenangan dalam frame'],
    ])
      await client.query(
        'INSERT INTO recommendations(category_id,product_id,note) VALUES($1,$2,$3)',
        [cats[c], ids[p], note],
      );
    const admin = (await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1")).rows[0]
      .id;
    for (let i = 0; i < 7; i++) {
      const p = products[i % 6],
        status = i < 4 ? 'completed' : 'pending';
      const o = (
        await client.query(
          "INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,request,status,total,created_by) VALUES($1,$2,(now() AT TIME ZONE 'Asia/Jakarta')::date-$3::int,(now() AT TIME ZONE 'Asia/Jakarta')::date+2,$4,$5,$6,$7) RETURNING id",
          [
            [
              'Alya Putri',
              'Nadia Safira',
              'Dinda Rahma',
              'Rani Pratiwi',
              'Salsa Amalia',
              'Maya Lestari',
              'Putri Aulia',
            ][i],
            '08000000' + String(i).padStart(4, '0'),
            6 - i,
            '[DATA DEMO] Kartu ucapan dengan pita krem',
            status,
            p[1],
            admin,
          ],
        )
      ).rows[0];
      await client.query(
        'INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,$3,1,$4)',
        [o.id, ids[i % 6], p[0], p[1]],
      );
      if (status === 'completed')
        await client.query(
          "INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,(now() AT TIME ZONE 'Asia/Jakarta')::date-$2::int,$3)",
          [o.id, 6 - i, p[1]],
        );
    }
    await addDemoBouquets(client);
  });
  console.log('Seed complete. Existing accounts and catalog preserved. Demo data is fictional.');
} finally {
  await db.end();
}
