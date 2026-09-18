import { mkdirSync, writeFileSync } from "fs";
import path from "path";

export function uploadsRoot() {
  return process.env.UPLOADS_DIR || path.join(process.cwd(), "data", "uploads");
}

export function safeSegment(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

export function practiceFolder(tenantSlug: string, practiceId: string) {
  return path.join(uploadsRoot(), safeSegment(tenantSlug), "pratiche", practiceId);
}

export function libraryFolder(tenantSlug: string) {
  return path.join(uploadsRoot(), safeSegment(tenantSlug), "libreria");
}

export function writeClientFile(dir: string, filename: string, bytes: Buffer) {
  mkdirSync(dir, { recursive: true });
  const name = safeSegment(filename);
  const full = path.join(dir, name);
  writeFileSync(full, bytes);
  return full;
}
