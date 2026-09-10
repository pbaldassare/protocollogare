import Link from "next/link";
import { getSession } from "@/lib/auth";
import { listArchive } from "@/lib/store";

export default async function ArchivePage() {
  const session = await getSession();
  if (!session) return null;
  const { documents, outputs } = await listArchive(session);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Archivio</p>
      <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
        Documenti salvati
      </h1>

      <h2 className="mt-8 text-sm uppercase tracking-wider text-[#8BA3B8]">Input</h2>
      <div className="mt-3 space-y-2">
        {documents.map((d) => (
          <Link key={d.id} href={`/practices/${d.practiceId}`} className="card block p-4">
            <div className="text-white">{d.filename}</div>
            <div className="text-xs text-[#8BA3B8]">
              {d.kind} · {d.practiceTitle} · {new Date(d.createdAt).toLocaleString("it-IT")}
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-sm uppercase tracking-wider text-[#8BA3B8]">Output</h2>
      <div className="mt-3 space-y-2">
        {outputs.map((o) => (
          <Link key={o.id} href={`/practices/${o.practiceId}`} className="card block p-4">
            <div className="text-white">{o.title}</div>
            <div className="text-xs text-[#8BA3B8]">
              {o.status} · {o.model} · {new Date(o.updatedAt).toLocaleString("it-IT")}
            </div>
          </Link>
        ))}
        {!outputs.length && <p className="text-sm text-[#9BB0C3]">Nessun output salvato.</p>}
      </div>
    </div>
  );
}
