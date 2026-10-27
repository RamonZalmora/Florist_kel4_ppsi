const tables = {
  users: ['id', 'username', 'password_hash', 'name', 'role', 'created_at'],
  categories: ['id', 'name', 'description', 'photo'],
  products: [
    'id',
    'name',
    'price',
    'flower_type',
    'size',
    'description',
    'photo',
    'active',
    'created_at',
  ],
  recommendations: ['id', 'category_id', 'product_id', 'note'],
  orders: [
    'id',
    'customer_name',
    'phone_number',
    'order_date',
    'delivery_date',
    'request',
    'status',
    'total',
    'created_by',
    'created_at',
  ],
  order_items: ['id', 'order_id', 'product_id', 'product_name', 'quantity', 'price'],
  sales: ['id', 'order_id', 'sale_date', 'total_sale'],
};

// Caller supplies a consistent read-only source snapshot and a destination transaction.
export async function transfer(source, destination) {
  for (const table of Object.keys(tables)) {
    const existing = await destination.query(`SELECT count(*) AS count FROM ${table}`);
    if (Number(existing.rows[0].count))
      throw new Error(
        'Database tujuan harus kosong. Pilih DB_DIRECTORY baru; data yang sudah ada tidak akan ditimpa.',
      );
  }
  const counts = {};
  for (const [table, columns] of Object.entries(tables)) {
    const { rows } = await source.query(`SELECT ${columns.join(',')} FROM ${table} ORDER BY id`);
    for (const row of rows) {
      await destination.query(
        `INSERT INTO ${table}(${columns.join(',')}) OVERRIDING SYSTEM VALUE VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
        columns.map((column) =>
          table === 'orders' && column === 'status' && row[column] === 'processing'
            ? 'pending'
            : row[column],
        ),
      );
    }
    await destination.query(
      `SELECT setval(pg_get_serial_sequence($1,'id'),COALESCE((SELECT MAX(id) FROM ${table}),1),EXISTS(SELECT 1 FROM ${table}))`,
      [table],
    );
    counts[table] = rows.length;
  }
  // Old sessions are intentionally not transferred; users sign in again.
  return counts;
}
