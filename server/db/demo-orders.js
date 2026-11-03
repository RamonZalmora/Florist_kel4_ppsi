// Explicitly labelled local demonstration orders; never real customer contact data.
export async function seedDemoOrders(client) {
  const marker = 'demo-orders-30-v1';
  if (
    (await client.query('SELECT version FROM schema_migrations WHERE version=$1', [marker]))
      .rowCount
  )
    return;
  const admin = (await client.query("SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1"))
    .rows[0];
  const products = (
    await client.query('SELECT id,name,price FROM products WHERE active=true ORDER BY id')
  ).rows;
  if (!admin || products.length < 3) return;
  const preferred = [
    'Bouquet Wedding Edelweiss',
    'Bouquet Boneka Wisuda Sage',
    'Bouquet Mawar Merah Black',
    'Bouquet Bunga Matahari Ceria',
    'Vas Bunga Meja Gift Natural',
    'Bouquet Snack Black',
    'Bouquet Uang White Pink',
    'Frame Mahar Bunga Biru',
    'Mini Bouquet Special Hari Guru',
    'Bunga Klobot Natural',
    'Akrilik Gift Bunga Kering',
    'Bouquet Elsa Pink',
  ];
  const selection = preferred.map((name) => products.find((p) => p.name === name)).filter(Boolean);
  if (!selection.length) selection.push(...products.slice(0, 12));
  const names = [
    'Alya Putri',
    'Rizky Pratama',
    'Nadia Safitri',
    'Dimas Saputra',
    'Intan Permata',
    'Fajar Ramadhan',
    'Citra Lestari',
    'Arif Maulana',
    'Salsa Amelia',
    'Rani Wulandari',
    'Andi Kurniawan',
    'Putri Maharani',
    'Dewi Anggraini',
    'Farhan Akbar',
    'Nisa Azzahra',
  ];
  const today = (
    await client.query("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS day")
  ).rows[0].day;
  const day = (offset) => {
    const d = new Date(today + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  for (let i = 0; i < 30; i++) {
    const completed = i < 24;
    const offset = completed ? -Math.floor(i / 2) : 0;
    const choices = [selection[i % selection.length]];
    if (i % 3 === 0) choices.push(selection[(i + 3) % selection.length]);
    const items = [...new Map(choices.map((p) => [String(p.id), p])).values()].map((p, j) => ({
      ...p,
      quantity: 1 + ((i + j) % 3),
    }));
    const total =
      items.reduce((n, p) => n + Math.round(Number(p.price) * 100) * p.quantity, 0) / 100;
    const order = (
      await client.query(
        `INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,request,status,total,created_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz) RETURNING id`,
        [
          '[DEMO] ' + names[i % names.length],
          '08000000' + String((i % names.length) + 1).padStart(4, '0'),
          day(offset - 1),
          day(completed ? offset : 1 + (i % 3)),
          'DATA SIMULASI — kontak bukan nomor pelanggan asli. Contoh pesanan ' +
            (i + 1) +
            ': konfirmasi warna dan kartu ucapan.',
          completed ? 'completed' : 'pending',
          total,
          admin.id,
          day(offset) + 'T' + String(8 + (i % 9)).padStart(2, '0') + ':00:00+07:00',
        ],
      )
    ).rows[0];
    for (const p of items)
      await client.query(
        'INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,$3,$4,$5)',
        [order.id, p.id, p.name, p.quantity, p.price],
      );
    if (completed)
      await client.query('INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,$2,$3)', [
        order.id,
        day(offset),
        total,
      ]);
  }
  await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
}

export async function clearDemoOrders(client) {
  const ids = (
    await client.query(
      "SELECT id FROM orders WHERE customer_name LIKE '[DEMO]%' AND request LIKE 'DATA SIMULASI%' AND phone_number LIKE '08000000%' FOR UPDATE",
    )
  ).rows.map((row) => row.id);
  if (!ids.length) return 0;
  await client.query('DELETE FROM sales WHERE order_id=ANY($1::bigint[])', [ids]);
  await client.query('DELETE FROM orders WHERE id=ANY($1::bigint[])', [ids]);
  return ids.length;
}
