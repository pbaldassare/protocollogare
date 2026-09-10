import Link from "next/link";
import { getSession } from "@/lib/auth";
import { readDb } from "@/lib/store";

export default async function DashboardPage() {
  const session = await getSession();
  const db = readDb();
  const practices =
    session?.role === "platform_admin"
      ? db.practices
      : db.practices.filter((p) => p.tenantId === session?.tenantId);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Workspace</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
            Pratiche di gara
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#9BB0C3]">
            Carica gli atti, istruisci il formato dell’IA e genera l’Output. Ogni tenant vede solo i propri documenti.
          </p>
        </div>
        <Link href="/practices/new" className="gold-btn rounded-xl px-5 py-2.5 text-sm">
          Nuova pratica
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Pratiche", String(practices.length)],
          ["Documenti", String(db.documents.filter((d) => practices.some((p) => p.id === d.practiceId)).length)],
          ["Output salvati", String(db.outputs.filter((o) => practices.some((p) => p.id === o.practiceId)).length)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-[#8BA3B8]">{label}</div>
            <div className="mt-2 text-3xl text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {practices.map((p) => {
          const docs = db.documents.filter((d) => d.practiceId === p.id).length;
          const outs = db.outputs.filter((o) => o.practiceId === p.id).length;
          return (
            <Link
              key={p.id}
              href={`/practices/${p.id}`}
              className="card block p-5 transition hover:border-[#C9A227]/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg text-white">{p.title}</div>
                  <div className="mt-1 text-sm text-[#9BB0C3]">
                    {p.ente || "Ente da definire"} · {p.cig || "CIG —"}
                  </div>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wider text-[#C9A227]">
                  {p.status}
                </span>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-[#8BA3B8]">
                <span>{docs} documenti</span>
                <span>{outs} output</span>
                <span>aggiornata {new Date(p.updatedAt).toLocaleString("it-IT")}</span>
              </div>
            </Link>
          );
        })}
        {!practices.length && (
          <div className="card p-8 text-sm text-[#9BB0C3]">Nessuna pratica. Creane una per iniziare.</div>
        )}
      </div>
    </div>
  );
}
