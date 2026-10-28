import { db } from './db/pool.js';
export async function storeInfo() {
  const row = (
    await db.query(
      'SELECT name,address,whatsapp,instagram,tiktok,shopee,tokopedia,description,logo,about_story,about_service,care_tips FROM store_settings WHERE id=1',
    )
  ).rows[0];
  return (
    row || {
      name: 'Bien Vendre',
      address: process.env.STORE_ADDRESS || 'Pekanbaru, Riau',
      whatsapp: '6282380087007',
      instagram: 'https://share.google/PciYm0L1lPyb6IhXpc',
      shopee: 'https://shopee.co.id/bienvendreofficial',
      tokopedia: 'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
      tiktok: '',
      about_story: '',
      about_service: '',
      care_tips: '',
      description: 'Florist & Gifts',
      logo: '/assets/logo.svg',
    }
  );
}
