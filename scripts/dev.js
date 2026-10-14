import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import 'dotenv/config';
process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const webPort = Number(process.env.WEB_PORT || 3000);
const apiPort = Number(process.env.API_PORT || (webPort === 65535 ? 65534 : webPort + 1));
if (
  ![apiPort, webPort].every((port) => Number.isInteger(port) && port > 0 && port <= 65535) ||
  apiPort === webPort
) {
  throw new Error('API_PORT dan WEB_PORT harus port valid yang berbeda.');
}
for (const port of [apiPort, webPort]) {
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () =>
      reject(
        new Error(
          `Port ${port} sedang dipakai. Tutup proses sebelumnya atau pilih API_PORT/WEB_PORT lain.`,
        ),
      ),
    );
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
}
const children = [];
let stopping = false;
function signalTree(child, signal) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === 'win32') {
    // Node --watch owns a server subprocess; stop the entire owned tree.
    const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    killer.once('error', () => child.kill(signal));
  } else {
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) signalTree(child, 'SIGTERM');
  const timer = setTimeout(() => {
    for (const child of children) signalTree(child, 'SIGKILL');
    process.exit(code);
  }, 4000);
  timer.unref();
  Promise.all(
    children.map((child) =>
      child.exitCode !== null || child.signalCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => child.once('exit', resolve)),
    ),
  ).then(() => process.exit(code));
}
function launch(args, env) {
  const child = spawn(process.execPath, args, {
    stdio: 'inherit',
    env,
    detached: process.platform !== 'win32',
  });
  children.push(child);
  child.once('error', (error) => {
    console.error(error.message);
    stop(1);
  });
  child.once('exit', (code) => {
    if (!stopping) stop(code || 1);
  });
  return child;
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
launch(['--watch', 'server/index.js'], { ...process.env, PORT: String(apiPort) });
let ready = false;
for (let attempt = 0; attempt < 120 && !stopping; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* Backend is still starting. */
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!ready) {
  console.error(
    'Backend belum siap. Periksa pesan di atas dan jalankan npm run setup jika belum dilakukan.',
  );
  stop(1);
} else
  launch(['node_modules/vite/bin/vite.js', '--config', 'web/vite.config.js'], {
    ...process.env,
    API_PORT: String(apiPort),
    WEB_PORT: String(webPort),
  });
