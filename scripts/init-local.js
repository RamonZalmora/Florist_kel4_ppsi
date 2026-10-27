import { randomBytes } from 'node:crypto';
import { writeFile, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const path = fileURLToPath(new URL('../.env', import.meta.url));
const random = () => randomBytes(24).toString('hex');
const contents = `DB_DRIVER=pglite\nDB_DIRECTORY=.local/database\nMAIL_MODE=local\nPORT=3000\nSEED_ADMIN_PASSWORD=${random()}\nSEED_OWNER_PASSWORD=${random()}\nCOOKIE_SECURE=false\nSTORE_ADDRESS=Pekanbaru, Riau\nSTORE_WHATSAPP=\nSTORE_INSTAGRAM=\n`;
try {
  await writeFile(path, contents, { flag: 'wx', mode: 0o600 });
  await chmod(path, 0o600);
  console.log(
    'Created ignored .env with random local credentials. Read it locally; never commit it.',
  );
} catch (error) {
  if (error.code === 'EEXIST') console.log('Existing .env preserved.');
  else throw error;
}
