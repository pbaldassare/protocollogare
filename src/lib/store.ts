import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { Database } from "./types";
import { seedDatabase } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function emptyDb(): Database {
  return {
    tenants: [],
    users: [],
    prompts: [],
    practices: [],
    documents: [],
    outputs: [],
    versions: [],
  };
}

export function ensureDataDir() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(path.join(DATA_DIR, "uploads"), { recursive: true });
}

export function readDb(): Database {
  ensureDataDir();
  if (!existsSync(DB_PATH)) {
    const seeded = seedDatabase(emptyDb());
    writeFileSync(DB_PATH, JSON.stringify(seeded, null, 2), "utf-8");
    return seeded;
  }
  const raw = readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

export function writeDb(db: Database) {
  ensureDataDir();
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function mutateDb<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function uploadDir(tenantId: string, practiceId: string) {
  const dir = path.join(DATA_DIR, "uploads", tenantId, practiceId);
  mkdirSync(dir, { recursive: true });
  return dir;
}
