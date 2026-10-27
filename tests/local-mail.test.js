import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
const root = await mkdtemp(join(tmpdir(), 'bien-vendre-localmail-'));
process.env.NODE_ENV = 'test';
process.env.DB_DRIVER = 'pglite';
process.env.DB_DIRECTORY = join(root, 'db');
process.env.MAIL_MODE = 'local';
const { db } = await import('../server/db/pool.js');
const { migrate } = await import('../server/db/migrate.js');
const { app } = await import('../server/index.js');

test('local verification and recovery write private files, work without email service and are disabled in production', async () => {
  let server;
  const files = [];
  const address = 'local-' + randomBytes(6).toString('hex') + '@example.com',
    password = randomBytes(18).toString('hex');
  const directory = new URL('../.local/mail/', import.meta.url);
  async function mailToken(kind) {
    for (const name of await readdir(directory)) {
      const path = new URL(name, directory),
        text = await readFile(path, 'utf8');
      if (text.startsWith('To: ' + address + '\n') && text.includes('/' + kind + '#token=')) {
        if (!files.some((x) => x.href === path.href)) files.push(path);
        return text.match(/#token=([a-f0-9]{64})/)[1];
      }
    }
    throw new Error('Private local message not found');
  }
  try {
    await migrate();
    await db.query('INSERT INTO users(username,password_hash,name,role) VALUES($1,$2,$3,$4)', [
      'local-user',
      await bcrypt.hash(password, 12),
      'Local User',
      'admin',
    ]);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    async function request(path, body, session) {
      const response = await fetch(base + '/api/auth' + path, {
        method: body ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Cookie: session.cookie, 'X-CSRF-Token': session.csrf_token } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { response, data: await response.json() };
    }
    const status = await request('/recovery-status');
    assert.equal(status.data.mode, 'local');
    assert.equal(status.data.available, true);
    const login = await request('/login', { username: 'local-user', password });
    const session = {
      ...login.data,
      cookie: login.response.headers.get('set-cookie').split(';')[0],
    };
    assert.equal(
      (await request('/email/request', { email: address, password }, session)).response.status,
      200,
    );
    const verification = await mailToken('verify-email');
    assert.equal((await request('/email/verify', { token: verification })).response.status, 200);
    const reset = await request('/forgot-password', { email: address });
    assert.equal(reset.response.status, 200);
    assert.ok(!JSON.stringify(reset.data).includes('#token='));
    const token = await mailToken('reset-password');
    assert.equal(
      (await request('/reset-password', { token, password: password + 'x' })).response.status,
      200,
    );
    assert.equal(
      (await request('/login', { username: 'local-user', password: password + 'x' })).response
        .status,
      200,
    );
    const before = files.length;
    process.env.NODE_ENV = 'production';
    assert.equal((await request('/recovery-status')).data.available, false);
    assert.equal((await request('/forgot-password', { email: address })).response.status, 503);
    assert.equal(files.length, before);
  } finally {
    process.env.NODE_ENV = 'test';
    if (server) await new Promise((resolve) => server.close(resolve));
    await db.end();
    for (const file of files) await unlink(file);
    await rm(root, { recursive: true, force: true });
  }
});
