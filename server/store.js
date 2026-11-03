import { db } from './db/pool.js';
export async function storeInfo() {
  const row = (
    await db.query(
      'SELECT name,address,map_url,latitude,longitude,whatsapp,instagram,tiktok,shopee,tokopedia,description,logo,about_story,about_service,care_tips FROM store_settings WHERE id=1',
    )
  ).rows[0];
  return (
    row || {
      name: 'Bien Vendre',
      latitude: 0.4734722222,
      longitude: 101.3748055556,
      map_url: 'https://maps.app.goo.gl/cZhMm6Z3326uHWz77',
      address: process.env.STORE_ADDRESS || 'Pekanbaru, Riau',
      whatsapp: '6282380087007',
      instagram: 'https://www.instagram.com/bienvendreofficial?psln=bm10anhqdTk5eG1y',
      shopee: 'https://shopee.co.id/bienvendreofficial',
      tokopedia: 'https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product',
      tiktok: 'https://www.tiktok.com/@bienvendreofficial?_r=1&_t=ZS-9AvTc8wk5O1',
      about_story: '',
      about_service: '',
      care_tips: '',
      description: 'Florist & Gifts',
      logo: '/assets/bien-mark.svg',
    }
  );
}
