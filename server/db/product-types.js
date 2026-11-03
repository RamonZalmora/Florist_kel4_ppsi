export const initialProductTypes = [
  ['Bunga', 'bunga', 1],
  ['Bunga kering', 'kering', 2],
  ['Snack', 'snack', 46],
  ['Uang', 'uang', 43],
  ['Akrilik', 'akrilik', 27],
  ['Frame & mahar', 'frame', 55],
  ['Boneka', 'boneka', 54],
  ['Foto', 'foto', 47],
  ['Vas', 'vas', 64],
  ['Klobot', 'klobot', 22],
];
export async function assignProductTypes(client) {
  const types = (await client.query('SELECT id,code FROM product_types')).rows;
  const products = (
    await client.query('SELECT id,name,flower_type FROM products WHERE product_type_id IS NULL')
  ).rows;
  const rules = [
    ['frame', /frame|mahar/i],
    ['uang', /uang/i],
    ['snack', /snack|wafer|makanan/i],
    ['boneka', /boneka/i],
    ['foto', /foto/i],
    ['klobot', /klobot|kulit jagung/i],
    ['akrilik', /akrilik/i],
    ['vas', /vas/i],
    ['kering', /kering|dried|edelweiss/i],
  ];
  for (const p of products) {
    const code =
      rules.find(([, pattern]) => pattern.test(p.name + ' ' + p.flower_type))?.[0] || 'bunga';
    const type = types.find((t) => t.code === code);
    if (type)
      await client.query(
        'UPDATE products SET product_type_id=$1 WHERE id=$2 AND product_type_id IS NULL',
        [type.id, p.id],
      );
  }
}
export async function createProductTypes(client) {
  await client.query(
    "CREATE TABLE product_types(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name varchar(100) NOT NULL UNIQUE,description text NOT NULL DEFAULT '',photo text NOT NULL DEFAULT '/assets/floral-hero.svg',code varchar(40) UNIQUE)",
  );
  await client.query(
    'ALTER TABLE products ADD COLUMN product_type_id bigint REFERENCES product_types(id) ON DELETE RESTRICT',
  );
  await client.query('CREATE INDEX products_type_idx ON products(product_type_id)');
  for (const [name, code, image] of initialProductTypes)
    await client.query('INSERT INTO product_types(name,code,photo) VALUES($1,$2,$3)', [
      name,
      code,
      `/assets/catalog/product-${String(image).padStart(2, '0')}.webp`,
    ]);
  await assignProductTypes(client);
}
