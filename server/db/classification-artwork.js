// Generated 3D artwork for the initial classification library.
// Only initial stock photos are replaced; uploaded and custom images are preserved.
export const classificationArtwork = [
  ['occasion', 'Wedding', 'occasion-wedding'],
  ['occasion', 'Wisuda', 'occasion-wisuda'],
  ['occasion', 'Hadiah', 'occasion-hadiah'],
  ['occasion', 'Suvenir', 'occasion-suvenir'],
  ['occasion', 'Dekorasi', 'occasion-dekorasi'],
  ['occasion', 'Ulang Tahun', 'occasion-ulang-tahun'],
  ['occasion', 'Hari Guru', 'occasion-hari-guru'],
  ['type', 'Bunga', 'type-bunga'],
  ['type', 'Bunga kering', 'type-bunga-kering'],
  ['type', 'Snack', 'type-snack'],
  ['type', 'Uang', 'type-uang'],
  ['type', 'Akrilik', 'type-akrilik'],
  ['type', 'Frame & mahar', 'type-frame-mahar'],
  ['type', 'Boneka', 'type-boneka'],
  ['type', 'Foto', 'type-foto'],
  ['type', 'Vas', 'type-vas'],
  ['type', 'Klobot', 'type-klobot'],
];

export async function installClassificationArtwork(client) {
  for (const [kind, table] of [
    ['occasion', 'categories'],
    ['type', 'product_types'],
  ]) {
    const marker = 'classification-artwork-' + kind + '-v1';
    if (
      (await client.query('SELECT version FROM schema_migrations WHERE version=$1', [marker]))
        .rowCount
    )
      continue;
    const entries = classificationArtwork.filter(([group]) => group === kind);
    const exists = await client.query(
      `SELECT id FROM ${table} WHERE lower(name)=ANY($1::text[]) LIMIT 1`,
      [entries.map(([, name]) => name.toLowerCase())],
    );
    if (!exists.rowCount) continue;
    for (const [, name, filename] of entries) {
      await client.query(
        `UPDATE ${table} SET photo=$1 WHERE lower(name)=lower($2)
         AND (photo LIKE '/assets/catalog/product-%' OR photo=ANY($3::text[]))`,
        [
          '/assets/classifications/' + filename + '-v1.webp',
          name,
          [
            '/assets/floral-hero.svg',
            '/assets/bouquet-rose.svg',
            '/assets/moment-wedding.svg',
            '/assets/moment-grad.svg',
            '/assets/moment-gift.svg',
            '/assets/moment-teacher.svg',
          ],
        ],
      );
    }
    await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [marker]);
  }
}
