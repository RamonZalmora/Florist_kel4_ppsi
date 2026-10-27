import { storeInfo } from '../store.js';
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db/pool.js';
import { authenticate, authorize } from '../auth.js';
import { period } from '../validation.js';
export const reports = Router();
reports.use(authenticate, authorize('admin', 'owner'));
async function sales(from, to) {
  return (
    await db.query(
      'SELECT s.*,o.customer_name,o.phone_number FROM sales s JOIN orders o ON o.id=s.order_id WHERE sale_date BETWEEN $1 AND $2 ORDER BY sale_date DESC,s.id DESC',
      [from, to],
    )
  ).rows;
}
reports.get('/', async (req, res) => {
  const { from, to } = period(req.query),
    rows = await sales(from, to);
  res.json({
    from,
    to,
    rows,
    trend: Object.values(
      rows.reduce((out, r) => {
        const day = new Date(r.sale_date).toISOString().slice(0, 10),
          key = (new Date(to) - new Date(from)) / 86400000 > 62 ? day.slice(0, 7) : day;
        out[key] ||= { day: key, total: 0 };
        out[key].total += Number(r.total_sale);
        return out;
      }, {}),
    ).sort((a, b) => a.day.localeCompare(b.day)),
    count: rows.length,
    total: rows.reduce((sum, r) => sum + Number(r.total_sale), 0),
  });
});
reports.get('/pdf', async (req, res) => {
  const { from, to } = period(req.query),
    rows = await sales(from, to);
  const money = (v) => 'Rp ' + Number(v).toLocaleString('id-ID');
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="bien-vendre-${from}-${to}.pdf"`,
  });
  const store = await storeInfo();
  const doc = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true });
  doc.pipe(res);
  const left = 44,
    width = 507;
  function title() {
    doc
      .fillColor('#254d3c')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(store.name, left, 42, { width });
    doc.font('Helvetica').fontSize(10).fillColor('#6b7e6a').text('LAPORAN PENJUALAN', left, 75);
    doc.text(`Periode ${from} - ${to}`, left, 93);
    doc.text(
      `Dicetak ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      left,
      109,
    );
  }
  function header(y) {
    doc.rect(left, y, width, 28).fill('#254d3c');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
    for (const [label, x, w] of [
      ['Pesanan', 50, 72],
      ['Tanggal', 125, 80],
      ['Pelanggan', 208, 185],
      ['Total (Rp)', 397, 147],
    ])
      doc.text(label, x, y + 9, { width: w, align: x === 397 ? 'right' : 'left' });
    return y + 28;
  }
  title();
  let y = header(141),
    index = 0;
  for (const row of rows) {
    doc.font('Helvetica').fontSize(9);
    const nameHeight = doc.heightOfString(row.customer_name, { width: 181 });
    const height = Math.max(34, nameHeight + 18);
    if (y + height > 735) {
      doc.addPage();
      doc
        .fillColor('#254d3c')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(store.name + ' - Lanjutan', left, 40);
      y = header(70);
    }
    if (index++ % 2 === 0) doc.rect(left, y, width, height).fill('#f1f4ed');
    doc
      .fillColor('#263e33')
      .font('Helvetica')
      .fontSize(9)
      .text('BV-' + String(row.order_id).padStart(4, '0'), 50, y + 9, { width: 72 })
      .text(new Date(row.sale_date).toISOString().slice(0, 10), 125, y + 9, { width: 80 })
      .text(row.customer_name, 208, y + 9, { width: 181 })
      .text(money(row.total_sale), 397, y + 9, { width: 147, align: 'right' });
    y += height;
  }
  if (!rows.length) {
    doc
      .fillColor('#63705e')
      .fontSize(11)
      .text('Tidak ada penjualan pada periode ini.', left, y + 18);
    y += 55;
  }
  if (y + 85 > 735) {
    doc.addPage();
    y = 55;
  }
  doc
    .moveTo(left, y + 12)
    .lineTo(left + width, y + 12)
    .strokeColor('#cbd7c1')
    .stroke();
  doc
    .fillColor('#254d3c')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`Jumlah transaksi: ${rows.length}`, left, y + 28)
    .text(
      'Total penjualan: ' + money(rows.reduce((n, r) => n + Number(r.total_sale), 0)),
      left,
      y + 48,
      { width, align: 'right' },
    );
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#7d8877')
      .text('Bien Vendre - Dokumen internal', 44, 770, { lineBreak: false })
      .text(`${i + 1} / ${range.count}`, 480, 770, { width: 71, align: 'right', lineBreak: false });
  }
  doc.end();
});
export const dashboard = Router();
dashboard.use(authenticate);
dashboard.get('/', async (req, res) => {
  const [summary, trend, popular] = await Promise.all([
    db.query(
      `SELECT (SELECT COALESCE(sum(total_sale),0) FROM sales WHERE date_trunc('month',sale_date)=date_trunc('month',(now() AT TIME ZONE 'Asia/Jakarta')::date)) AS revenue,(SELECT count(*)::int FROM orders) AS total_orders,(SELECT count(*)::int FROM orders WHERE status IN ('pending','processing')) AS pending_orders,(SELECT count(DISTINCT phone_number)::int FROM orders) AS customers,(SELECT count(*)::int FROM products WHERE active=true) AS products,(SELECT count(*)::int FROM orders WHERE status='completed') AS completed_orders`,
    ),
    db.query(
      `SELECT to_char(d.day,'YYYY-MM-DD') AS day,COALESCE(sum(s.total_sale),0) AS total FROM generate_series((now() AT TIME ZONE 'Asia/Jakarta')::date-6,(now() AT TIME ZONE 'Asia/Jakarta')::date,'1 day'::interval) d(day) LEFT JOIN sales s ON s.sale_date=d.day::date GROUP BY d.day ORDER BY d.day`,
    ),
    db.query(
      `SELECT p.id,p.name,p.photo,count(f.visitor_id)::int AS favorite_count FROM products p LEFT JOIN product_favorites f ON f.product_id=p.id WHERE p.active=true GROUP BY p.id ORDER BY favorite_count DESC,p.id DESC LIMIT 4`,
    ),
  ]);
  res.json({ summary: summary.rows[0], trend: trend.rows, popular: popular.rows });
});
