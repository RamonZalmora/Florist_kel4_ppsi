import { initialProductTypes } from './product-types.js';

// Explicit columns preserve business records, public settings and account credentials.
// Active sessions and single-use recovery tokens are intentionally excluded.
export const vpsTables = {
  users: [
    'id',
    'username',
    'password_hash',
    'name',
    'role',
    'created_at',
    'email',
    'email_verified',
  ],
  product_types: ['id', 'name', 'description', 'photo', 'code'],
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
    'updated_at',
    'product_type_id',
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
    'tracking_code',
  ],
  order_items: ['id', 'order_id', 'product_id', 'product_name', 'quantity', 'price'],
  sales: ['id', 'order_id', 'sale_date', 'total_sale'],
  store_settings: [
    'id',
    'name',
    'address',
    'whatsapp',
    'instagram',
    'description',
    'logo',
    'updated_at',
    'tiktok',
    'about_story',
    'about_service',
    'care_tips',
    'shopee',
    'tokopedia',
    'map_url',
    'latitude',
    'longitude',
  ],
  product_favorites: ['product_id', 'visitor_id', 'created_at'],
};

export async function createVpsSnapshot(source) {
  const tables = {};
  for (const [table, columns] of Object.entries(vpsTables)) {
    tables[table] = (await source.query(`SELECT ${columns.join(',')} FROM ${table}`)).rows;
  }
  const migrations = (
    await source.query('SELECT version,applied_at FROM schema_migrations ORDER BY version')
  ).rows;
  if (!migrations.some((row) => row.version === '018'))
    throw new Error('Jalankan migrasi terbaru pada database sumber dahulu.');
  return {
    format: 'bien-vendre-vps-transfer-v1',
    exported_at: new Date().toISOString(),
    migrations,
    tables,
  };
}

export async function restoreVpsSnapshot(destination, snapshot) {
  if (
    !snapshot ||
    snapshot.format !== 'bien-vendre-vps-transfer-v1' ||
    !Array.isArray(snapshot.migrations) ||
    !snapshot.migrations.some((row) => row.version === '018')
  )
    throw new Error('Berkas migrasi tidak valid atau belum memakai skema terbaru.');
  for (const [table, columns] of Object.entries(vpsTables)) {
    if (
      !Array.isArray(snapshot.tables?.[table]) ||
      snapshot.tables[table].some(
        (row) => !row || columns.some((column) => !Object.hasOwn(row, column)),
      )
    )
      throw new Error(`Data tabel ${table} tidak lengkap.`);
    if (
      table !== 'product_types' &&
      Number((await destination.query(`SELECT count(*) AS count FROM ${table}`)).rows[0].count)
    )
      throw new Error(`Database tujuan tidak kosong (${table}); migrasi dibatalkan.`);
  }
  for (const table of ['sessions', 'account_tokens']) {
    if (Number((await destination.query(`SELECT count(*) AS count FROM ${table}`)).rows[0].count))
      throw new Error(`Database tujuan tidak kosong (${table}); migrasi dibatalkan.`);
  }
  const existingTypes = (
    await destination.query('SELECT id,name,code,description FROM product_types ORDER BY id')
  ).rows;
  if (
    existingTypes.length !== initialProductTypes.length ||
    existingTypes.some(
      (row, index) =>
        Number(row.id) !== index + 1 ||
        row.name !== initialProductTypes[index][0] ||
        row.code !== initialProductTypes[index][1] ||
        row.description !== '',
    )
  )
    throw new Error('Jenis produk tujuan sudah berubah; migrasi dibatalkan.');
  await destination.query('DELETE FROM product_types');
  const counts = {};
  for (const [table, columns] of Object.entries(vpsTables)) {
    for (const row of snapshot.tables[table]) {
      const override = table !== 'product_favorites' ? ' OVERRIDING SYSTEM VALUE' : '';
      await destination.query(
        `INSERT INTO ${table}(${columns.join(',')})${override} VALUES(${columns.map((_, i) => '$' + (i + 1)).join(',')})`,
        columns.map((column) => row[column]),
      );
    }
    if (!['store_settings', 'product_favorites'].includes(table))
      await destination.query(
        `SELECT setval(pg_get_serial_sequence($1,'id'),COALESCE((SELECT max(id) FROM ${table}),1),EXISTS(SELECT 1 FROM ${table}))`,
        [table],
      );
    counts[table] = snapshot.tables[table].length;
  }
  for (const row of snapshot.migrations) {
    if (typeof row.version !== 'string' || !row.applied_at)
      throw new Error('Riwayat migrasi sumber tidak valid.');
    await destination.query(
      'INSERT INTO schema_migrations(version,applied_at) VALUES($1,$2) ON CONFLICT(version) DO NOTHING',
      [row.version, row.applied_at],
    );
  }
  return counts;
}
