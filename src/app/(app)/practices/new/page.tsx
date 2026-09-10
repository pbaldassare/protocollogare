"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Prompt = { id: string; name: string };

export default function NewPracticePage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((d) => setPrompts(d.prompts ?? []));
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/practices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: fd.get("title"),
        ente: fd.get("ente"),
        cig: fd.get("cig"),
        notes: fd.get("notes"),
        promptId: fd.get("promptId"),
        extraInstruction: fd.get("extraInstruction"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Errore");
      return;
    }
    router.push(`/practices/${data.practice.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Nuova pratica</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Carica una gara
      </h1>
      <form onSubmit={onSubmit} className="card mt-8 space-y-4 p-6">
        <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
          Titolo
          <input name="title" className="field mt-1" required placeholder="ARPAL Puglia — Brokeraggio 2026-2028" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
            Ente
            <input name="ente" className="field mt-1" placeholder="ARPAL Puglia" />
          </label>
          <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
            CIG / RDO
            <input name="cig" className="field mt-1" placeholder="6522966" />
          </label>
        </div>
        <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
          Prompt / formato
          <select name="promptId" className="field mt-1">
            {prompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
          Note
          <textarea name="notes" className="field mt-1 min-h-20" />
        </label>
        <label className="block text-xs uppercase tracking-wider text-[#8BA3B8]">
          Istruzione extra per l’IA
          <textarea
            name="extraInstruction"
            className="field mt-1 min-h-24"
            placeholder="Es. tono ARPAL, max 20 pagine, tieni fuori ogni elemento economico dal tecnico."
          />
        </label>
        {error && <p className="text-sm text-red-200">{error}</p>}
        <button className="gold-btn rounded-xl px-5 py-2.5" disabled={loading}>
          {loading ? "Creazione…" : "Crea e vai ai documenti"}
        </button>
      </form>
    </div>
  );
}
