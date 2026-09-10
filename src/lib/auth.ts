import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { readDb } from "./store";
import type { SessionUser } from "./types";

const COOKIE = "idguard_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "idguard-protocollogare-dev-secret-change-me",
);

export async function verifyPassword(password: string, hash: string) {
  return compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export function findUserByEmail(email: string) {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function toSessionUser(user: {
  id: string;
  email: string;
  name: string;
  role: SessionUser["role"];
  tenantId: string;
}): SessionUser {
  const db = readDb();
  const tenant = db.tenants.find((t) => t.id === user.tenantId);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: tenant?.name ?? "ID Guard",
  };
}

export function canSeeAllTenants(role: SessionUser["role"]) {
  return role === "platform_admin";
}
