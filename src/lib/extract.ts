import { readFileSync } from "fs";
import mammoth from "mammoth";

export async function extractTextFromFile(filePath: string, mimeType: string, filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ path: filePath });
    return clean(result.value);
  }
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
    return extractPdf(filePath);
  }
  if (lower.endsWith(".txt") || mimeType.startsWith("text/")) {
    return clean(readFileSync(filePath, "utf-8"));
  }
  return "";
}

async function extractPdf(filePath: string) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(readFileSync(filePath));
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  const cleaned = clean(Array.isArray(text) ? text.join("\n") : text);
  if (cleaned.length < 40) {
    return `${cleaned}\n\n⚠ DA VERIFICARE: il PDF sembra scansionato o privo di testo estraibile. Serve OCR.`;
  }
  return cleaned;
}

function clean(text: string) {
  return text.replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractFacts(corpus: string) {
  const facts: Record<string, string> = {};
  const cig = corpus.match(/CIG[:\s]*([A-Z0-9]+)/i);
  if (cig) facts.cig = cig[1];
  const rdo = corpus.match(/6522966|RDO[^\n]{0,40}/i);
  if (rdo) facts.rdo = rdo[0];
  const rup = corpus.match(/Responsabile del procedimento:\s*([^\n]+)/i);
  if (rup) facts.rup = rup[1].trim();
  const ente = corpus.match(
    /AGENZIA REGIONALE PER LE POLITICHE ATTIVE DEL LAVORO[^.\n]*/i,
  );
  if (ente) facts.ente = ente[0];
  const cf = corpus.match(/Codice Fiscale Ente\s*(\d{11})/i);
  if (cf) facts.cf = cf[1];
  const start = corpus.match(/Data di inizio dell'Avviso di indagine:\s*([^\n]+)/i);
  if (start) facts.inizio = start[1].trim();
  const end = corpus.match(/Termine ultimo dell'Avviso di indagine:\s*([^\n]+)/i);
  if (end) facts.termine = end[1].trim();
  const cpv = corpus.match(/66518100-5/);
  if (cpv) facts.cpv = "66518100-5";
  return facts;
}
