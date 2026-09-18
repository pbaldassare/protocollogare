import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL mancante");
  process.exit(1);
}

const root = process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
const client = new pg.Client({
  connectionString: url.replace(/[?&]sslmode=[^&]+/, ""),
  ssl: { rejectUnauthorized: false },
});
await client.connect();

function safe(value) {
  return String(value || "item")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

const docs = await client.query(
  `select d.id, d.filename, d.file_bytes, d.practice_id, t.slug
     from documents d
     join tenants t on t.id = d.tenant_id
    where d.file_bytes is not null`,
);
for (const d of docs.rows) {
  const dir = path.join(root, safe(d.slug), "pratiche", d.practice_id);
  mkdirSync(dir, { recursive: true });
  const full = path.join(dir, safe(d.filename));
  writeFileSync(full, d.file_bytes);
  await client.query("update documents set storage_path = $2 where id = $1", [d.id, full]);
}

const libs = await client.query(
  `select k.id, k.filename, k.file_bytes, t.slug
     from knowledge_documents k
     join tenants t on t.id = k.tenant_id
    where k.file_bytes is not null`,
);
for (const d of libs.rows) {
  const dir = path.join(root, safe(d.slug), "libreria");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, safe(d.filename)), d.file_bytes);
}

console.log("cartelle", { pratiche: docs.rowCount, libreria: libs.rowCount, root });
await client.end();
