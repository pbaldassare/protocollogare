"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { Logo } from "./Logo";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Pratiche" },
  { href: "/practices/new", label: "Nuova pratica" },
  { href: "/documents", label: "Documenti" },
  { href: "/prompts", label: "Istruzioni IA" },
  { href: "/settings", label: "Spazio" },
];

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user.role !== "platform_admin") return;
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => setClients(d.tenants ?? []));
  }, [user.role]);

  async function switchSpace(tenantId: string) {
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/8 bg-[#3F3832]/90 px-5 py-6 backdrop-blur-xl md:flex">
        <Logo />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {user.role === "platform_admin" && (
            <Link
              href="/clients"
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                pathname === "/clients" || pathname.startsWith("/clients/")
                  ? "bg-[#C9A227]/15 text-[#F3E6C0]"
                  : "text-[#D2C4B4] hover:bg-white/5 hover:text-white"
              }`}
            >
              Clienti
            </Link>
          )}
          {CLIENT_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[#C9A227]/15 text-[#F3E6C0]"
                    : "text-[#D2C4B4] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
          <div className="text-sm text-white">{user.name}</div>
          <div className="truncate text-xs text-[#B8A99A]">{user.email}</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-[#C9A227]">
            {user.workspaceTenantName || user.tenantName}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[#B8A99A]">
            {user.role.replace("_", " ")}
          </div>
          {user.role === "platform_admin" && clients.length > 0 && (
            <select
              className="field mt-2 py-1 text-xs"
              value={user.workspaceTenantId || user.tenantId}
              onChange={(e) => switchSpace(e.target.value)}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-[#D2C4B4] hover:bg-white/5"
          >
            Esci
          </button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#3F3832]/70 px-4 py-3 backdrop-blur md:hidden">
          <Logo compact />
          <button onClick={logout} className="text-xs text-[#C9A227]">
            Esci
          </button>
        </header>
        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
