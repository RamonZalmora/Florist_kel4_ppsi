import { db } from './db/pool.js';
export async function storeInfo() {
  const row = (
    await db.query(
      'SELECT name,address,whatsapp,instagram,description,logo FROM store_settings WHERE id=1',
    )
  ).rows[0];
  return (
    row || {
      name: 'Bien Vendre',
      address: process.env.STORE_ADDRESS || 'Pekanbaru, Riau',
      whatsapp: process.env.STORE_WHATSAPP || '',
      instagram: process.env.STORE_INSTAGRAM || '',
      description: 'Florist & Gifts',
      logo: '/assets/logo.svg',
    }
  );
}
