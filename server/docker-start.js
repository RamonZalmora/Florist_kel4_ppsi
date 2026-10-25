import { spawn } from 'node:child_process';

// When running inside Docker Compose, DB_HOST is set to the postgres service name ("db")
if (process.env.DB_HOST) {
  process.env.DB_DRIVER = 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'florist_secret_2026';
  process.env.DATABASE_URL = `postgresql://florist:${encodeURIComponent(password)}@${process.env.DB_HOST}:5432/bien_vendre`;
}

async function run(script) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { stdio: 'inherit' });
    const forward = (signal) => child.kill(signal);
    const interrupt = () => forward('SIGINT');
    const terminate = () => forward('SIGTERM');
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', terminate);
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', terminate);
      if (signal || code !== 0) reject(new Error(`Startup ${script} gagal (${signal || code}).`));
      else resolve();
    });
  });
}

await run('server/db/migrate.js');
if (process.env.SEED_DEMO !== 'false') await run('server/db/seed.js');
await import('./index.js');
