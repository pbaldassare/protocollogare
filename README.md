# ID Guard — Commissione Gare

Piattaforma multi-tenant per caricare atti di gara (PDF/DOCX), istruire l’IA sul **formato** dell’output e salvare i documenti prodotti.

## Accesso admin

- Email: `paolo.baldassare@gmail.com`
- Password: quella fornita in sede di setup (hash salvato nel seed, non in chiaro)

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000), accedi e apri la pratica **ARPAL Puglia**.

## Cosa fa

1. **Login** con sessione cookie httpOnly
2. **Multi-tenant**: pratiche, file, prompt e output isolati
3. **Upload** PDF/DOCX con estrazione testo (OCR segnalato se il PDF è scansionato)
4. **Istruzioni IA**: Prompt Master + sezioni di formato modificabili
5. **Genera Output** e **Salva** versioni (bozza / definitivo)

Senza `OPENAI_API_KEY` o `ANTHROPIC_API_KEY` l’output viene costruito dal motore locale ID Guard, rispettando le sezioni del Prompt Master e senza inventare dati.

## Database

Postgres su `https://tvatdtsecppqafjoxokz.supabase.co`.

```bash
# in .env.local
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.tvatdtsecppqafjoxokz.supabase.co:5432/postgres?sslmode=require
npm run db:setup
```

Le tabelle (`tenants`, `users`, `prompts`, `practices`, `documents`, `outputs`, `output_versions`) hanno RLS attivo e nessun grant a `anon`/`authenticated`: l’app parla col database solo lato server.
