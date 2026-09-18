import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { findUserByEmail as findUserRow, getTenant } from "./store";
import type { SessionUser } from "./types";

const COOKIE = "pgare_session";
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET || "protocollo-gare-dev-secret-change-me",
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
    const user = payload as unknown as SessionUser;
    if (!user.workspaceTenantId) user.workspaceTenantId = user.tenantId;
    if (!user.workspaceTenantName) user.workspaceTenantName = user.tenantName;
    return user;
  } catch {
    return null;
  }
}

export async function findUserByEmail(email: string) {
  return findUserRow(email);
}

export async function toSessionUser(
  user: {
    id: string;
    email: string;
    name: string;
    role: SessionUser["role"];
    tenantId: string;
  },
  workspaceTenantId?: string,
): Promise<SessionUser> {
  const home = await getTenant(user.tenantId);
  const workspace =
    workspaceTenantId && workspaceTenantId !== user.tenantId
      ? await getTenant(workspaceTenantId)
      : home;
  const tenantName = home?.name ?? "Protocollo Gare";
  const space = workspace ?? home;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName,
    workspaceTenantId: space?.id ?? user.tenantId,
    workspaceTenantName: space?.name ?? tenantName,
  };
}

export function canSeeAllTenants(role: SessionUser["role"]) {
  return role === "platform_admin";
}
