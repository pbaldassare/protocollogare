import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import path from "path";

const root = process.cwd();
const dist = path.join(root, "dist");

mkdirSync(dist, { recursive: true });

if (existsSync(path.join(root, "public"))) {
  cpSync(path.join(root, "public"), dist, { recursive: true });
}

const nextStatic = path.join(root, ".next/static");
if (existsSync(nextStatic)) {
  mkdirSync(path.join(dist, "_next"), { recursive: true });
  cpSync(nextStatic, path.join(dist, "_next/static"), { recursive: true });
}

const loginHtmlPath = path.join(root, ".next/server/app/login.html");
const loginHtml = existsSync(loginHtmlPath)
  ? readFileSync(loginHtmlPath, "utf8")
  : `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Protocollo Gare</title></head><body style="font-family:sans-serif;background:#534b44;color:#f3e6c0;padding:48px"><h1>Protocollo Gare</h1><p>Build Cloudflare pronto. Apri /login.</p></body></html>`;

writeFileSync(path.join(dist, "index.html"), loginHtml);
mkdirSync(path.join(dist, "login"), { recursive: true });
writeFileSync(path.join(dist, "login/index.html"), loginHtml);

writeFileSync(
  path.join(dist, "_redirects"),
  ["/login /login/index.html 200", "/ /index.html 200", ""].join("\n"),
);

writeFileSync(
  path.join(dist, "_headers"),
  ["/_next/static/*", "  Cache-Control: public,max-age=31536000,immutable", ""].join("\n"),
);

console.log("Cloudflare Pages output ready in dist/");
