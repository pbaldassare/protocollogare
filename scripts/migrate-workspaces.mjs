import pg from "pg";
import { readFileSync } from "fs";
import path from "path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, ""),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const extra = `
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  kind text not null default 'altro',
  filename text not null,
  mime_type text not null default 'application/octet-stream',
  extracted_text text not null default '',
  file_bytes bytea,
  size integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_documents_tenant_id_idx on public.knowledge_documents (tenant_id);

create table if not exists public.ai_memories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  kind text not null default 'fact' check (kind in ('fact', 'style', 'correction')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_memories_tenant_id_idx on public.ai_memories (tenant_id);

alter table public.knowledge_documents enable row level security;
alter table public.ai_memories enable row level security;
revoke all on public.knowledge_documents from anon, authenticated;
revoke all on public.ai_memories from anon, authenticated;
`;
await client.query(extra);

const tenants = await client.query("select id, name from tenants");
const template = await client.query(
  "select name, description, body, sections from prompts where is_default = true order by updated_at desc limit 1",
);
const tpl = template.rows[0];
const fallbackBody = readFileSync(path.join(process.cwd(), "content/seed/prompt_master.txt"), "utf-8");
const sections = JSON.parse(readFileSync(path.join(process.cwd(), "content/seed/sections.json"), "utf-8"));

for (const t of tenants.rows) {
  const prompts = await client.query("select count(*)::int as n from prompts where tenant_id = $1", [t.id]);
  if (prompts.rows[0].n === 0 && tpl) {
    await client.query(
      `insert into prompts (tenant_id, name, description, body, sections, is_default)
       values ($1,$2,$3,$4,$5::jsonb,true)`,
      [t.id, tpl.name, tpl.description, tpl.body || fallbackBody, JSON.stringify(tpl.sections || sections)],
    );
    console.log("prompt clonato per", t.name);
  }
  const mem = await client.query("select count(*)::int as n from ai_memories where tenant_id = $1", [t.id]);
  if (mem.rows[0].n === 0) {
    await client.query(
      `insert into ai_memories (tenant_id, kind, content) values ($1,'fact',$2)`,
      [
        t.id,
        `Questa IA lavora solo nello spazio cliente “${t.name}”. Non mescolare dati di altri clienti.`,
      ],
    );
  }
}

const check = await client.query(
  `select
     (select count(*) from knowledge_documents) as library,
     (select count(*) from ai_memories) as memories,
     (select count(*) from tenants) as tenants`,
);
console.log("workspace migrate ok", check.rows[0]);
await client.end();
