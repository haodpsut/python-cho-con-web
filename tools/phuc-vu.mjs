#!/usr/bin/env node
// phuc-vu.mjs - may chu de thu o nha. Lam dung viec ma vercel.json lam:
// moi duong dan khong phai tep deu tra ve index.html.
// Chay: node tools/phuc-vu.mjs [cong]
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONG = Number(process.argv[2]) || 8080;

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".zip": "application/zip",
  ".woff2": "font/woff2", ".png": "image/png", ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

createServer((req, res) => {
  const duong = decodeURIComponent((req.url || "/").split("?")[0]);
  let p = join(ROOT, duong);
  if (!p.startsWith(ROOT)) { res.writeHead(403).end(); return; }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, "index.html");
  res.writeHead(200, {
    "content-type": MIME[extname(p)] || "application/octet-stream",
    "cache-control": "no-cache",
  }).end(readFileSync(p));
}).listen(CONG, () => console.log(`http://localhost:${CONG}`));
