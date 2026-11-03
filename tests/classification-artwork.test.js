import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import {
  classificationArtwork,
  installClassificationArtwork,
} from '../server/db/classification-artwork.js';

test('classification artwork installs once, preserves custom photos and descriptions, and has all 17 assets', async () => {
  const database = new PGlite();
  const client = {
    async query(sql, params = []) {
      const result = await database.query(sql, params);
      return { ...result, rowCount: result.rows?.length || result.affectedRows || 0 };
    },
  };
  try {
    await database.exec(`
      CREATE TABLE schema_migrations(version text PRIMARY KEY);
      CREATE TABLE categories(id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text,description text,photo text);
      CREATE TABLE product_types(id int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name text,description text,photo text);
      INSERT INTO categories(name,description,photo) VALUES
        ('Wedding','Keep description','/assets/catalog/product-09.webp'),
        ('Wisuda','Custom upload','/uploads/11111111-1111-4111-8111-111111111111.webp'),
        ('Hadiah','Custom URL','https://example.com/custom.webp');
      INSERT INTO product_types(name,description,photo) VALUES
        ('Bunga','Keep type description','/assets/catalog/product-01.webp'),
        ('Snack','Custom asset','/assets/my-own-photo.webp');
    `);
    await installClassificationArtwork(client);
    const categories = (await client.query('SELECT * FROM categories ORDER BY id')).rows;
    assert.equal(categories[0].photo, '/assets/classifications/occasion-wedding-v1.webp');
    assert.equal(categories[0].description, 'Keep description');
    assert.match(categories[1].photo, /^\/uploads\//);
    assert.equal(categories[2].photo, 'https://example.com/custom.webp');
    const types = (await client.query('SELECT * FROM product_types ORDER BY id')).rows;
    assert.equal(types[0].photo, '/assets/classifications/type-bunga-v1.webp');
    assert.equal(types[0].description, 'Keep type description');
    assert.equal(types[1].photo, '/assets/my-own-photo.webp');
    await client.query(
      "UPDATE categories SET photo='/assets/catalog/product-22.webp' WHERE name='Wedding'",
    );
    await installClassificationArtwork(client);
    assert.equal(
      (await client.query("SELECT photo FROM categories WHERE name='Wedding'")).rows[0].photo,
      '/assets/catalog/product-22.webp',
    );
    assert.equal(classificationArtwork.length, 17);
    for (const [, , filename] of classificationArtwork) {
      await access(
        new URL('../web/public/assets/classifications/' + filename + '-v1.webp', import.meta.url),
      );
    }
  } finally {
    await database.close();
  }
});
