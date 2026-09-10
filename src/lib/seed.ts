import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Database, DocumentKind, PromptTemplateSection } from "./types";

const ADMIN_HASH =
  "$2b$12$iem/8hn4/5fl561qpAxxD.dsnMoKZ44fvwVCMAwl/3AqquN8osG62";

const DEFAULT_SECTIONS: PromptTemplateSection[] = [
  {
    id: "sintesi",
    title: "Sintesi direzionale",
    instruction:
      "Una pagina: esito complessivo, tre rischi maggiori, stima punteggio attuale e potenziale. Linguaggio manageriale asciutto.",
    required: true,
  },
  {
    id: "fase0",
    title: "Fase 0 — Matrice della lex specialis",
    instruction:
      "Tabella A (matrice Griglia) e Tabella B (vincoli/esclusioni). Segnala documenti mancanti con ⚠ DA VERIFICARE.",
    required: true,
  },
  {
    id: "fase1",
    title: "Fase 1 — Modello mentale della Commissione",
    instruction:
      "Cosa attira, cosa genera fiducia, cosa fa perdere credibilità, riferito alla gara concreta.",
    required: true,
  },
  {
    id: "fase2",
    title: "Fase 2 — Audit di conformità formale",
    instruction:
      "Verbale di conformità: pagine, carattere, elementi economici, struttura, firma, segnaposto.",
    required: true,
  },
  {
    id: "fase3",
    title: "Fase 3 — Rispondenza al Capitolato",
    instruction:
      "Matrice obblighi / copertura. Obblighi scoperti in evidenza. Non inventare articoli assenti.",
    required: true,
  },
  {
    id: "fase4",
    title: "Fase 4 — Valutazione per criterio",
    instruction:
      "Punteggio simulato e motivazione da verbale per ogni criterio noto. Se manca la Griglia, fermati e segnalalo.",
    required: true,
  },
  {
    id: "fase5",
    title: "Fase 5 — Registro errori",
    instruction: "Errori ordinati per gravità, con correzione proposta.",
    required: true,
  },
  {
    id: "fase6",
    title: "Fase 6 — Test di personalizzazione",
    instruction:
      "Verifica se il testo è sostituibile con un altro ente. Segnala ARPA/ARPAL e toponimi incoerenti.",
    required: true,
  },
  {
    id: "fase7",
    title: "Fase 7 — Quesiti alla Stazione Appaltante",
    instruction: "Quesiti pronti per l’invio, con piano B.",
    required: true,
  },
  {
    id: "fase8",
    title: "Fase 8 — Avvocato del secondo classificato",
    instruction: "Attacco dell’offerta come farebbe il secondo classificato.",
    required: true,
  },
  {
    id: "fase9",
    title: "Fase 9 — Piano di intervento",
    instruction: "Testi sostitutivi e stima punteggio finale. Segnaposto [●:] per dati aziendali mancanti.",
    required: true,
  },
  {
    id: "checklist",
    title: "Checklist pre-deposito",
    instruction: "Caselle di spunta della checklist finale del Prompt Master.",
    required: true,
  },
];

function loadPromptBody() {
  const p = path.join(process.cwd(), "content/seed/prompt_master.txt");
  if (existsSync(p)) return readFileSync(p, "utf-8");
  return "PROMPT MASTER — COMMISSIONE GIUDICATRICE\nAnalizza i documenti caricati e produci l'output nel formato richiesto.";
}

export function seedDatabase(db: Database): Database {
  const now = new Date().toISOString();
  db.tenants.push(
    {
      id: "tenant-idguard",
      name: "ID Guard",
      slug: "idguard",
      createdAt: now,
    },
    {
      id: "tenant-consulbrokers",
      name: "Consulbrokers",
      slug: "consulbrokers",
      createdAt: now,
    },
  );

  db.users.push({
    id: "user-admin",
    email: "paolo.baldassare@gmail.com",
    name: "Paolo Baldassare",
    role: "platform_admin",
    tenantId: "tenant-idguard",
    passwordHash: process.env.ADMIN_PASSWORD_HASH || ADMIN_HASH,
    createdAt: now,
  });

  db.prompts.push({
    id: "prompt-master",
    tenantId: "tenant-idguard",
    name: "Prompt Master — Commissione Gare Broker",
    description:
      "Analisi, valutazione e blindatura del Progetto Tecnico. Cambia le sezioni per variare il formato dell’output.",
    body: loadPromptBody(),
    sections: DEFAULT_SECTIONS,
    isDefault: true,
    updatedAt: now,
  });

  db.practices.push({
    id: "practice-arpal",
    tenantId: "tenant-idguard",
    title: "ARPAL Puglia — Brokeraggio 2026-2028",
    ente: "ARPAL Puglia",
    cig: "RDO 6522966",
    notes:
      "Avviso esplorativo MePA. Termine 15/09/2026. Criterio OEPV. Importo simbolico 1 €.",
    promptId: "prompt-master",
    extraInstruction:
      "Distingui ARPAL (politiche attive del lavoro) da ARPA (agenzia ambientale). Non inventare dati. Segna ogni vuoto con ⚠ DA VERIFICARE o [●:].",
    status: "ready",
    createdBy: "user-admin",
    createdAt: now,
    updatedAt: now,
  });

  const seedDocs: Array<[string, DocumentKind, string, string]> = [
    ["doc-com", "avviso", "COMUNICAZIONI.pdf", "comunicazioni.txt"],
    ["doc-rdo", "rdo", "RDO_6522966_Riepilogo.pdf", "rdo.txt"],
    ["doc-dom", "domanda", "Domanda_di_partecipazione.docx", "domanda.txt"],
  ];

  for (const [id, kind, filename, file] of seedDocs) {
    const full = path.join(process.cwd(), "content/seed", file);
    const text = existsSync(full) ? readFileSync(full, "utf-8") : "";
    db.documents.push({
      id,
      tenantId: "tenant-idguard",
      practiceId: "practice-arpal",
      kind,
      filename,
      mimeType: "text/plain",
      storagePath: full,
      extractedText: text,
      size: text.length,
      createdAt: now,
    });
  }

  return db;
}

export { DEFAULT_SECTIONS };
