"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Tenant = { id: string; name: string; slug: string };
type Person = { id: string; email: string; name: string; role: string };
type LibDoc = { id: string; title: string; kind: string; filename: string; size: number };
type Memory = { id: string; kind: string; content: string };

export default function SettingsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<Person[]>([]);
  const [library, setLibrary] = useState<LibDoc[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [me, setMe] = useState<{ role: string; workspaceTenantId?: string } | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [clientName, setClientName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("editor");

  const [memoryKind, setMemoryKind] = useState("fact");
  const [memoryText, setMemoryText] = useState("");

  async function load() {
    const [t, u, l, m, meRes] = await Promise.all([
      fetch("/api/tenants").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/library").then((r) => r.json()),
      fetch("/api/memories").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]);
    setTenants(t.tenants ?? []);
    setUsers(u.users ?? []);
    setLibrary(l.documents ?? []);
    setMemories(m.memories ?? []);
    setMe(meRes.user ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function createClient(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: clientName,
        adminName,
        adminEmail,
        adminPassword,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Operazione non consentita");
      return;
    }
    setClientName("");
    setAdminName("");
    setAdminEmail("");
    setAdminPassword("");
    setInfo(`Cliente “${data.tenant?.name}” creato con spazio e IA propri.`);
    await load();
  }

  async function enterSpace(tenantId: string) {
    const res = await fetch("/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    if (!res.ok) return;
    router.refresh();
    await load();
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: userName,
        email: userEmail,
        password: userPassword,
        role: userRole,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Utente non creato");
      return;
    }
    setUserName("");
    setUserEmail("");
    setUserPassword("");
    await load();
  }

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/memories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: memoryKind, content: memoryText }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Memoria non salvata");
      return;
    }
    setMemoryText("");
    await load();
  }

  async function uploadLibrary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/library", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Upload fallito");
      return;
    }
    e.currentTarget.reset();
    await load();
  }

  const platform = me?.role === "platform_admin";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Impostazioni</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
          Spazi cliente
        </h1>
        <p className="mt-2 text-sm text-[#D2C4B4]">
          Ogni cliente ha il suo bagaglio: persone, pratiche, documenti, prompt e memoria IA.
          I dati non si mescolano.
        </p>
      </div>

      {error && <p className="text-sm text-red-200">{error}</p>}
      {info && <p className="text-sm text-[#9EE6E2]">{info}</p>}

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Clienti</h2>
        <ul className="mt-4 space-y-2">
          {tenants.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
              <div>
                <span className="text-white">{t.name}</span>
                <span className="ml-2 text-xs text-[#B8A99A]">{t.slug}</span>
              </div>
              {platform && (
                <button
                  onClick={() => enterSpace(t.id)}
                  className="text-xs text-[#F3E6C0] hover:underline"
                >
                  {me?.workspaceTenantId === t.id ? "Spazio attivo" : "Entra"}
                </button>
              )}
            </li>
          ))}
        </ul>
        {platform && (
          <form onSubmit={createClient} className="mt-5 grid gap-2 sm:grid-cols-2">
            <input
              className="field sm:col-span-2"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome cliente"
              required
            />
            <input
              className="field"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="Admin — nome"
            />
            <input
              className="field"
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="Admin — email"
            />
            <input
              className="field sm:col-span-2"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin — password (min. 8)"
            />
            <button className="gold-btn rounded-xl px-4 py-2 sm:col-span-2">
              Crea spazio cliente
            </button>
          </form>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Persone di questo spazio</h2>
        <ul className="mt-4 space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex justify-between rounded-xl bg-black/20 px-3 py-2">
              <span className="text-white">
                {u.name} <span className="text-xs text-[#B8A99A]">{u.email}</span>
              </span>
              <span className="text-xs uppercase text-[#C9A227]">{u.role.replace("_", " ")}</span>
            </li>
          ))}
          {!users.length && <li className="text-sm text-[#D2C4B4]">Nessun utente in questo spazio.</li>}
        </ul>
        {(platform || me?.role === "admin") && (
          <form onSubmit={addUser} className="mt-5 grid gap-2 sm:grid-cols-2">
            <input className="field" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome" required />
            <input className="field" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Email" required />
            <input className="field" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} placeholder="Password" required />
            <select className="field" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
              <option value="editor">Editor</option>
              <option value="admin">Admin cliente</option>
              <option value="viewer">Solo lettura</option>
            </select>
            <button className="gold-btn rounded-xl px-4 py-2 sm:col-span-2">Aggiungi persona</button>
          </form>
        )}
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Libreria del cliente</h2>
        <p className="mt-2 text-sm text-[#D2C4B4]">
          Modelli, visure, RUI, standard interni. Entrano nel contesto IA di ogni gara di questo spazio.
        </p>
        <ul className="mt-4 space-y-2">
          {library.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
              <span className="text-white">
                {d.title} <span className="text-xs text-[#B8A99A]">{d.kind} · {d.filename}</span>
              </span>
              <button
                className="text-xs text-red-200"
                onClick={async () => {
                  await fetch(`/api/library?id=${d.id}`, { method: "DELETE" });
                  await load();
                }}
              >
                Rimuovi
              </button>
            </li>
          ))}
          {!library.length && <li className="text-sm text-[#D2C4B4]">Libreria vuota.</li>}
        </ul>
        <form onSubmit={uploadLibrary} className="mt-5 space-y-2">
          <input className="field" name="title" placeholder="Titolo (opzionale)" />
          <select className="field" name="kind" defaultValue="azienda">
            <option value="azienda">Azienda</option>
            <option value="modello">Modello</option>
            <option value="normativa">Normativa</option>
            <option value="altro">Altro</option>
          </select>
          <input className="field" type="file" name="file" required />
          <button className="gold-btn rounded-xl px-4 py-2">Carica in libreria</button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Memoria IA</h2>
        <p className="mt-2 text-sm text-[#D2C4B4]">
          Fatti, stile e correzioni con cui alleni l’IA di questo cliente.
        </p>
        <ul className="mt-4 space-y-2">
          {memories.map((m) => (
            <li key={m.id} className="rounded-xl bg-black/20 px-3 py-2">
              <div className="flex justify-between gap-3">
                <span className="text-[10px] uppercase tracking-wider text-[#C9A227]">{m.kind}</span>
                <button
                  className="text-xs text-red-200"
                  onClick={async () => {
                    await fetch(`/api/memories?id=${m.id}`, { method: "DELETE" });
                    await load();
                  }}
                >
                  Rimuovi
                </button>
              </div>
              <p className="mt-1 text-sm text-white">{m.content}</p>
            </li>
          ))}
          {!memories.length && <li className="text-sm text-[#D2C4B4]">Nessuna memoria.</li>}
        </ul>
        <form onSubmit={addMemory} className="mt-5 space-y-2">
          <select className="field" value={memoryKind} onChange={(e) => setMemoryKind(e.target.value)}>
            <option value="fact">Fatto</option>
            <option value="style">Stile</option>
            <option value="correction">Correzione</option>
          </select>
          <textarea
            className="field min-h-24"
            value={memoryText}
            onChange={(e) => setMemoryText(e.target.value)}
            placeholder="Es. Siamo intermediari Sez. B. Distingui ARPAL da ARPA."
            required
          />
          <button className="gold-btn rounded-xl px-4 py-2">Aggiungi alla memoria</button>
        </form>
      </div>
    </div>
  );
}
