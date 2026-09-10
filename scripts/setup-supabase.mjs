import { readFileSync, existsSync } from "fs";
import path from "path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

const TENANT_IDGUARD = "a1111111-1111-4111-8111-111111111111";
const TENANT_CONSULBROKERS = "a2222222-2222-4222-8222-222222222222";
const USER_ADMIN = "b1111111-1111-4111-8111-111111111111";
const PROMPT_MASTER = "c1111111-1111-4111-8111-111111111111";
const PRACTICE_ARPAL = "d1111111-1111-4111-8111-111111111111";
const ADMIN_HASH =
  "$2b$12$iem/8hn4/5fl561qpAxxD.dsnMoKZ44fvwVCMAwl/3AqquN8osG62";

const sections = JSON.parse(
  readFileSync(path.join(process.cwd(), "content/seed/sections.json"), "utf-8"),
);
const promptBody = readFileSync(path.join(process.cwd(), "content/seed/prompt_master.txt"), "utf-8");

const client = new pg.Client({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, ""),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const schema = readFileSync(path.join(process.cwd(), "supabase/schema.sql"), "utf-8");
await client.query(schema);

await client.query(
  `insert into tenants (id, name, slug) values
     ($1,'ID Guard','idguard'),
     ($2,'Consulbrokers','consulbrokers')
   on conflict (id) do update set name = excluded.name`,
  [TENANT_IDGUARD, TENANT_CONSULBROKERS],
);

await client.query(
  `insert into users (id, email, name, role, tenant_id, password_hash)
   values ($1,$2,$3,'platform_admin',$4,$5)
   on conflict (email) do update set password_hash = excluded.password_hash, name = excluded.name, role = excluded.role`,
  [USER_ADMIN, "paolo.baldassare@gmail.com", "Paolo Baldassare", TENANT_IDGUARD, ADMIN_HASH],
);

await client.query(
  `insert into prompts (id, tenant_id, name, description, body, sections, is_default)
   values ($1,$2,$3,$4,$5,$6::jsonb,true)
   on conflict (id) do update set body = excluded.body, sections = excluded.sections, name = excluded.name`,
  [
    PROMPT_MASTER,
    TENANT_IDGUARD,
    "Prompt Master — Commissione Gare Broker",
    "Analisi, valutazione e blindatura del Progetto Tecnico. Cambia le sezioni per variare il formato dell’output.",
    promptBody,
    JSON.stringify(sections),
  ],
);

await client.query(
  `insert into practices
     (id, tenant_id, title, ente, cig, notes, prompt_id, extra_instruction, status, created_by)
   values ($1,$2,$3,$4,$5,$6,$7,$8,'ready',$9)
   on conflict (id) do update set title = excluded.title, extra_instruction = excluded.extra_instruction`,
  [
    PRACTICE_ARPAL,
    TENANT_IDGUARD,
    "ARPAL Puglia — Brokeraggio 2026-2028",
    "ARPAL Puglia",
    "RDO 6522966",
    "Avviso esplorativo MePA. Termine 15/09/2026. Criterio OEPV. Importo simbolico 1 €.",
    PROMPT_MASTER,
    "Distingui ARPAL (politiche attive del lavoro) da ARPA (agenzia ambientale). Non inventare dati. Segna ogni vuoto con ⚠ DA VERIFICARE o [●:].",
    USER_ADMIN,
  ],
);

const docs = [
  ["e1111111-1111-4111-8111-111111111111", "avviso", "COMUNICAZIONI.pdf", "comunicazioni.txt"],
  ["e2222222-2222-4222-8222-222222222222", "rdo", "RDO_6522966_Riepilogo.pdf", "rdo.txt"],
  ["e3333333-3333-4333-8333-333333333333", "domanda", "Domanda_di_partecipazione.docx", "domanda.txt"],
];

for (const [id, kind, filename, file] of docs) {
  const full = path.join(process.cwd(), "content/seed", file);
  const text = existsSync(full) ? readFileSync(full, "utf-8") : "";
  await client.query(
    `insert into documents
       (id, tenant_id, practice_id, kind, filename, mime_type, storage_path, extracted_text, file_bytes, size)
     values ($1,$2,$3,$4,$5,'text/plain','seed',$6,$7,$8)
     on conflict (id) do update set extracted_text = excluded.extracted_text, size = excluded.size`,
    [id, TENANT_IDGUARD, PRACTICE_ARPAL, kind, filename, text, Buffer.from(text), text.length],
  );
}

const check = await client.query(
  "select (select count(*) from tenants) as tenants, (select count(*) from users) as users, (select count(*) from documents) as documents",
);
console.log("Supabase seed ok", check.rows[0]);
await client.end();
