"use client";

import { useEffect, useState } from "react";
import type { PromptRecord, PromptTemplateSection } from "@/lib/types";

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [current, setCurrent] = useState<PromptRecord | null>(null);
  const [saved, setSaved] = useState("");
  const [clientName, setClientName] = useState("");

  async function load() {
    const [res, me] = await Promise.all([fetch("/api/prompts"), fetch("/api/auth/me")]);
    const data = await res.json();
    const session = await me.json();
    setClientName(session.user?.workspaceTenantName || session.user?.tenantName || "");
    setPrompts(data.prompts ?? []);
    setCurrent((c) => c ?? data.prompts?.[0] ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!current) return;
    const res = await fetch(`/api/prompts/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(current),
    });
    if (res.ok) {
      setSaved("Formato salvato");
      await load();
    }
  }

  async function clonePrompt() {
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cloneId: current?.id, name: `${current?.name ?? "Prompt"} (copia)` }),
    });
    const data = await res.json();
    await load();
    setCurrent(data.prompt);
  }

  function updateSection(i: number, patch: Partial<PromptTemplateSection>) {
    if (!current) return;
    const sections = current.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    setCurrent({ ...current, sections });
  }

  function addSection() {
    if (!current) return;
    setCurrent({
      ...current,
      sections: [
        ...current.sections,
        {
          id: `sez-${Date.now()}`,
          title: "Nuova sezione",
          instruction: "Descrivi cosa deve produrre l’IA in questa parte.",
          required: false,
        },
      ],
    });
  }

  function removeSection(i: number) {
    if (!current) return;
    setCurrent({ ...current, sections: current.sections.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
            Istruzioni IA · {clientName || "questo cliente"}
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
            IA di questo spazio
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#D2C4B4]">
            Prompt e sezioni appartengono solo a {clientName || "questo cliente"}. Non sono dell’admin di piattaforma e non valgono per gli altri spazi.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={clonePrompt} className="rounded-xl border border-white/15 px-4 py-2 text-sm">
            Clona
          </button>
          <button onClick={save} className="gold-btn rounded-xl px-4 py-2 text-sm">
            Salva istruzioni
          </button>
        </div>
      </div>
      {saved && <p className="mt-3 text-sm text-[#9EE6E2]">{saved}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="card p-3">
          {prompts.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setCurrent(p);
                setSaved("");
              }}
              className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${
                current?.id === p.id ? "bg-[#C9A227]/15 text-[#F3E6C0]" : "text-[#D2C4B4]"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {current && (
          <div className="space-y-4">
            <div className="card space-y-3 p-5">
              <input
                className="field"
                value={current.name}
                onChange={(e) => setCurrent({ ...current, name: e.target.value })}
              />
              <input
                className="field"
                value={current.description}
                onChange={(e) => setCurrent({ ...current, description: e.target.value })}
              />
              <textarea
                className="field min-h-64 font-mono text-xs"
                value={current.body}
                onChange={(e) => setCurrent({ ...current, body: e.target.value })}
              />
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Sezioni Output</h2>
                <button onClick={addSection} className="text-sm text-[#F3E6C0]">
                  + sezione
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {current.sections.map((s, i) => (
                  <div key={s.id} className="rounded-xl border border-white/8 p-3">
                    <div className="flex gap-2">
                      <input
                        className="field"
                        value={s.title}
                        onChange={(e) => updateSection(i, { title: e.target.value })}
                      />
                      <button onClick={() => removeSection(i)} className="text-xs text-red-200">
                        elimina
                      </button>
                    </div>
                    <textarea
                      className="field mt-2 min-h-16"
                      value={s.instruction}
                      onChange={(e) => updateSection(i, { instruction: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
