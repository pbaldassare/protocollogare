import type { PracticeDocument, PromptRecord } from "./types";
import { extractFacts } from "./extract";

function clip(text: string, max = 12000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[… testo troncato per contesto …]`;
}

async function callMoonshot(system: string, user: string) {
  const key = process.env.MOONSHOT_API_KEY;
  if (!key) return null;
  const base = (process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1").replace(/\/$/, "");
  const model = process.env.MOONSHOT_MODEL || "kimi-k2.6";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.MOONSHOT_TIMEOUT_MS || 90000));
  let res: Response;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: Number(process.env.MOONSHOT_MAX_TOKENS || 1800),
        thinking: { type: "disabled" },
        reasoning_effort: "low",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Moonshot: timeout. Riprova o riduci i documenti.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`Moonshot: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; reasoning_content?: string } }[];
  };
  const message = data.choices?.[0]?.message;
  const text = (message?.content || "").trim() || (message?.reasoning_content || "").trim();
  return { model, text };
}

async function callModel(system: string, user: string) {
  const moonshot = await callMoonshot(system, user);
  if (moonshot?.text) return moonshot;
  const openai = process.env.OPENAI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (anthropic) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropic,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { content?: { text?: string }[] };
    return {
      model: "anthropic",
      text: data.content?.map((c) => c.text ?? "").join("\n") ?? "",
    };
  }
  if (openai) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openai}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      model: "openai",
      text: data.choices?.[0]?.message?.content ?? "",
    };
  }
  return null;
}

export async function generateOutput(input: {
  title: string;
  ente: string;
  cig: string;
  extraInstruction: string;
  prompt: PromptRecord;
  documents: PracticeDocument[];
}) {
  const corpus = input.documents
    .map(
      (d) =>
        `\n\n===== ${d.kind.toUpperCase()} | ${d.filename} =====\n${d.extractedText || "(nessun testo estratto)"}`,
    )
    .join("");
  const facts = extractFacts(corpus);
  const format = input.prompt.sections
    .map(
      (s, i) =>
        `${i + 1}. ${s.title}${s.required ? " (obbligatoria)" : ""}\n   ${s.instruction}`,
    )
    .join("\n");

  const system = `${clip(input.prompt.body, 7000)}\n\nFORMATO DELL'OUTPUT (istruibile, modificabile dal tenant):\n${format}\n\nIstruzione extra della pratica:\n${input.extraInstruction || "Nessuna."}`;

  const user = `Pratica: ${input.title}
Ente: ${input.ente}
Riferimento: ${input.cig}

Documenti caricati:
${clip(corpus, 8000)}

Produci ora l'OUTPUT completo nel formato richiesto, in italiano. Non inventare. Segna i vuoti con ⚠ DA VERIFICARE o [●:].`;

  const llm = await callModel(system, user);
  if (llm?.text) return llm;

  return {
    model: "idguard-local",
    text: localOutput(input, facts, corpus),
  };
}

function localOutput(
  input: {
    title: string;
    ente: string;
    cig: string;
    extraInstruction: string;
    prompt: PromptRecord;
    documents: PracticeDocument[];
  },
  facts: Record<string, string>,
  corpus: string,
) {
  const kinds = new Set(input.documents.map((d) => d.kind));
  const missing = [
    !kinds.has("capitolato") && !corpus.toLowerCase().includes("capitolato")
      ? "Capitolato Speciale (testo utile)"
      : null,
    !corpus.toLowerCase().includes("griglia") ? "Griglia di valutazione tecnica" : null,
    !corpus.toLowerCase().includes("disciplinare") ? "Disciplinare di gara" : null,
  ].filter(Boolean) as string[];

  const hasScan = input.documents.some((d) =>
    d.extractedText.includes("scansionato"),
  );
  const rui = /RUI|Sezione B/i.test(corpus);
  const rc = /responsabilit[aà] civile professionale/i.test(corpus);
  const excl = /94 e 95|D\.Lgs\. 36\/2023/i.test(corpus);
  const economic = /provvigion|10%|onere finanziario/i.test(corpus);

  const lines: string[] = [];
  lines.push(`# OUTPUT — ${input.title}`);
  lines.push("");
  lines.push(`**Motore:** ID Guard Commissione (locale, senza modello esterno)`);
  lines.push(`**Prompt:** ${input.prompt.name}`);
  lines.push(`**Ente:** ${facts.ente || input.ente || "⚠ DA VERIFICARE"}`);
  lines.push(`**Riferimento:** ${facts.rdo || input.cig || "⚠ DA VERIFICARE"}`);
  if (facts.rup) lines.push(`**RUP:** ${facts.rup}`);
  if (facts.cf) lines.push(`**CF ente:** ${facts.cf}`);
  if (facts.inizio) lines.push(`**Inizio avviso:** ${facts.inizio}`);
  if (facts.termine) lines.push(`**Termine:** ${facts.termine}`);
  if (facts.cpv) lines.push(`**CPV:** ${facts.cpv}`);
  lines.push("");
  if (input.extraInstruction) {
    lines.push(`> Istruzione extra: ${input.extraInstruction}`);
    lines.push("");
  }

  for (const section of input.prompt.sections) {
    lines.push(`## ${section.title}`);
    lines.push("");
    lines.push(`*Istruzione di formato:* ${section.instruction}`);
    lines.push("");
    lines.push(sectionBody(section.id, { missing, hasScan, rui, rc, excl, economic, facts, input, corpus }));
    lines.push("");
  }

  lines.push("## Documenti usati");
  lines.push("");
  for (const d of input.documents) {
    const n = d.extractedText.replace(/\s+/g, " ").slice(0, 180);
    lines.push(`- **${d.kind}** — ${d.filename} (${d.extractedText.length} caratteri). ${n}…`);
  }
  lines.push("");
  lines.push(
    "_Output generato in modalità locale. Collega OPENAI_API_KEY o ANTHROPIC_API_KEY per la redazione completa del Prompt Master._",
  );
  return lines.join("\n");
}

function sectionBody(
  id: string,
  ctx: {
    missing: string[];
    hasScan: boolean;
    rui: boolean;
    rc: boolean;
    excl: boolean;
    economic: boolean;
    facts: Record<string, string>;
    input: { ente: string; title: string };
    corpus: string;
  },
) {
  switch (id) {
    case "sintesi":
      return [
        `**Esito complessivo:** pratica ${ctx.input.title} istruita su documentazione parziale. Non è ancora valutabile un punteggio tecnico: manca la Griglia.`,
        "",
        "**Tre rischi maggiori:**",
        "1. Assenza della Griglia di valutazione: la Fase 4 non può attribuire punteggi senza inventare criteri.",
        `2. ${ctx.hasScan ? "Capitolato/atti scannerizzati senza OCR: obblighi non verificabili." : "Copertura documentale incompleta rispetto al Prompt Master."}`,
        "3. Contaminazione ARPA/ARPAL: l’ente della RDO è ARPAL Puglia (politiche attive), non ARPA ambientale.",
        "",
        "**Stima punteggio:** attuale non attribuibile; potenziale massimo solo dopo lex specialis completa.",
      ].join("\n");
    case "fase0":
      return [
        "### Tabella A — Matrice della Griglia",
        "",
        "| Criterio | Punti max | Cosa chiede | Cosa premia | Copertura |",
        "|---|---|---|---|---|",
        "| ⚠ DA VERIFICARE | [●: punti] | Griglia non presente tra i file | — | rosso |",
        "",
        "### Tabella B — Vincoli e esclusioni",
        "",
        "| Prescrizione | Fonte | Sanzione | Esito |",
        "|---|---|---|---|---|",
        `| Iscrizione RUI Sez. B | Comunicazioni / domanda | esclusione | ${ctx.rui ? "richiesta esplicita" : "⚠ non trovata"} |`,
        `| RC professionale | Comunicazioni / domanda | esclusione | ${ctx.rc ? "richiesta esplicita" : "⚠ non trovata"} |`,
        `| Art. 94-95 D.Lgs. 36/2023 | Comunicazioni | esclusione | ${ctx.excl ? "richiamati" : "⚠ non trovati"} |`,
        `| Elementi economici in domanda | Domanda art. 4 e 8 | rischio contaminazione tecnico/economico | ${ctx.economic ? "presenti nella domanda (provvigioni), tenere fuori dal tecnico" : "non rilevati"} |`,
        `| Importo 1 € | RDO | valore simbolico MePA | presente; verificare valore reale gara |`,
        "",
        ctx.missing.length
          ? `**Documenti mancanti:** ${ctx.missing.join("; ")}.`
          : "Lex specialis apparentemente completa.",
      ].join("\n");
    case "fase1":
      return [
        "La Commissione su questa procedura (indagine/avviso, poi eventuale affidamento) cercherà **governabilità**, non brochure.",
        "",
        "- **Attira:** referente unico + sostituto, SLA numerici, workflow, richiami all’ente ARPAL (CPI, GOL, LEP), non ad ARPA laboratori.",
        "- **Fiducia:** RUI verificabile, incarichi PA 2023-2025, output con responsabile e termine.",
        "- **Perde credibilità:** copia da gare ambientali, organigramma senza nomi, software solo evocato.",
        "- **Eccellente vs medio:** il medio descrive la struttura; l’eccellente mostra come assorbe il carico di U.O. Patrimonio e Attività Negoziali e dei CPI.",
      ].join("\n");
    case "fase2":
      return [
        "| Prescrizione | Fonte | Esito | Azione |",
        "|---|---|---|---|",
        "| Testo estraibile degli atti | Buona prassi | " +
          (ctx.hasScan ? "parziale / scanner" : "parziale") +
          " | OCR sul capitolato se raster |",
        "| Divieto elementi economici nel tecnico | Prompt Master / prassi ANAC | da presidiare | audit lessicale in Fase 9 |",
        "| Firma digitale domanda | Domanda | modulo in bianco | [●: poteri di firma] |",
        "| Segnaposto | Domanda | campi vuoti fisiologici | compilare solo dati veri |",
      ].join("\n");
    case "fase3":
      return [
        "| Obbligo | Dove risponde | Livello | Nota |",
        "|---|---|---|---|",
        "| Manifestazione di interesse / domanda | Domanda | parziale | modulo non compilato |",
        "| RUI Sez. B | Comunicazioni | scoperto in offerta | [●: numero RUI] |",
        "| RC professionale | Comunicazioni | scoperto | [●: compagnia, polizza, massimale, scadenza] |",
        "| Esperienza PA 2023-2025 | Domanda | scoperto | [●: ente, periodo, oggetto] |",
        "| Struttura organizzativa dedicata | Domanda art. 5 | dichiarato come impegno | serve team nominativo |",
        "| Capitolato prestazionale | — | ⚠ DA VERIFICARE | testo capitolato non utilizzabile o assente |",
      ].join("\n");
    case "fase4":
      return "⚠ DA VERIFICARE: senza Griglia di valutazione non si attribuiscono punteggi. Fermarsi qui è conforme al Prompt Master (§3 e Fase 0). Non inventare sub-criteri.";
    case "fase5":
      return [
        "| Errore | Gravità | Impatto | Correzione |",
        "|---|---|---|---|",
        "| Possibile confusione ARPA/ARPAL | alta | credibilità / personalizzazione | QA lessicale obbligatoria |",
        "| Griglia assente | altissima | punteggi non difendibili | acquisire lex specialis |",
        "| Capitolato non testuale | alta | obblighi scoperti | OCR |",
        "| Domanda con clausole economiche | media | contaminazione se copiate nel tecnico | tenere le provvigioni fuori dal progetto tecnico |",
      ].join("\n");
    case "fase6":
      return "Test di sostituibilità: un testo scritto per ARPA Puglia (laboratori, ISO 17025, rischio aeronautico) **non** supera il test su ARPAL (CPI, GOL, LEP, caporalato). Ogni sezione va riancorata a missione, governance (CdA + Direttore) e U.O. Patrimonio e Attività Negoziali.";
    case "fase7":
      return [
        "1. Confermare se l’avviso è mera indagine di mercato o se seguirà una lex specialis con Griglia e Disciplinare.",
        "2. Chiedere il valore stimato reale del servizio (ANAC 469/2022), oltre il 1 € di configurazione MePA.",
        "3. Chiedere se esiste CIG della procedura di affidamento successiva alla RDO 6522966.",
        "4. Piano B: procedere al dossier intelligence e tenere in stand-by il progetto tecnico fino alla pubblicazione degli atti.",
      ].join("\n");
    case "fase8":
      return "Attacco tipico del secondo: offerta generica da catalogo; team non nominativo; assenza di personalizzazione ARPAL; eventuali residui ARPA; obblighi di capitolato non tracciati; elementi economici trapelati nel tecnico. Oggi questi attacchi sono **preventivi**: manca ancora l’offerta da depositare.";
    case "fase9":
      return [
        "1. Completare OCR e acquisire Disciplinare + Griglia.",
        "2. Compilare domanda con soli dati verificabili: [●: RUI], [●: RCP], [●: referenza PA].",
        "3. Costruire il progetto tecnico sulle tre domande ARPAL: protezione dei decisori, riduzione del carico amministrativo, evidenze per CdA/Regione.",
        "4. QA anti-contaminazione ARPA/ARPAL e anti-elementi economici.",
        "5. Stima punteggio: non esprimibile fino alla Griglia.",
      ].join("\n");
    case "checklist":
      return [
        "- [ ] Limite pagine (quando prescritto)",
        "- [ ] Carattere minimo su testo e tabelle",
        "- [ ] Zero elementi economici nel tecnico",
        "- [ ] Struttura secondo i criteri della Griglia",
        "- [ ] Nessun allegato non ammesso",
        "- [ ] Firma digitale e poteri",
        "- [ ] Zero segnaposto residui",
        "- [ ] Ogni obbligo di capitolato coperto",
        "- [ ] Personalizzazione ARPAL superata",
        "- [ ] Riesame “avvocato del secondo” senza rilievi alti",
      ].join("\n");
    default:
      return `Sezione istruita. Documenti disponibili: ${ctx.input.ente}. Completare secondo il Prompt Master senza inventare.`;
  }
}
