import { Router } from 'express';
import { db } from '../db/pool.js';
import { authenticate,authorize } from '../auth.js';
import { idSchema,productSchema,categorySchema,recommendationSchema,fail } from '../validation.js';
export const catalog=Router();
catalog.get('/store',(req,res)=>res.json({name:'Bien Vendre',address:process.env.STORE_ADDRESS||'Pekanbaru, Riau',whatsapp:process.env.STORE_WHATSAPP||'',instagram:process.env.STORE_INSTAGRAM||''}));
catalog.get('/categories',async(req,res)=>res.json((await db.query('SELECT c.*,count(r.id)::int AS product_count FROM categories c LEFT JOIN recommendations r ON r.category_id=c.id LEFT JOIN products p ON p.id=r.product_id AND p.active=true GROUP BY c.id ORDER BY c.id')).rows));
catalog.get('/products',async(req,res)=>{
  const search=String(req.query.search||'').slice(0,120), category=req.query.category ? idSchema.parse(req.query.category) : null;
  res.json((await db.query(`SELECT p.*,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p WHERE p.active=true AND (p.name ILIKE $1 OR p.description ILIKE $1) AND ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM recommendations r WHERE r.product_id=p.id AND r.category_id=$2)) ORDER BY p.id`,['%'+search+'%',category])).rows);
});
catalog.get('/products/:id',async(req,res)=>{
  const {rows}=await db.query("SELECT p.*,COALESCE((SELECT json_agg(json_build_object('id',c.id,'name',c.name,'note',r.note)) FROM recommendations r JOIN categories c ON c.id=r.category_id WHERE r.product_id=p.id),'[]') AS categories FROM products p WHERE p.id=$1 AND p.active=true",[idSchema.parse(req.params.id)]);
  if(!rows.length)fail(404,'Produk tidak ditemukan.');res.json(rows[0]);
});
export const management=Router();
management.use(authenticate,authorize('admin'));
management.get('/products',async(req,res)=>res.json((await db.query('SELECT * FROM products ORDER BY id DESC')).rows));
for (const [path,table,schema,columns] of [
  ['products','products',productSchema,['name','price','flower_type','size','description','photo','active']],
  ['categories','categories',categorySchema,['name','description','photo']],
  ['recommendations','recommendations',recommendationSchema,['category_id','product_id','note']]
]) {
  management.post('/'+path,async(req,res)=>{
    const body=schema.parse(req.body);
    const {rows}=await db.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING *`,columns.map(k=>body[k]));res.status(201).json(rows[0]);
  });
  management.put('/'+path+'/:id',async(req,res)=>{
    const body=schema.parse(req.body),id=idSchema.parse(req.params.id);
    const {rows}=await db.query(`UPDATE ${table} SET ${columns.map((k,i)=>k+'=$'+(i+1)).join(',')} WHERE id=$${columns.length+1} RETURNING *`,[...columns.map(k=>body[k]),id]);
    if(!rows.length)fail(404,'Data tidak ditemukan.');res.json(rows[0]);
  });
  management.delete('/'+path+'/:id',async(req,res)=>{
    const result=await db.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`,[idSchema.parse(req.params.id)]);
    if(!result.rowCount)fail(404,'Data tidak ditemukan.');res.json({ok:true});
  });
}
management.get('/recommendations',async(req,res)=>res.json((await db.query('SELECT r.*,p.name AS product_name,p.photo,p.active,c.name AS category_name FROM recommendations r JOIN products p ON p.id=r.product_id JOIN categories c ON c.id=r.category_id ORDER BY r.id DESC')).rows));
