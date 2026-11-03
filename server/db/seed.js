import bcrypt from 'bcryptjs';
import { db, transaction } from './pool.js';
import { migrate } from './migrate.js';
import { installRealCatalog } from './real-catalog.js';
import { installCatalogBatchTwo } from './catalog-batch-two.js';
import { installOccasionCatalog } from './occasion-catalog.js';
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
          throw new Error(`${variable} wajib diisi minimal 12 karakter sebelum setup.`);
        await client.query(
          'INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4)',
          [username, await bcrypt.hash(password, 12), name, role],
        );
      }
    }
    await installRealCatalog(client);
    await installCatalogBatchTwo(client);
    await installOccasionCatalog(client);
  });
  console.log('Setup selesai. Akun, data penjualan, dan produk lama tetap tersimpan.');
} finally {
  await db.end();
}
