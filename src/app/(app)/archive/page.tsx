import Link from "next/link";
import { getSession } from "@/lib/auth";
import { readDb } from "@/lib/store";

export default async function ArchivePage() {
  const session = await getSession();
  const db = readDb();
  const docs = db.documents.filter(
    (d) => session?.role === "platform_admin" || d.tenantId === session?.tenantId,
  );
  const outs = db.outputs.filter(
    (o) => session?.role === "platform_admin" || o.tenantId === session?.tenantId,
  );

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Archivio</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Documenti salvati
      </h1>

      <h2 className="mt-8 text-sm uppercase tracking-wider text-[#8BA3B8]">Input</h2>
      <div className="mt-3 space-y-2">
        {docs.map((d) => {
          const p = db.practices.find((x) => x.id === d.practiceId);
          return (
            <Link key={d.id} href={`/practices/${d.practiceId}`} className="card block p-4">
              <div className="text-white">{d.filename}</div>
              <div className="text-xs text-[#8BA3B8]">
                {d.kind} · {p?.title} · {new Date(d.createdAt).toLocaleString("it-IT")}
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm uppercase tracking-wider text-[#8BA3B8]">Output</h2>
      <div className="mt-3 space-y-2">
        {outs.map((o) => (
          <Link key={o.id} href={`/practices/${o.practiceId}`} className="card block p-4">
            <div className="text-white">{o.title}</div>
            <div className="text-xs text-[#8BA3B8]">
              {o.status} · {o.model} · {new Date(o.updatedAt).toLocaleString("it-IT")}
            </div>
          </Link>
        ))}
        {!outs.length && <p className="text-sm text-[#9BB0C3]">Nessun output salvato.</p>}
      </div>
    </div>
  );
}
