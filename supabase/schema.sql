-- Protocollo Gare
-- Multi-tenant schema. RLS on; Data API stays closed (no anon/authenticated grants).

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  role text not null check (role in ('platform_admin', 'admin', 'editor', 'viewer')),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists users_tenant_id_idx on public.users (tenant_id);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  description text not null default '',
  body text not null,
  sections jsonb not null default '[]'::jsonb,
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists prompts_tenant_id_idx on public.prompts (tenant_id);

create table if not exists public.practices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  ente text not null default '',
  cig text not null default '',
  notes text not null default '',
  prompt_id uuid references public.prompts(id) on delete set null,
  extra_instruction text not null default '',
  status text not null default 'draft',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practices_tenant_id_idx on public.practices (tenant_id);
create index if not exists practices_prompt_id_idx on public.practices (prompt_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  kind text not null,
  filename text not null,
  mime_type text not null,
  storage_path text,
  extracted_text text not null default '',
  file_bytes bytea,
  size integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists documents_practice_id_idx on public.documents (practice_id);
create index if not exists documents_tenant_id_idx on public.documents (tenant_id);

create table if not exists public.outputs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  practice_id uuid not null references public.practices(id) on delete cascade,
  prompt_id uuid references public.prompts(id) on delete set null,
  title text not null,
  body text not null,
  status text not null default 'draft',
  model text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outputs_practice_id_idx on public.outputs (practice_id);
create index if not exists outputs_tenant_id_idx on public.outputs (tenant_id);

create table if not exists public.output_versions (
  id uuid primary key default gen_random_uuid(),
  output_id uuid not null references public.outputs(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  body text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists output_versions_output_id_idx on public.output_versions (output_id);

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.prompts enable row level security;
alter table public.practices enable row level security;
alter table public.documents enable row level security;
alter table public.outputs enable row level security;
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

alter table public.output_versions enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.ai_memories enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
