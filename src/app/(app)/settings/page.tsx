"use client";

import { useEffect, useState } from "react";

type Tenant = { id: string; name: string; slug: string };

export default function SettingsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/tenants");
    const data = await res.json();
    setTenants(data.tenants ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Operazione non consentita");
      return;
    }
    setName("");
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Impostazioni</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Multi-tenant
      </h1>
      <p className="mt-2 text-sm text-[#D2C4B4]">
        Ogni tenant isola pratiche, documenti, prompt e output. Solo l’admin di piattaforma può creare nuovi tenant.
      </p>

      <div className="card mt-8 p-5">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Tenant</h2>
        <ul className="mt-4 space-y-2">
          {tenants.map((t) => (
            <li key={t.id} className="flex justify-between rounded-xl bg-black/20 px-3 py-2">
              <span className="text-white">{t.name}</span>
              <span className="text-xs text-[#B8A99A]">{t.slug}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={createTenant} className="mt-5 flex gap-2">
          <input
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome nuovo tenant"
          />
          <button className="gold-btn rounded-xl px-4">Aggiungi</button>
        </form>
        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </div>
    </div>
  );
}
