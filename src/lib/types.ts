export type Role = "platform_admin" | "admin" | "editor" | "viewer";

export type DocumentKind =
  | "avviso"
  | "capitolato"
  | "rdo"
  | "domanda"
  | "progetto"
  | "prompt"
  | "altro";

export type PracticeStatus = "draft" | "ready" | "generated" | "archived";
export type OutputStatus = "draft" | "review" | "final";

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  passwordHash: string;
  createdAt: string;
};

export type PromptTemplateSection = {
  id: string;
  title: string;
  instruction: string;
  required: boolean;
};

export type PromptRecord = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  body: string;
  sections: PromptTemplateSection[];
  isDefault: boolean;
  updatedAt: string;
};

export type Practice = {
  id: string;
  tenantId: string;
  title: string;
  ente: string;
  cig: string;
  notes: string;
  promptId: string;
  extraInstruction: string;
  status: PracticeStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PracticeDocument = {
  id: string;
  tenantId: string;
  practiceId: string;
  kind: DocumentKind;
  filename: string;
  mimeType: string;
  storagePath: string;
  extractedText: string;
  size: number;
  createdAt: string;
};

export type OutputRecord = {
  id: string;
  tenantId: string;
  practiceId: string;
  promptId: string;
  title: string;
  body: string;
  status: OutputStatus;
  model: string;
  createdAt: string;
  updatedAt: string;
};

export type OutputVersion = {
  id: string;
  outputId: string;
  tenantId: string;
  body: string;
  note: string;
  createdAt: string;
};

export type KnowledgeKind = "modello" | "azienda" | "normativa" | "altro";
export type MemoryKind = "fact" | "style" | "correction";

export type KnowledgeDocument = {
  id: string;
  tenantId: string;
  title: string;
  kind: KnowledgeKind;
  filename: string;
  mimeType: string;
  extractedText: string;
  size: number;
  createdAt: string;
};

export type AiMemory = {
  id: string;
  tenantId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  workspaceTenantId: string;
  workspaceTenantName: string;
};

export type Database = {
  tenants: Tenant[];
  users: User[];
  prompts: PromptRecord[];
  practices: Practice[];
  documents: PracticeDocument[];
  outputs: OutputRecord[];
  versions: OutputVersion[];
};
