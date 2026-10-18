import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';

const cookieName = 'qomus_admin';
const ttl = 8 * 60 * 60;
function key() {
  const value = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return value ? createHash('sha256').update('qomus-admin-session\0' + value).digest() : null;
}
function equal(a: string, b: string) {
  const x = createHash('sha256').update(a).digest();
  const y = createHash('sha256').update(b).digest();
  return timingSafeEqual(x, y);
}
function signature(value: string) {
  const secret = key();
  return secret ? createHmac('sha256', secret).update(value).digest('base64url') : '';
}
export function issueAdminToken(now = Date.now()) {
  if (!key()) throw new Error('Admin sozlanmagan');
  const body = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + ttl, nonce: randomBytes(24).toString('base64url') })).toString('base64url');
  return body + '.' + signature(body);
}
export function validAdminToken(token: string, now = Date.now()) {
  if (!key() || token.length > 1000) return false;
  const parts = token.split('.');
  if (parts.length !== 2 || !equal(parts[1], signature(parts[0]))) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Math.floor(now / 1000) && data.exp <= Math.floor(now / 1000) + ttl && typeof data.nonce === 'string';
  } catch { return false; }
}
function cookie(req: Request) {
  return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || '';
}
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!validAdminToken(cookie(req))) return res.status(401).json({ error: 'Admin sifatida qayta kiring' });
  next();
}
export function registerAdminAuth(app: Express) {
  const attempts = new Map<string, { count: number; until: number }>();
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    const host = req.get('host');
    if (origin) {
      try { if (new URL(origin).host !== host) return res.status(403).json({ error: 'So‘rov manbasi ruxsat etilmagan' }); }
      catch { return res.status(403).json({ error: 'So‘rov manbasi noto‘g‘ri' }); }
    }
    if (!req.is('application/json')) return res.status(415).json({ error: 'JSON so‘rov talab qilinadi' });
    next();
  });
  app.post('/api/auth/login', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const id = req.ip || 'unknown';
    const now = Date.now();
    let item = attempts.get(id);
    if (!item || item.until <= now) { item = { count: 0, until: now + 900000 }; attempts.set(id, item); }
    if (++item.count > 10) { res.setHeader('Retry-After', String(Math.ceil((item.until - now) / 1000))); return res.status(429).json({ error: 'Urinishlar ko‘paydi. Keyinroq urinib ko‘ring.' }); }
    if (attempts.size > 10000) for (const [name, value] of attempts) if (value.until <= now) attempts.delete(name);
    const username = process.env.ADMIN_USERNAME, password = process.env.ADMIN_PASSWORD;
    if (!username || !password) return res.status(503).json({ error: 'Admin sozlanmagan' });
    if (typeof req.body?.username !== 'string' || typeof req.body?.password !== 'string' || req.body.username.length > 256 || req.body.password.length > 1024 || !equal(req.body.username, username) || !equal(req.body.password, password)) return res.status(401).json({ error: 'Login yoki parol noto‘g‘ri' });
    res.cookie(cookieName, issueAdminToken(), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: ttl * 1000, path: '/' });
    res.json({ success: true, role: 'admin' });
  });
  app.get('/api/auth/me', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json({ isAdmin: validAdminToken(cookie(req)) }); });
  app.post('/api/auth/logout', (_req, res) => { res.clearCookie(cookieName, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' }); res.json({ success: true }); });
  app.use('/api/telegram', requireAdmin);
  app.use('/api/dictionary', (req, res, next) => ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : requireAdmin(req, res, next));
}
