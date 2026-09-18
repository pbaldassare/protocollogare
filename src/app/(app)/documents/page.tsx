"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Folder = {
  id: string;
  title: string;
  ente: string;
  cig: string;
  status: string;
  path: string;
  documents: { id: string; filename: string; kind: string; size: number }[];
  outputs: { id: string; title: string; status: string }[];
};

type Tree = {
  client: { name: string; slug: string } | null;
  library: { path: string; documents: { id: string; title: string; filename: string; kind: string }[] };
  folders: Folder[];
};

export default function DocumentsPage() {
  const [tree, setTree] = useState<Tree | null>(null);
  const [open, setOpen] = useState<string>("");

  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((d) => {
        setTree(d);
        setOpen(d.folders?.[0]?.id ?? "libreria");
      });
  }, []);

  if (!tree) {
    return <div className="text-[#D2C4B4]">Caricamento cartelle…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">
        {tree.client?.name || "Cliente"}
      </p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Documenti
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[#D2C4B4]">
        Una cartella per ogni pratica, più la libreria permanente di questo cliente.
      </p>

      <button
        onClick={() => setOpen("libreria")}
        className={`card mt-8 block w-full p-5 text-left ${open === "libreria" ? "border-[#C9A227]/40" : ""}`}
      >
        <div className="text-white">Libreria</div>
        <div className="mt-1 text-xs text-[#B8A99A]">{tree.library.path}</div>
        <div className="mt-2 text-sm text-[#D2C4B4]">{tree.library.documents.length} file</div>
      </button>
      {open === "libreria" && (
        <div className="mt-2 space-y-2 pl-3">
          {tree.library.documents.map((d) => (
            <div key={d.id} className="rounded-xl bg-black/20 px-4 py-3">
              <div className="text-white">{d.title || d.filename}</div>
              <div className="text-xs text-[#B8A99A]">{d.kind} · {d.filename}</div>
            </div>
          ))}
          {!tree.library.documents.length && (
            <p className="text-sm text-[#D2C4B4]">Cartella libreria vuota. Carica da Impostazioni spazio.</p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {tree.folders.map((f) => (
          <div key={f.id}>
            <button
              onClick={() => setOpen(f.id)}
              className={`card block w-full p-5 text-left ${open === f.id ? "border-[#C9A227]/40" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-white">{f.title}</div>
                  <div className="mt-1 text-xs text-[#B8A99A]">{f.path}</div>
                  <div className="mt-2 text-sm text-[#D2C4B4]">
                    {f.ente || "Ente —"} · {f.cig || "CIG —"}
                  </div>
                </div>
                <span className="text-xs uppercase text-[#C9A227]">{f.status}</span>
              </div>
              <div className="mt-3 text-xs text-[#B8A99A]">
                {f.documents.length} file · {f.outputs.length} output
              </div>
            </button>
            {open === f.id && (
              <div className="mt-2 space-y-2 pl-3">
                {f.documents.map((d) => (
                  <Link key={d.id} href={`/practices/${f.id}`} className="block rounded-xl bg-black/20 px-4 py-3">
                    <div className="text-white">{d.filename}</div>
                    <div className="text-xs text-[#B8A99A]">{d.kind} · {d.size} byte</div>
                  </Link>
                ))}
                {f.outputs.map((o) => (
                  <Link key={o.id} href={`/practices/${f.id}`} className="block rounded-xl bg-black/20 px-4 py-3">
                    <div className="text-white">{o.title}</div>
                    <div className="text-xs text-[#B8A99A]">output · {o.status}</div>
                  </Link>
                ))}
                {!f.documents.length && !f.outputs.length && (
                  <p className="text-sm text-[#D2C4B4]">Cartella vuota.</p>
                )}
              </div>
            )}
          </div>
        ))}
        {!tree.folders.length && (
          <div className="card p-8 text-sm text-[#D2C4B4]">Nessuna cartella pratica. Creane una da Pratiche.</div>
        )}
      </div>
    </div>
  );
}
