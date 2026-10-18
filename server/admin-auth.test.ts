import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { issueAdminToken, validAdminToken, registerAdminAuth } from './admin-auth';

process.env.ADMIN_USERNAME = 'test-admin';
process.env.ADMIN_PASSWORD = randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
const app = express();
app.use(express.json());
registerAdminAuth(app);
app.get('/api/dictionary', (_req, res) => res.json({ public: true }));
app.post('/api/dictionary', (_req, res) => res.json({ saved: true }));
app.get('/api/telegram/users', (_req, res) => res.json([]));
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const base = 'http://127.0.0.1:' + (server.address() as any).port;
after(() => new Promise<void>(resolve => server.close(() => resolve())));
test('public search remains public, dictionary writes and Telegram data require real admin session', async () => {
  assert.equal((await fetch(base + '/api/dictionary')).status, 200);
  assert.equal((await fetch(base + '/api/telegram/users')).status, 401);
  assert.equal((await fetch(base + '/api/dictionary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
});
test('login creates HttpOnly cookie; forged and expired credentials do not grant access', async () => {
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD }) });
  assert.equal(login.status, 200);
  const value = login.headers.get('set-cookie')!;
  assert.match(value, /HttpOnly/); assert.match(value, /SameSite=Lax/);
  const cookie = value.split(';')[0];
  assert.equal((await fetch(base + '/api/dictionary', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{}' })).status, 200);
  const token = issueAdminToken();
  assert.equal(validAdminToken(token), true);
  assert.equal(validAdminToken(token + 'x'), false);
  assert.equal(validAdminToken(token, Date.now() + 9 * 3600000), false);
  assert.equal(validAdminToken(token, Date.now() - 9 * 3600000), false);
  const prior = process.env.ADMIN_PASSWORD; process.env.ADMIN_PASSWORD = randomBytes(32).toString('hex');
  assert.equal(validAdminToken(token), false); process.env.ADMIN_PASSWORD = prior;
});
test('cross-origin authenticated writes are rejected', async () => {
  const response = await fetch(base + '/api/dictionary', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 'qomus_admin=' + issueAdminToken(), Origin: 'https://unrelated.example' }, body: '{}' });
  assert.equal(response.status, 403);
});
