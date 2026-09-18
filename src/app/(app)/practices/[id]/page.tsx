"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Doc = {
  id: string;
  kind: string;
  filename: string;
  extractedText: string;
  size: number;
};
type Prompt = { id: string; name: string; sections: { id: string; title: string }[] };
type Output = {
  id: string;
  title: string;
  body: string;
  status: string;
  model: string;
  updatedAt: string;
};
type Practice = {
  id: string;
  title: string;
  ente: string;
  cig: string;
  notes: string;
  promptId: string;
  extraInstruction: string;
  status: string;
};

const KINDS = ["avviso", "capitolato", "rdo", "domanda", "progetto", "prompt", "altro"];

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [kind, setKind] = useState("altro");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [extra, setExtra] = useState("");

  async function load() {
    const res = await fetch(`/api/practices/${id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Errore");
      return;
    }
    setPractice(data.practice);
    setDocuments(data.documents);
    setPrompts(data.prompts);
    setOutputs(data.outputs);
    setExtra(data.practice.extraInstruction);
    setBody(data.outputs[0]?.body ?? "");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function upload(file: File) {
    setBusy("upload");
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    const res = await fetch(`/api/practices/${id}/documents`, { method: "POST", body: fd });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Upload fallito");
      return;
    }
    await load();
  }

  async function generate() {
    setBusy("generate");
    setError("");
    await fetch(`/api/practices/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ extraInstruction: extra, promptId: practice?.promptId }),
    });
    const res = await fetch(`/api/practices/${id}/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ extraInstruction: extra }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) {
      setError(data.error || "Generazione fallita");
      return;
    }
    setBody(data.output.body);
    await load();
  }

  async function save(status?: string) {
    const current = outputs[0];
    if (!current) return;
    setBusy("save");
    const res = await fetch(`/api/outputs/${current.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, status, saveVersion: true, note: "Salvataggio utente" }),
    });
    setBusy("");
    if (!res.ok) setError("Salvataggio fallito");
    else await load();
  }

  if (!practice) {
    return <div className="text-[#D2C4B4]">{error || "Caricamento…"}</div>;
  }

  const output = outputs[0];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">{practice.status}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-white md:text-4xl">
            {practice.title}
          </h1>
          <p className="mt-2 text-sm text-[#D2C4B4]">
            {practice.ente} · {practice.cig}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={generate} disabled={busy === "generate"} className="gold-btn rounded-xl px-4 py-2 text-sm">
            {busy === "generate" ? "Generazione…" : "Genera Output"}
          </button>
          <button
            onClick={() => save()}
            disabled={!output || busy === "save"}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#F3E6C0]"
          >
            Salva
          </button>
          <button
            onClick={() => save("final")}
            disabled={!output}
            className="rounded-xl border border-[#1AA6A0]/40 px-4 py-2 text-sm text-[#9EE6E2]"
          >
            Segna definitivo
          </button>
        </div>
      </div>
      {error && (
        <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Documenti</h2>
            <div className="mt-3 flex gap-2">
              <select value={kind} onChange={(e) => setKind(e.target.value)} className="field">
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-white/20 px-3 py-6 text-center text-sm text-[#D2C4B4] hover:border-[#C9A227]/50">
              {busy === "upload" ? "Caricamento…" : "Trascina o scegli PDF / DOCX"}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <ul className="mt-4 space-y-2">
              {documents.map((d) => (
                <li key={d.id} className="rounded-xl bg-black/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-white">{d.filename}</span>
                    <span className="text-[10px] uppercase text-[#C9A227]">{d.kind}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-[#B8A99A]">
                    {d.extractedText.slice(0, 160) || "Nessun testo"}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="text-sm uppercase tracking-wider text-[#C9A227]">Istruzioni IA</h2>
            <select
              className="field mt-3"
              value={practice.promptId}
              onChange={async (e) => {
                const promptId = e.target.value;
                setPractice({ ...practice, promptId });
                await fetch(`/api/practices/${id}`, {
                  method: "PATCH",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ promptId }),
                });
              }}
            >
              {prompts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[#B8A99A]">
              Cambia prompt o sezioni in Istruzioni IA per variare il formato dell’Output.
            </p>
            <textarea
              className="field mt-3 min-h-28"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder="Istruzione extra di questa pratica"
            />
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/10 bg-[#f3eee2] px-5 py-3 text-[#1b2430]">
            <div>
              <div className="text-xs uppercase tracking-wider text-[#8a6d1d]">Output</div>
              <div className="font-medium">{output?.title || "Nessun output ancora"}</div>
            </div>
            {output && (
              <div className="text-right text-xs text-[#5c6b7a]">
                {output.model} · {output.status}
                <div>{new Date(output.updatedAt).toLocaleString("it-IT")}</div>
              </div>
            )}
          </div>
          <textarea
            className="paper min-h-[720px] w-full resize-y border-0 p-6 font-[family-name:var(--font-display)] text-[15px] leading-7 outline-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="L’Output apparirà qui dopo la generazione. Puoi modificarlo e salvarlo."
          />
        </section>
      </div>
    </div>
  );
}
