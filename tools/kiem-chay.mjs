#!/usr/bin/env node
// kiem-chay.mjs - CONG: chay MOI chuong trinh trong TRINH DUYET THAT (Chrome +
// Pyodide trong Web Worker) roi so stdout voi tep .out da sinh bang CPython.
//
// Day la cong SO HAI NGUON: CPython o may vs Pyodide o trinh duyet.
// Khong duoc sua .out cho khop. Lech thi phai tim ra nguyen nhan.
//
// Khong dung thu vien ngoai. Node tu lam may chu, Chrome headless mo trang,
// trang POST ket qua ve. Khong dung console cua Chrome vi no khong bat duoc.
//
// Chay: node tools/kiem-chay.mjs  [--tu-kiem]
import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DATA = join(ROOT, "data");
const TU_KIEM = process.argv.includes("--tu-kiem");

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Khong tim thay Chrome."); process.exit(2); }

// --------------------------------------------------- gom moi chuong trinh
function gomCa() {
  const ca = [];
  const mf = JSON.parse(readFileSync(join(DATA, "manifest.json"), "utf8"));
  for (const b of mf.bai) {
    const d = JSON.parse(readFileSync(join(DATA, b.file), "utf8"));
    for (const k of d.khoi) {
      if (k.kind === "vidu") {
        ca.push({ ten: `bai${b.so}/vidu`, ma: k.code, stdin: k.stdin, mong: k.out });
      } else if (k.kind === "predict_output") {
        ca.push({ ten: `${k.id}`, ma: k.code, stdin: k.stdin, mong: k.expectOut });
      } else if (k.kind === "code_fill" && k.chayDuoc) {
        let ma = k.template;
        k.blanks.forEach((b2, j) => { ma = ma.replaceAll(`{{${j + 1}}}`, b2.accept[0]); });
        ca.push({ ten: `${k.id}`, ma, stdin: k.stdin, mong: k.expectOut });
      }
    }
  }
  return ca;
}

const ca = gomCa();

// TU KIEM: tiem loi de chung minh cong bat duoc. Khong co nhung ca nay thi
// cong xanh khong chung minh dieu gi.
const tuKiem = [
  { ten: "[tu-kiem] lech MOT ky tu", ma: 'print("Chào con!")', mong: "Chào con.\n", phaiLech: true },
  { ten: "[tu-kiem] thieu MOT dong", ma: 'print("a")\nprint("b")', mong: "a\n", phaiLech: true },
  { ten: "[tu-kiem] dung y het", ma: 'print("a")\nprint("b")', mong: "a\nb\n", phaiLech: false },
  { ten: "[tu-kiem] vong lap vo tan phai bi GIET", ma: "while True:\n    pass", mong: "", phaiLech: false, phaiHetGio: true },
  { ten: "[tu-kiem] dau tieng Viet trong code", ma: 'ten = "Trường Tiểu học Hoà Minh"\nprint(ten)', mong: "Trường Tiểu học Hoà Minh\n", phaiLech: false },
  { ten: "[tu-kiem] loi Python phai bao loi", ma: 'Print("x")', mong: "", phaiLech: false, phaiLoi: true },
];
const danhSach = TU_KIEM ? [...tuKiem, ...ca] : ca;

// ------------------------------------------------------------- may chu
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".wasm": "application/wasm",
  ".zip": "application/zip", ".svg": "image/svg+xml", ".woff2": "font/woff2",
};

let byteGui = 0, byteWasm = 0;
let xong = null;
const doi = new Promise((r) => { xong = r; });

const trang = `<!doctype html><meta charset=utf-8><title>kiem-chay</title><body>
<script type="module">
const CA = ${JSON.stringify(danhSach.map((c, i) => ({ i, ma: c.ma, stdin: c.stdin ?? null })))};
const HAN = 5000;              // giet sau 5 giay, giong app that
let w = null;
function moi(){ if(w) w.terminate(); w = new Worker('/js/worker.js',{type:'module'}); }
moi();
function chay(c){
  return new Promise((kq)=>{
    let xong=false;
    const gio=setTimeout(()=>{ if(xong) return; xong=true; moi(); kq({hetGio:true,ra:'',loi:null}); },HAN);
    const h=(e)=>{ if(e.data.id!==c.i) return; if(xong) return; xong=true;
      clearTimeout(gio); w.removeEventListener('message',h);
      kq({hetGio:false,ra:e.data.ra??'',loi:e.data.loi??null}); };
    w.addEventListener('message',h);
    w.onerror=(ev)=>{ if(xong) return; xong=true; clearTimeout(gio); kq({hetGio:false,ra:'',loi:'WORKER: '+(ev.message||'')}); };
    w.postMessage({id:c.i,loai:'chay',ma:c.ma,stdin:c.stdin});
  });
}
const t0=performance.now();
const ra=[];
for(const c of CA){ ra.push(await chay(c)); }
const ms=Math.round(performance.now()-t0);
await fetch('/ket-qua',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({ra,ms})});
document.title='XONG';
</script>`;

const may = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/ket-qua") {
    let b = "";
    req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); xong(JSON.parse(b)); });
    return;
  }
  if (req.url === "/__kiem.html") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(trang);
    return;
  }
  const p = join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) {
    res.writeHead(404).end("khong co");
    return;
  }
  const than = readFileSync(p);
  byteGui += than.length;
  if (/pyodide|python_stdlib/.test(p)) byteWasm += than.length;
  res.writeHead(200, {
    "content-type": MIME[extname(p)] || "application/octet-stream",
    "cross-origin-opener-policy": "same-origin",
    "cross-origin-embedder-policy": "require-corp",
  }).end(than);
});

await new Promise((r) => may.listen(0, "127.0.0.1", r));
const cong = may.address().port;

console.log(`  Chay ${danhSach.length} chuong trinh trong Chrome that...`);
const ch = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-sandbox", "--mute-audio",
  "--user-data-dir=" + join(HERE, ".chrome-kiem"),
  `http://127.0.0.1:${cong}/__kiem.html`,
], { stdio: "ignore" });

const hetHan = setTimeout(() => {
  console.error("  Qua 10 phut ma trang khong tra ket qua.");
  ch.kill(); may.close(); process.exit(2);
}, 600000);

const kq = await doi;
clearTimeout(hetHan);
ch.kill();
may.close();

// ---------------------------------------------------------------- doi chieu
function chuan(s) { return String(s ?? "").replace(/\r/g, "").replace(/\n+$/, ""); }

let dat = 0, lech = 0, tuKiemHong = 0;
const bao = [];
danhSach.forEach((c, i) => {
  const r = kq.ra[i] || { ra: "", loi: "WORKER KHONG TRA LOI", hetGio: false };
  const laTu = c.ten.startsWith("[tu-kiem]");

  if (laTu) {
    let ok;
    if (c.phaiHetGio) ok = r.hetGio === true;
    else if (c.phaiLoi) ok = !!r.loi;
    else ok = (chuan(r.ra) !== chuan(c.mong)) === !!c.phaiLech;
    if (ok) dat++; else { tuKiemHong++; bao.push(`  ✗ ${c.ten}: cong KHONG bat duoc`); }
    return;
  }

  if (r.hetGio) { lech++; bao.push(`  ✗ ${c.ten}: qua 5 giay`); return; }
  if (r.loi) { lech++; bao.push(`  ✗ ${c.ten}: Python bao loi: ${String(r.loi).split("\n").pop()}`); return; }
  if (chuan(r.ra) !== chuan(c.mong)) {
    lech++;
    bao.push(`  ✗ ${c.ten}: LECH\n      Pyodide: ${JSON.stringify(chuan(r.ra)).slice(0, 150)}\n      tep .out: ${JSON.stringify(chuan(c.mong)).slice(0, 150)}`);
    return;
  }
  dat++;
});

console.log(`\n  CONG CHAY THU (Chrome ${CHROME.includes("Chrome") ? "" : ""}+ Pyodide trong Web Worker)`);
console.log("  " + "-".repeat(52));
console.log(`  ✓ ${dat} dat / ${lech} lech  tren ${danhSach.length} chuong trinh`);
console.log(`  nhan Python tai ve ${(byteWasm / 1048576).toFixed(2)} MB tho (may chu dem), tong trang ${(byteGui / 1048576).toFixed(2)} MB`);
console.log(`  chay het ${(kq.ms / 1000).toFixed(1)} giay cho ${danhSach.length} chuong trinh`);
if (byteWasm === 0) { console.log("  ✗ BO DO HONG: dem duoc 0 byte Pyodide"); process.exitCode = 1; }
if (TU_KIEM) console.log(`  tu kiem: ${tuKiem.length} ca, ${tuKiemHong} ca cong khong bat duoc`);
if (bao.length) { console.log(""); bao.slice(0, 40).forEach((b) => console.log(b)); }
if (lech || tuKiemHong) { console.log(`\n  CONG DO.\n`); process.exit(1); }
console.log(`\n  ✓ Pyodide cho dung ket qua nhu CPython tren ca ${ca.length} chuong trinh.\n`);
