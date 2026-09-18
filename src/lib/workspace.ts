import type { SessionUser } from "./types";

export function workspaceId(session: SessionUser) {
  return session.workspaceTenantId || session.tenantId;
}

export function workspaceName(session: SessionUser) {
  return session.workspaceTenantName || session.tenantName;
}

export function inWorkspace(session: SessionUser, tenantId: string) {
  return workspaceId(session) === tenantId;
}

export function isPlatformAdmin(session: SessionUser) {
  return session.role === "platform_admin";
}
