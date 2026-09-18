import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardCounts } from "@/lib/store";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;
  const data = await dashboardCounts(session);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A227]">Workspace</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl text-white">
            Pratiche di gara
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#D2C4B4]">
            Carica gli atti, istruisci il formato dell’IA e genera l’Output. Dati su Supabase, isolati per tenant.
          </p>
        </div>
        <Link href="/practices/new" className="gold-btn rounded-xl px-5 py-2.5 text-sm">
          Nuova pratica
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Pratiche", String(data.practices)],
          ["Documenti", String(data.documents)],
          ["Output salvati", String(data.outputs)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <div className="text-xs uppercase tracking-wider text-[#B8A99A]">{label}</div>
            <div className="mt-2 text-3xl text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {data.items.map((p) => (
          <Link
            key={p.id}
            href={`/practices/${p.id}`}
            className="card block p-5 transition hover:border-[#C9A227]/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg text-white">{p.title}</div>
                <div className="mt-1 text-sm text-[#D2C4B4]">
                  {p.ente || "Ente da definire"} · {p.cig || "CIG —"}
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wider text-[#C9A227]">
                {p.status}
              </span>
            </div>
            <div className="mt-4 flex gap-4 text-xs text-[#B8A99A]">
              <span>{p.documents} documenti</span>
              <span>{p.outputs} output</span>
              <span>aggiornata {new Date(p.updatedAt).toLocaleString("it-IT")}</span>
            </div>
          </Link>
        ))}
        {!data.items.length && (
          <div className="card p-8 text-sm text-[#D2C4B4]">Nessuna pratica. Creane una per iniziare.</div>
        )}
      </div>
    </div>
  );
}
