"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
  slug: string;
  practices: number;
  documents: number;
  users: number;
  prompts: number;
};

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  async function load() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Non autorizzato");
      return;
    }
    setClients(data.clients ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function enter(tenantId: string) {
    await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, adminName, adminEmail, adminPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Creazione fallita");
      return;
    }
    setName("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Admin</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Clienti
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[#D2C4B4]">
        Ogni riga è uno spazio chiuso: pratiche, cartelle documenti e istruzioni IA proprie.
        Entra in un cliente per lavorarci senza mescolare i bagagli.
      </p>
      {error && <p className="mt-4 text-sm text-red-200">{error}</p>}

      <div className="mt-8 space-y-3">
        {clients.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <div className="text-lg text-white">{c.name}</div>
              <div className="mt-1 text-xs text-[#B8A99A]">{c.slug}</div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#D2C4B4]">
                <span>{c.practices} pratiche</span>
                <span>{c.documents} documenti</span>
                <span>{c.users} persone</span>
                <span>{c.prompts} istruzioni IA</span>
              </div>
            </div>
            <button onClick={() => enter(c.id)} className="gold-btn rounded-xl px-4 py-2 text-sm">
              Entra nello spazio
            </button>
          </div>
        ))}
        {!clients.length && !error && (
          <div className="card p-8 text-sm text-[#D2C4B4]">Nessun cliente ancora.</div>
        )}
      </div>

      <form onSubmit={createClient} className="card mt-10 grid gap-2 p-5 sm:grid-cols-2">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227] sm:col-span-2">
          Nuovo cliente
        </h2>
        <input className="field sm:col-span-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome spazio" required />
        <input className="field" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin — nome" />
        <input className="field" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Admin — email" />
        <input className="field sm:col-span-2" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Admin — password" />
        <button className="gold-btn rounded-xl px-4 py-2 sm:col-span-2">Crea spazio</button>
      </form>
    </div>
  );
}
