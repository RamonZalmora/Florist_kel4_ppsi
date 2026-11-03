import { db, transaction } from '../server/db/pool.js';
import { clearDemoOrders } from '../server/db/demo-orders.js';
try {
  const count = await transaction(clearDemoOrders);
  console.log(
    `${count} pesanan simulasi dihapus. Data lainnya tetap tersimpan. Setup berikutnya tidak akan menambahkan ulang demo.`,
  );
} finally {
  await db.end();
}
