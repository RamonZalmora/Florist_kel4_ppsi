import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
for (const script of [
  'scripts/init-local.js',
  'server/db/migrate.js',
  'server/db/seed.js',
  'node_modules/vite/bin/vite.js',
]) {
  const args = script.includes('/vite/')
    ? [script, 'build', '--config', 'web/vite.config.js']
    : [script];
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('Setup selesai. Jalankan npm run dev, lalu buka http://localhost:3000/catalog');
