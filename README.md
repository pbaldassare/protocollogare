# Protocollo Gare

Piattaforma multi-tenant per caricare atti di gara (PDF/DOCX), istruire l’IA sul **formato** dell’output e salvare i documenti prodotti.

## Accesso admin

- Email: `paolo.baldassare@gmail.com`
- Password: quella fornita in sede di setup (hash salvato nel seed, non in chiaro)

## Cloudflare Pages

Build command: `npm run build`  
Output directory: `dist`

Il passo `prepare-dist` crea `dist` dopo `next build` (Next.js da solo scrive in `.next`). In Pages imposta anche `DATABASE_URL`, `SESSION_SECRET` e `MOONSHOT_API_KEY`. Le API Node (`pg`, upload, Moonshot) restano pensate per un runtime Node; su Pages statico funziona la shell di login.

## Avvio

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000), accedi e apri la pratica **ARPAL Puglia**.

## Cosa fa

1. **Login** con sessione cookie httpOnly
2. **Spazi cliente**: ogni cliente ha pratiche, libreria, persone, prompt e memoria IA isolati. L’Output usa solo il bagaglio di quello spazio.
3. **Upload** PDF/DOCX con estrazione testo (OCR segnalato se il PDF è scansionato)
4. **Istruzioni IA**: Prompt Master + sezioni di formato modificabili
5. **Genera Output** e **Salva** versioni (bozza / definitivo)

Con `MOONSHOT_API_KEY` l’Output è redatto da Kimi/Moonshot (`kimi-k2.6` su `https://api.moonshot.ai/v1`). Senza chiave si usa il motore locale di Protocollo Gare.

## Database

Postgres su `https://tvatdtsecppqafjoxokz.supabase.co`.

```bash
# in .env.local
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.tvatdtsecppqafjoxokz.supabase.co:5432/postgres?sslmode=require
npm run db:setup
npm run db:reload-docs   # ricarica i PDF/DOCX originali sulla pratica ARPAL
```

Le tabelle (`tenants`, `users`, `prompts`, `practices`, `documents`, `outputs`, `output_versions`) hanno RLS attivo e nessun grant a `anon`/`authenticated`: l’app parla col database solo lato server.
