import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { spawnSync } from "child_process";
import pg from "pg";
import mammoth from "mammoth";

const PRACTICE_ID = "d1111111-1111-4111-8111-111111111111";
const TENANT_ID = "a1111111-1111-4111-8111-111111111111";
const PROMPT_ID = "c1111111-1111-4111-8111-111111111111";

const UPLOADS = process.env.UPLOADS_DIR ||
  "/root/.local/share/cursor-agent-protocollogare/projects/home-ubuntu-cursor-projects-protocollogare/uploads";

const FILES = [
  ["COMUNICAZIONI_4782.pdf", "avviso", "COMUNICAZIONI.pdf"],
  ["CAPITOLATO_BROKER_d60b.pdf", "capitolato", "CAPITOLATO_BROKER.pdf"],
  ["RDO_6522966_Riepilogo_f184.pdf", "rdo", "RDO_6522966_Riepilogo.pdf"],
  ["Domanda_di_partecipazione__2__5e00.docx", "domanda", "Domanda_di_partecipazione.docx"],
  ["Prompt_Master_Commissione_Gare_Broker_c5ca.docx", "prompt", "Prompt_Master_Commissione_Gare_Broker.docx"],
  ["DOSSIER_INTELLIGENCE_ARPAL_PUGLIA_d186.docx", "altro", "DOSSIER_INTELLIGENCE_ARPAL_PUGLIA.docx"],
  ["Progetto_Tecnico_ARPA_Puglia_ver_14_Rev_Corsico_2_e765.pdf", "progetto", "Progetto_Tecnico_ARPA_Puglia.pdf"],
];

function clean(text) {
  return String(text || "").replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function ocrPdf(filePath) {
  const pdftotext = spawnSync("pdftotext", ["-layout", filePath, "-"], { encoding: "utf8", maxBuffer: 20_000_000 });
  if (pdftotext.status === 0 && clean(pdftotext.stdout).length > 80) {
    return clean(pdftotext.stdout);
  }
  const dir = path.join(tmpdir(), `ocr-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const conv = spawnSync("pdftoppm", ["-png", "-r", "200", filePath, path.join(dir, "page")], { encoding: "utf8" });
  if (conv.status !== 0) return "";
  const pages = spawnSync("bash", ["-lc", `ls -1 ${dir}/page*.png 2>/dev/null | sort`], { encoding: "utf8" });
  const texts = [];
  for (const img of pages.stdout.split("\n").filter(Boolean)) {
    const out = spawnSync("tesseract", [img, "stdout", "-l", "ita+eng"], { encoding: "utf8", maxBuffer: 20_000_000 });
    if (out.status === 0) texts.push(out.stdout);
  }
  return clean(texts.join("\n\n"));
}

async function extractText(filePath, filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return clean(result.value);
  }
  if (lower.endsWith(".pdf")) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const data = new Uint8Array(readFileSync(filePath));
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    const cleaned = clean(Array.isArray(text) ? text.join("\n") : text);
    if (cleaned.length >= 80) return cleaned;
    const ocr = ocrPdf(filePath);
    if (ocr.length >= 40) {
      return `${cleaned}\n\n[OCR]\n${ocr}`;
    }
    return `${cleaned}\n\n⚠ DA VERIFICARE: il PDF sembra scansionato o privo di testo estraibile. Serve OCR.`;
  }
  return clean(readFileSync(filePath, "utf-8"));
}

function mime(filename) {
  if (filename.toLowerCase().endsWith(".pdf")) return "application/pdf";
  if (filename.toLowerCase().endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

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

await client.query("delete from documents where practice_id = $1", [PRACTICE_ID]);

const report = [];
for (const [srcName, kind, filename] of FILES) {
  const full = path.join(UPLOADS, srcName);
  if (!existsSync(full)) {
    report.push({ filename, error: `file assente: ${full}` });
    continue;
  }
  const bytes = readFileSync(full);
  const extracted = await extractText(full, srcName);
  await client.query(
    `insert into documents
       (tenant_id, practice_id, kind, filename, mime_type, storage_path, extracted_text, file_bytes, size)
     values ($1,$2,$3,$4,$5,'supabase',$6,$7,$8)`,
    [TENANT_ID, PRACTICE_ID, kind, filename, mime(srcName), extracted, bytes, bytes.length],
  );
  if (kind === "prompt" && extracted.length > 200) {
    await client.query(
      "update prompts set body = $2, updated_at = now() where id = $1",
      [PROMPT_ID, extracted],
    );
  }
  report.push({ filename, kind, bytes: bytes.length, text: extracted.length });
}

await client.query("update practices set status = 'ready', updated_at = now() where id = $1", [PRACTICE_ID]);

const count = await client.query(
  "select kind, filename, size, length(extracted_text) as text_len from documents where practice_id = $1 order by created_at",
  [PRACTICE_ID],
);
console.log(JSON.stringify({ uploaded: report, db: count.rows }, null, 2));
await client.end();
