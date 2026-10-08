import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { db } from '../db/pool.js';
import { authenticate,authorize } from '../auth.js';
import { period } from '../validation.js';
export const reports=Router();
reports.use(authenticate,authorize('owner'));
async function sales(from,to){return (await db.query('SELECT s.*,o.customer_name,o.phone_number FROM sales s JOIN orders o ON o.id=s.order_id WHERE sale_date BETWEEN $1 AND $2 ORDER BY sale_date DESC,s.id DESC',[from,to])).rows;}
reports.get('/',async(req,res)=>{
  const {from,to}=period(req.query),rows=await sales(from,to);
  res.json({from,to,rows,count:rows.length,total:rows.reduce((sum,r)=>sum+Number(r.total_sale),0)});
});
reports.get('/pdf',async(req,res)=>{
  const {from,to}=period(req.query),rows=await sales(from,to);
  const money=v=>'Rp '+Number(v).toLocaleString('id-ID');
  res.set({'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="bien-vendre-${from}-${to}.pdf"`});
  const doc=new PDFDocument({size:'A4',margin:44});doc.pipe(res);
  doc.fillColor('#345747').fontSize(26).text('BIEN VENDRE');doc.fillColor('#333333').fontSize(15).text('Laporan Penjualan');doc.fontSize(10).text(`Periode: ${from} sampai ${to}`).text(`Dicetak: ${new Date().toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})} WIB`).moveDown();
  const header=()=>{doc.font('Helvetica-Bold').text('Pesanan / Tanggal / Pelanggan / Total').font('Helvetica').moveDown(.5);};header();
  if(!rows.length)doc.text('Tidak ada penjualan pada periode ini.');
  for(const row of rows){if(doc.y>735){doc.addPage();header();}doc.text(`#BV-${String(row.order_id).padStart(4,'0')} | ${new Date(row.sale_date).toISOString().slice(0,10)} | ${row.customer_name} | ${money(row.total_sale)}`).moveDown(.5);}
  doc.moveDown().font('Helvetica-Bold').text(`Jumlah transaksi: ${rows.length}`).text(`Total penjualan: ${money(rows.reduce((n,r)=>n+Number(r.total_sale),0))}`);doc.end();
});
export const dashboard=Router();dashboard.use(authenticate);
dashboard.get('/',async(req,res)=>{
  const [summary,trend,popular]=await Promise.all([
    db.query(`SELECT (SELECT COALESCE(sum(total_sale),0) FROM sales WHERE date_trunc('month',sale_date)=date_trunc('month',(now() AT TIME ZONE 'Asia/Jakarta')::date)) AS revenue,(SELECT count(*)::int FROM orders WHERE status IN ('pending','processing')) AS pending_orders,(SELECT count(DISTINCT phone_number)::int FROM orders) AS customers,(SELECT count(*)::int FROM products WHERE active=true) AS products,(SELECT count(*)::int FROM orders WHERE status='completed') AS completed_orders`),
    db.query(`SELECT to_char(d.day,'YYYY-MM-DD') AS day,COALESCE(sum(s.total_sale),0) AS total FROM generate_series((now() AT TIME ZONE 'Asia/Jakarta')::date-6,(now() AT TIME ZONE 'Asia/Jakarta')::date,'1 day'::interval) d(day) LEFT JOIN sales s ON s.sale_date=d.day::date GROUP BY d.day ORDER BY d.day`),
    db.query(`SELECT p.id,p.name,p.photo,COALESCE(sum(i.quantity) FILTER(WHERE o.status='completed'),0)::int AS sold FROM products p LEFT JOIN order_items i ON i.product_id=p.id LEFT JOIN orders o ON o.id=i.order_id WHERE p.active=true GROUP BY p.id ORDER BY sold DESC,p.id LIMIT 4`)
  ]);res.json({summary:summary.rows[0],trend:trend.rows,popular:popular.rows});
});
