import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, RequestHandler } from "express";

const TOKEN_TTL_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;

type AdminTokenPayload = {
  role: "admin";
  username: string;
  exp: number;
};

type LoginAttempt = {
  count: number;
  resetAt: number;
};

const loginAttempts = new Map<string, LoginAttempt>();

function getTokenSecret(): string | null {
  return process.env.ADMIN_TOKEN_SECRET || process.env.ADMIN_PASSWORD || null;
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return forwardedIp?.trim() || req.ip || req.socket.remoteAddress || "unknown";
}

export function createAdminToken(username: string): string {
  const secret = getTokenSecret();
  if (!secret) throw new Error("Admin token secret is not configured");

  const payload: AdminTokenPayload = {
    role: "admin",
    username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const secret = getTokenSecret();
  if (!secret) return null;

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) return null;
  if (!safeEqual(signature, signPayload(encodedPayload, secret))) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as AdminTokenPayload;

    if (
      payload.role !== "admin" ||
      typeof payload.username !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) return null;

    return payload;
  } catch {
    return null;
  }
}

export const adminLoginRateLimit: RequestHandler = (req, res, next) => {
  const key = getClientKey(req);
  const now = Date.now();
  const current = loginAttempts.get(key);

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", retryAfterSeconds.toString());
    res.status(429).json({ error: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring." });
    return;
  }

  current.count += 1;
  next();
};

export function clearAdminLoginAttempts(req: Request): void {
  loginAttempts.delete(getClientKey(req));
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Administrator sifatida kirish talab qilinadi" });
    return;
  }

  const payload = verifyAdminToken(authorization.slice("Bearer ".length).trim());
  if (!payload) {
    res.status(401).json({ error: "Administrator sessiyasi eskirgan yoki noto'g'ri" });
    return;
  }

  res.locals.admin = payload;
  next();
};

export function adminCredentialsMatch(username: unknown, password: unknown): boolean {
  const configuredUsername = process.env.ADMIN_USERNAME;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredUsername || !configuredPassword || typeof username !== "string" || typeof password !== "string") {
    return false;
  }
  return safeEqual(username, configuredUsername) && safeEqual(password, configuredPassword);
}

