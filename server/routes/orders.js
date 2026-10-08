import { Router } from 'express';
import { db,transaction } from '../db/pool.js';
import { authenticate,authorize } from '../auth.js';
import { idSchema,orderSchema,statusSchema,fail } from '../validation.js';
export const orders=Router();
orders.use(authenticate);
orders.get('/',async(req,res)=>{
  res.json((await db.query(`SELECT o.*,COALESCE(json_agg(json_build_object('id',i.id,'product_id',i.product_id,'product_name',i.product_name,'quantity',i.quantity,'price',i.price,'subtotal',i.subtotal)) FILTER(WHERE i.id IS NOT NULL),'[]') AS items FROM orders o LEFT JOIN order_items i ON i.order_id=o.id GROUP BY o.id ORDER BY o.created_at DESC,o.id DESC LIMIT 500`)).rows);
});
async function saveOrder(client,input,userId,id) {
  const products=(await client.query('SELECT id,name,price,active FROM products WHERE id=ANY($1::bigint[]) FOR SHARE',[input.items.map(i=>i.product_id)])).rows;
  const items=input.items.map(i=>{
    const p=products.find(p=>String(p.id)===String(i.product_id));
    if(!p||!p.active)fail(422,'Produk tidak ditemukan atau tidak aktif.');
    return {...i,product_name:p.name,price:p.price};
  });
  const totalCents=items.reduce((n,i)=>n+Math.round(Number(i.price)*100)*i.quantity,0);
  const values=[input.customer_name,input.phone_number,input.order_date,input.delivery_date,input.request,totalCents/100];
  let row;
  if(id){
    row=(await client.query('UPDATE orders SET customer_name=$1,phone_number=$2,order_date=$3,delivery_date=$4,request=$5,total=$6 WHERE id=$7 RETURNING *',[...values,id])).rows[0];
    await client.query('DELETE FROM order_items WHERE order_id=$1',[id]);
  } else row=(await client.query('INSERT INTO orders(customer_name,phone_number,order_date,delivery_date,request,total,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[...values,userId])).rows[0];
  for(const item of items)await client.query('INSERT INTO order_items(order_id,product_id,product_name,quantity,price) VALUES($1,$2,$3,$4,$5)',[row.id,item.product_id,item.product_name,item.quantity,item.price]);
  return row;
}
orders.post('/',authorize('admin'),async(req,res)=>{
  const input=orderSchema.parse(req.body);
  const row=await transaction(client=>saveOrder(client,input,req.user.id));res.status(201).json(row);
});
orders.put('/:id',authorize('admin'),async(req,res)=>{
  const input=orderSchema.parse(req.body),id=idSchema.parse(req.params.id);
  res.json(await transaction(async client=>{
    const row=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!row)fail(404,'Pesanan tidak ditemukan.');
    if(['completed','cancelled'].includes(row.status))fail(409,'Pesanan selesai atau dibatalkan tidak dapat diubah.');
    return saveOrder(client,input,req.user.id,id);
  }));
});
orders.patch('/:id/status',authorize('admin'),async(req,res)=>{
  const id=idSchema.parse(req.params.id),{status}=statusSchema.parse(req.body);
  res.json(await transaction(async client=>{
    const row=(await client.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!row)fail(404,'Pesanan tidak ditemukan.');
    if(row.status===status)return row;
    const transitions={pending:['processing','cancelled'],processing:['completed','cancelled'],completed:[],cancelled:[]};
    if(!transitions[row.status].includes(status))fail(409,'Perubahan status tidak diizinkan. Pesanan harus diproses sebelum diselesaikan.');
    if(status==='completed')await client.query('INSERT INTO sales(order_id,sale_date,total_sale) VALUES($1,(now() AT TIME ZONE \'Asia/Jakarta\')::date,$2)',[id,row.total]);
    return (await client.query('UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',[status,id])).rows[0];
  }));
});
orders.delete('/:id',authorize('admin'),async(req,res)=>{
  await transaction(async client=>{
    const row=(await client.query('SELECT status FROM orders WHERE id=$1 FOR UPDATE',[idSchema.parse(req.params.id)])).rows[0];
    if(!row)fail(404,'Pesanan tidak ditemukan.');
    if(row.status!=='pending')fail(409,'Hanya pesanan baru yang dapat dihapus. Batalkan pesanan yang sedang diproses.');
    await client.query('DELETE FROM orders WHERE id=$1',[idSchema.parse(req.params.id)]);
  });res.json({ok:true});
});
