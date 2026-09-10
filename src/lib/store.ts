import { randomUUID } from "crypto";
import type {
  DocumentKind,
  OutputRecord,
  OutputStatus,
  OutputVersion,
  Practice,
  PracticeDocument,
  PracticeStatus,
  PromptRecord,
  PromptTemplateSection,
  Role,
  SessionUser,
  Tenant,
  User,
} from "./types";
import { query, queryOne } from "./db";

type TenantRow = { id: string; name: string; slug: string; created_at: Date };
type UserRow = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenant_id: string;
  password_hash: string;
  created_at: Date;
};
type PromptRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  body: string;
  sections: PromptTemplateSection[];
  is_default: boolean;
  updated_at: Date;
};
type PracticeRow = {
  id: string;
  tenant_id: string;
  title: string;
  ente: string;
  cig: string;
  notes: string;
  prompt_id: string | null;
  extra_instruction: string;
  status: PracticeStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};
type DocumentRow = {
  id: string;
  tenant_id: string;
  practice_id: string;
  kind: DocumentKind;
  filename: string;
  mime_type: string;
  storage_path: string | null;
  extracted_text: string;
  size: number;
  created_at: Date;
};
type OutputRow = {
  id: string;
  tenant_id: string;
  practice_id: string;
  prompt_id: string | null;
  title: string;
  body: string;
  status: OutputStatus;
  model: string;
  created_at: Date;
  updated_at: Date;
};
type VersionRow = {
  id: string;
  output_id: string;
  tenant_id: string;
  body: string;
  note: string;
  created_at: Date;
};

function iso(d: Date | string) {
  return d instanceof Date ? d.toISOString() : d;
}

function mapTenant(r: TenantRow): Tenant {
  return { id: r.id, name: r.name, slug: r.slug, createdAt: iso(r.created_at) };
}
function mapUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    role: r.role,
    tenantId: r.tenant_id,
    passwordHash: r.password_hash,
    createdAt: iso(r.created_at),
  };
}
function mapPrompt(r: PromptRow): PromptRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description,
    body: r.body,
    sections: r.sections ?? [],
    isDefault: r.is_default,
    updatedAt: iso(r.updated_at),
  };
}
function mapPractice(r: PracticeRow): Practice {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    title: r.title,
    ente: r.ente,
    cig: r.cig,
    notes: r.notes,
    promptId: r.prompt_id ?? "",
    extraInstruction: r.extra_instruction,
    status: r.status,
    createdBy: r.created_by ?? "",
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}
function mapDocument(r: DocumentRow): PracticeDocument {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    practiceId: r.practice_id,
    kind: r.kind,
    filename: r.filename,
    mimeType: r.mime_type,
    storagePath: r.storage_path ?? "",
    extractedText: r.extracted_text,
    size: r.size,
    createdAt: iso(r.created_at),
  };
}
function mapOutput(r: OutputRow): OutputRecord {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    practiceId: r.practice_id,
    promptId: r.prompt_id ?? "",
    title: r.title,
    body: r.body,
    status: r.status,
    model: r.model,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}
function mapVersion(r: VersionRow): OutputVersion {
  return {
    id: r.id,
    outputId: r.output_id,
    tenantId: r.tenant_id,
    body: r.body,
    note: r.note,
    createdAt: iso(r.created_at),
  };
}

export function canSeeAll(role: SessionUser["role"]) {
  return role === "platform_admin";
}

export async function listTenants(session: SessionUser) {
  const rows = canSeeAll(session.role)
    ? await query<TenantRow>("select * from tenants order by created_at")
    : await query<TenantRow>("select * from tenants where id = $1", [session.tenantId]);
  return rows.map(mapTenant);
}

export async function createTenant(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const row = await queryOne<TenantRow>(
    `insert into tenants (name, slug) values ($1, $2) returning *`,
    [name.trim(), slug],
  );
  return row ? mapTenant(row) : null;
}

export async function findUserByEmail(email: string) {
  const row = await queryOne<UserRow>(
    "select * from users where lower(email) = lower($1)",
    [email],
  );
  return row ? mapUser(row) : null;
}

export async function getTenant(id: string) {
  const row = await queryOne<TenantRow>("select * from tenants where id = $1", [id]);
  return row ? mapTenant(row) : null;
}

export async function listPractices(session: SessionUser) {
  const rows = canSeeAll(session.role)
    ? await query<PracticeRow & { tenant_name: string; documents: string; outputs: string }>(
        `select p.*, t.name as tenant_name,
                (select count(*) from documents d where d.practice_id = p.id)::text as documents,
                (select count(*) from outputs o where o.practice_id = p.id)::text as outputs
           from practices p
           join tenants t on t.id = p.tenant_id
          order by p.updated_at desc`,
      )
    : await query<PracticeRow & { tenant_name: string; documents: string; outputs: string }>(
        `select p.*, t.name as tenant_name,
                (select count(*) from documents d where d.practice_id = p.id)::text as documents,
                (select count(*) from outputs o where o.practice_id = p.id)::text as outputs
           from practices p
           join tenants t on t.id = p.tenant_id
          where p.tenant_id = $1
          order by p.updated_at desc`,
        [session.tenantId],
      );
  return rows.map((r) => ({
    ...mapPractice(r),
    tenantName: r.tenant_name,
    documents: Number(r.documents),
    outputs: Number(r.outputs),
  }));
}

export async function createPractice(input: {
  tenantId: string;
  title: string;
  ente: string;
  cig: string;
  notes: string;
  promptId?: string;
  extraInstruction: string;
  createdBy: string;
}) {
  const prompt =
    (input.promptId
      ? await queryOne<PromptRow>("select * from prompts where id = $1", [input.promptId])
      : null) ??
    (await queryOne<PromptRow>(
      "select * from prompts where tenant_id = $1 and is_default = true limit 1",
      [input.tenantId],
    )) ??
    (await queryOne<PromptRow>("select * from prompts order by updated_at desc limit 1"));

  const row = await queryOne<PracticeRow>(
    `insert into practices
      (tenant_id, title, ente, cig, notes, prompt_id, extra_instruction, status, created_by)
     values ($1,$2,$3,$4,$5,$6,$7,'draft',$8)
     returning *`,
    [
      input.tenantId,
      input.title,
      input.ente,
      input.cig,
      input.notes,
      prompt?.id ?? null,
      input.extraInstruction,
      input.createdBy,
    ],
  );
  return row ? mapPractice(row) : null;
}

export async function getPractice(id: string) {
  const row = await queryOne<PracticeRow>("select * from practices where id = $1", [id]);
  return row ? mapPractice(row) : null;
}

export async function updatePractice(
  id: string,
  patch: Partial<{
    title: string;
    ente: string;
    cig: string;
    notes: string;
    promptId: string;
    extraInstruction: string;
    status: PracticeStatus;
  }>,
) {
  const row = await queryOne<PracticeRow>(
    `update practices set
        title = coalesce($2, title),
        ente = coalesce($3, ente),
        cig = coalesce($4, cig),
        notes = coalesce($5, notes),
        prompt_id = coalesce($6, prompt_id),
        extra_instruction = coalesce($7, extra_instruction),
        status = coalesce($8, status),
        updated_at = now()
      where id = $1
      returning *`,
    [
      id,
      patch.title ?? null,
      patch.ente ?? null,
      patch.cig ?? null,
      patch.notes ?? null,
      patch.promptId ?? null,
      patch.extraInstruction ?? null,
      patch.status ?? null,
    ],
  );
  return row ? mapPractice(row) : null;
}

export async function listDocuments(practiceId: string) {
  const rows = await query<DocumentRow>(
    "select id, tenant_id, practice_id, kind, filename, mime_type, storage_path, extracted_text, size, created_at from documents where practice_id = $1 order by created_at",
    [practiceId],
  );
  return rows.map(mapDocument);
}

export async function insertDocument(input: {
  tenantId: string;
  practiceId: string;
  kind: DocumentKind;
  filename: string;
  mimeType: string;
  extractedText: string;
  fileBytes: Buffer;
}) {
  const row = await queryOne<DocumentRow>(
    `insert into documents
      (tenant_id, practice_id, kind, filename, mime_type, storage_path, extracted_text, file_bytes, size)
     values ($1,$2,$3,$4,$5,'supabase',$6,$7,$8)
     returning id, tenant_id, practice_id, kind, filename, mime_type, storage_path, extracted_text, size, created_at`,
    [
      input.tenantId,
      input.practiceId,
      input.kind,
      input.filename,
      input.mimeType,
      input.extractedText,
      input.fileBytes,
      input.fileBytes.length,
    ],
  );
  await query(
    `update practices set status = case when status = 'draft' then 'ready' else status end, updated_at = now() where id = $1`,
    [input.practiceId],
  );
  return row ? mapDocument(row) : null;
}

export async function deleteDocument(practiceId: string, docId: string) {
  const result = await getPoolCount(
    "delete from documents where id = $1 and practice_id = $2",
    [docId, practiceId],
  );
  return result > 0;
}

async function getPoolCount(text: string, params: unknown[]) {
  const { getPool } = await import("./db");
  const res = await getPool().query(text, params);
  return res.rowCount ?? 0;
}

export async function listPrompts(session: SessionUser) {
  const rows = canSeeAll(session.role)
    ? await query<PromptRow>("select * from prompts order by updated_at desc")
    : await query<PromptRow>(
        "select * from prompts where tenant_id = $1 or is_default = true order by updated_at desc",
        [session.tenantId],
      );
  return rows.map(mapPrompt);
}

export async function getPrompt(id: string) {
  const row = await queryOne<PromptRow>("select * from prompts where id = $1", [id]);
  return row ? mapPrompt(row) : null;
}

export async function createPrompt(input: {
  tenantId: string;
  name: string;
  description: string;
  body: string;
  sections: PromptTemplateSection[];
}) {
  const row = await queryOne<PromptRow>(
    `insert into prompts (tenant_id, name, description, body, sections, is_default)
     values ($1,$2,$3,$4,$5::jsonb,false) returning *`,
    [input.tenantId, input.name, input.description, input.body, JSON.stringify(input.sections)],
  );
  return row ? mapPrompt(row) : null;
}

export async function updatePrompt(
  id: string,
  patch: Partial<{
    name: string;
    description: string;
    body: string;
    sections: PromptTemplateSection[];
    isDefault: boolean;
  }>,
) {
  const current = await getPrompt(id);
  if (!current) return null;
  if (patch.isDefault) {
    await query("update prompts set is_default = false where tenant_id = $1", [current.tenantId]);
  }
  const row = await queryOne<PromptRow>(
    `update prompts set
        name = coalesce($2, name),
        description = coalesce($3, description),
        body = coalesce($4, body),
        sections = coalesce($5::jsonb, sections),
        is_default = coalesce($6, is_default),
        updated_at = now()
      where id = $1
      returning *`,
    [
      id,
      patch.name ?? null,
      patch.description ?? null,
      patch.body ?? null,
      patch.sections ? JSON.stringify(patch.sections) : null,
      patch.isDefault ?? null,
    ],
  );
  return row ? mapPrompt(row) : null;
}

export async function listOutputs(practiceId: string) {
  const rows = await query<OutputRow>(
    "select * from outputs where practice_id = $1 order by updated_at desc",
    [practiceId],
  );
  return rows.map(mapOutput);
}

export async function listVersionsForPractice(practiceId: string) {
  const rows = await query<VersionRow>(
    `select v.* from output_versions v
       join outputs o on o.id = v.output_id
      where o.practice_id = $1
      order by v.created_at desc`,
    [practiceId],
  );
  return rows.map(mapVersion);
}

export async function upsertGeneratedOutput(input: {
  practice: Practice;
  promptId: string;
  title: string;
  body: string;
  model: string;
}) {
  const existing = await queryOne<OutputRow>(
    "select * from outputs where practice_id = $1 order by created_at limit 1",
    [input.practice.id],
  );
  if (existing) {
    await query(
      `insert into output_versions (output_id, tenant_id, body, note)
       values ($1,$2,$3,'Versione precedente')`,
      [existing.id, existing.tenant_id, existing.body],
    );
    const row = await queryOne<OutputRow>(
      `update outputs set prompt_id=$2, title=$3, body=$4, model=$5, status='draft', updated_at=now()
        where id=$1 returning *`,
      [existing.id, input.promptId, input.title, input.body, input.model],
    );
    await query(
      "update practices set status='generated', extra_instruction=$2, updated_at=now() where id=$1",
      [input.practice.id, input.practice.extraInstruction],
    );
    return row ? mapOutput(row) : null;
  }
  const row = await queryOne<OutputRow>(
    `insert into outputs (tenant_id, practice_id, prompt_id, title, body, status, model)
     values ($1,$2,$3,$4,$5,'draft',$6) returning *`,
    [
      input.practice.tenantId,
      input.practice.id,
      input.promptId,
      input.title,
      input.body,
      input.model,
    ],
  );
  await query(
    "update practices set status='generated', extra_instruction=$2, updated_at=now() where id=$1",
    [input.practice.id, input.practice.extraInstruction],
  );
  return row ? mapOutput(row) : null;
}

export async function getOutput(id: string) {
  const row = await queryOne<OutputRow>("select * from outputs where id = $1", [id]);
  return row ? mapOutput(row) : null;
}

export async function updateOutput(
  id: string,
  patch: { body?: string; status?: OutputStatus; saveVersion?: boolean; note?: string },
) {
  const current = await queryOne<OutputRow>("select * from outputs where id = $1", [id]);
  if (!current) return null;
  if (patch.saveVersion && patch.body !== undefined) {
    await query(
      `insert into output_versions (output_id, tenant_id, body, note) values ($1,$2,$3,$4)`,
      [current.id, current.tenant_id, current.body, patch.note || "Salvataggio manuale"],
    );
  }
  const row = await queryOne<OutputRow>(
    `update outputs set
        body = coalesce($2, body),
        status = coalesce($3, status),
        updated_at = now()
      where id = $1
      returning *`,
    [id, patch.body ?? null, patch.status ?? null],
  );
  return row ? mapOutput(row) : null;
}

export async function listArchive(session: SessionUser) {
  const docs = canSeeAll(session.role)
    ? await query<DocumentRow & { practice_title: string }>(
        `select d.id, d.tenant_id, d.practice_id, d.kind, d.filename, d.mime_type, d.storage_path,
                left(d.extracted_text, 200) as extracted_text, d.size, d.created_at,
                p.title as practice_title
           from documents d join practices p on p.id = d.practice_id
          order by d.created_at desc`,
      )
    : await query<DocumentRow & { practice_title: string }>(
        `select d.id, d.tenant_id, d.practice_id, d.kind, d.filename, d.mime_type, d.storage_path,
                left(d.extracted_text, 200) as extracted_text, d.size, d.created_at,
                p.title as practice_title
           from documents d join practices p on p.id = d.practice_id
          where d.tenant_id = $1
          order by d.created_at desc`,
        [session.tenantId],
      );
  const outs = canSeeAll(session.role)
    ? await query<OutputRow>("select * from outputs order by updated_at desc")
    : await query<OutputRow>("select * from outputs where tenant_id = $1 order by updated_at desc", [
        session.tenantId,
      ]);
  return {
    documents: docs.map((d) => ({ ...mapDocument(d), practiceTitle: d.practice_title })),
    outputs: outs.map(mapOutput),
  };
}

export async function dashboardCounts(session: SessionUser) {
  const practices = await listPractices(session);
  return {
    practices: practices.length,
    documents: practices.reduce((n, p) => n + p.documents, 0),
    outputs: practices.reduce((n, p) => n + p.outputs, 0),
    items: practices,
  };
}

export function newId() {
  return randomUUID();
}
