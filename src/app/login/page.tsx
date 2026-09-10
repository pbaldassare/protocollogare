"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("paolo.baldassare@gmail.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Accesso negato");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-[#C9A227]/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[380px] w-[380px] rounded-full bg-[#1AA6A0]/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0B1F33]/80 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <Logo />
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl text-white">
          Accesso sicuro
        </h1>
        <p className="mt-2 text-sm text-[#9BB0C3]">
          Area riservata per pratiche, prompt e output di gara.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
            Email
            <input
              className="field mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
            Password
            <input
              className="field mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          <button className="gold-btn w-full rounded-xl py-3" disabled={loading}>
            {loading ? "Verifica in corso…" : "Entra"}
          </button>
        </form>
        <p className="mt-6 text-center text-[11px] text-[#6F8599]">
          ID Guard · sessione cifrata · multi-tenant
        </p>
      </div>
    </div>
  );
}
