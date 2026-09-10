"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { Logo } from "./Logo";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practices/new", label: "Nuova pratica" },
  { href: "/prompts", label: "Istruzioni IA" },
  { href: "/archive", label: "Archivio" },
  { href: "/settings", label: "Impostazioni" },
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/8 bg-[#071422]/90 px-5 py-6 backdrop-blur-xl md:flex">
        <Logo />
        <nav className="mt-10 flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[#C9A227]/15 text-[#F3E6C0]"
                    : "text-[#9BB0C3] hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl border border-white/8 bg-white/4 p-3">
          <div className="text-sm text-white">{user.name}</div>
          <div className="truncate text-xs text-[#8BA3B8]">{user.email}</div>
          <div className="mt-2 text-[10px] uppercase tracking-wider text-[#C9A227]">
            {user.tenantName} · {user.role.replace("_", " ")}
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/10 py-1.5 text-xs text-[#9BB0C3] hover:bg-white/5"
          >
            Esci
          </button>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[#071422]/70 px-4 py-3 backdrop-blur md:hidden">
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
