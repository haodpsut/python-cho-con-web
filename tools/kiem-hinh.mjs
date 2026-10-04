#!/usr/bin/env node
// kiem-hinh.mjs - CONG HINH: so tung SVG tren web voi ban PDF goc do LaTeX dung.
//
// Khong doc XML. Do TREN ANH RENDER, va so HAI NGUON:
//   nguon 1 = PDF do lualatex dung  -> PNG bang pdftocairo
//   nguon 2 = SVG web dang phuc vu  -> PNG bang Chrome (dung thu trinh duyet
//             that cua chau, khong phai bo render khac)
// Lech qua nguong la gay. Them ca phep do "hinh co rong khong".
//
// Chay: node tools/kiem-hinh.mjs [--tu-kiem]
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "..", "python-cho-con", "sach", "hinh");
const SVG = join(ROOT, "assets", "hinh");
const TMP = join(ROOT, "tools", ".kiem-hinh");
const TU_KIEM = process.argv.includes("--tu-kiem");
// So tren ban THU NHO. Hai bo render (pdftocairo va Chrome) khu rang cua khac
// nhau, nen o kich thuoc that cac hinh toan net manh 0.6pt lech 2 toi 10% diem
// anh MA NOI DUNG VAN Y HET (da soi tan mat hinh bai30 va bai27).
// Thu nho co trung binh hoa lam tan khac biet rang cua, con lech that (mat chi
// tiet, xe dich, sai mau) thi van con. Nguong duoi da duoc thu bang tiem loi.
// Them mot nguon nhieu nua: ban PNG va ban SVG lech nhau DUOI MOT DIEM ANH
// khi dua ve cung khung. Voi hinh luoi day (bai30 co 400 o) thi lech 1px lam
// hong ca phep do. Nen truoc khi so, DO THU cac phep dich -3..3 va lay lan
// khop nhat. Dich chuyen nho thi tha, con mat chi tiet hay sai mau thi khong.
const RONG_SO = 200;
const DICH = 3;
// NGUONG dat bang HIEU CHUAN tren ca hai phia, do ngay 04/10/2026:
//   45 hinh THAT   : cao nhat 9,73%  trung vi 4,48%
//   4 ca TIEM LOI  : 14,70% (xoa 40% path) · 19,09% (xe dich) ·
//                    30,95% (hinh khac)    · 100% (trang tron)
// Khe tu 9,73 toi 14,70 nen lay 12%. CHU Y HAN CHE: cong nay bat duoc hong
// LON (mat mang chi tiet, xe dich, thay nham hinh). No KHONG bat duoc sai mot
// chu so hay mot mau nhat. Phan ay phai nhin tan mat.
const NGUONG = 0.12;

const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Khong tim thay Chrome."); process.exit(2); }

rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const ten = readdirSync(SRC).filter((f) => f.endsWith(".tex")).map((f) => basename(f, ".tex")).sort();
console.log(`  Dung lai ${ten.length} hinh tu LaTeX de lam ban doi chung...`);

// 1) LaTeX -> PDF -> PNG (ban doi chung)
const pre = readFileSync(join(ROOT, "tools", "hinh-pre.tex"), "utf8");
let dungHong = 0;
for (const b of ten) {
  const tex = ["\\documentclass[border=4pt,varwidth=20cm]{standalone}", pre,
    "\\begin{document}", `\\input{${join(SRC, b)}.tex}`, "\\end{document}"].join("\n");
  writeFileSync(join(TMP, b + ".tex"), tex);
  const r = spawnSync("lualatex", ["-interaction=nonstopmode", "-halt-on-error", b + ".tex"],
    { cwd: TMP, stdio: "ignore" });
  if (r.status !== 0 || !existsSync(join(TMP, b + ".pdf"))) { console.log(`  ✗ ${b}: lualatex hong`); dungHong++; continue; }
  spawnSync("pdftocairo", ["-png", "-r", "96", "-singlefile", b + ".pdf", b + "-pdf"], { cwd: TMP, stdio: "ignore" });
}

// 2) SVG -> PNG bang Chrome, dung kich thuoc cua ban PDF
const pngPdf = Object.fromEntries(ten.map((b) => [b, join(TMP, b + "-pdf.png")]));

const trangChup = ten.map((b) => `
<div style="page-break-after:always"><img id="i-${b}" src="/assets/hinh/${b}.svg"></div>`).join("");

let xong = null;
const doi = new Promise((r) => { xong = r; });
const MIME = { ".svg": "image/svg+xml", ".png": "image/png", ".html": "text/html; charset=utf-8" };

const trang = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#fff">
<script type="module">
const TEN = ${JSON.stringify(ten)};
const RONG_SO = ${RONG_SO};
const NGUONG = ${NGUONG};
const DICH = ${DICH};
const TU_KIEM = ${TU_KIEM};
function nap(src){ return new Promise((r,e)=>{ const i=new Image(); i.onload=()=>r(i); i.onerror=()=>r(null); i.src=src; }); }
// Cat anh ve dung KHUNG CHUA MUC roi moi so. Hai bo render dat khung bao khac
// nhau (ban PNG cat sat hon ban SVG), nen neu khong chuan hoa thi moi net deu
// lech ti le va phep do chi do cai khac biet ay. Da xac minh tan mat tren
// hinh-bai01-luong: noi dung y het nhau ma phep do bao 14,16%.
function catMuc(img){
  const W = 600, H = Math.max(8, Math.round(img.naturalHeight*W/img.naturalWidth));
  const c = document.createElement("canvas"); c.width=W; c.height=H;
  const x = c.getContext("2d",{willReadFrequently:true});
  x.fillStyle="#fff"; x.fillRect(0,0,W,H); x.drawImage(img,0,0,W,H);
  const d = x.getImageData(0,0,W,H).data;
  let x0=W, y0=H, x1=-1, y1=-1;
  for(let y=0;y<H;y++) for(let xx=0;xx<W;xx++){
    const i=(y*W+xx)*4;
    if(d[i]<235||d[i+1]<235||d[i+2]<235){
      if(xx<x0)x0=xx; if(xx>x1)x1=xx; if(y<y0)y0=y; if(y>y1)y1=y;
    }
  }
  if(x1<0) return null;
  return {c, x0, y0, w:x1-x0+1, h:y1-y0+1};
}
function veRa(src,w,h,dx,dy){
  const c=document.createElement("canvas"); c.width=w; c.height=h;
  const x=c.getContext("2d",{willReadFrequently:true});
  x.fillStyle="#fff"; x.fillRect(0,0,w,h);
  x.drawImage(src.c, src.x0, src.y0, src.w, src.h, (dx||0), (dy||0), w, h);
  return x.getImageData(0,0,w,h).data;
}
// Ti le diem anh lech, da dò các phép dịch nhỏ và lấy lần khớp nhất.
function lechNhoNhat(A, s, w, h){
  let tot = 1;
  for(let dy=-DICH; dy<=DICH; dy++) for(let dx=-DICH; dx<=DICH; dx++){
    const B = veRa(s,w,h,dx,dy);
    let khac=0;
    for(let i=0;i<A.length;i+=4){
      const d=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]);
      if(d>90) khac++;
    }
    const f = khac/(A.length/4);
    if(f < tot) tot = f;
  }
  return tot;
}
const ra=[];
for(const b of TEN){
  const a = await nap("/pdf/"+b+".png");      // ban doi chung tu LaTeX
  const s = await nap("/assets/hinh/"+b+".svg");
  if(!a || !s){ ra.push({b, loi:(!a?"thieu PNG doi chung":"SVG khong tai duoc")}); continue; }
  const ca = catMuc(a), cs = catMuc(s);
  if(!ca){ ra.push({b, loi:"ban doi chung TRANG tron"}); continue; }
  if(!cs){ ra.push({b, loi:"SVG TRANG tron"}); continue; }
  const w = RONG_SO, h = Math.max(8, Math.round(ca.h*w/ca.w));
  const A = veRa(ca,w,h,0,0);
  let muc=0;
  for(let i=0;i<A.length;i+=4) if(A[i]<200||A[i+1]<200||A[i+2]<200) muc++;
  ra.push({b, w, h, lech: lechNhoNhat(A,cs,w,h), mucDoiChung: muc/(A.length/4),
           tiLe: Math.abs(ca.w/ca.h - cs.w/cs.h)});
}
// TU KIEM: cong chi bao xanh thi khong chung minh gi. Tiem bon kieu hong that.
if (TU_KIEM) {
  const CA = [
    ["[tu-kiem] SVG cua hinh KHAC",        "/assets/hinh/hinh-bai20-luoi.svg", "hinh-bai30-bonbuoc"],
    ["[tu-kiem] SVG XOA BOT phan tu",      "/hong/bot.svg",                    "hinh-bai30-bonbuoc"],
    ["[tu-kiem] SVG XE DICH 8 diem",       "/hong/dich.svg",                   "hinh-bai30-bonbuoc"],
    ["[tu-kiem] SVG TRANG tron",           "/hong/trang.svg",                  "hinh-bai30-bonbuoc"],
  ];
  for (const [ten, src, goc] of CA) {
    const a = await nap("/pdf/"+goc+".png");
    const s2 = await nap(src);
    if (!a || !s2) { ra.push({b: ten, tuKiem: true, batDuoc: false, ghi: "khong nap duoc"}); continue; }
    const ca = catMuc(a), cs = catMuc(s2);
    if(!ca){ ra.push({b: ten, tuKiem:true, batDuoc:false, ghi:"doi chung trang"}); continue; }
    if(!cs){ ra.push({b: ten, tuKiem:true, lech:1, batDuoc:true}); continue; }
    const w = RONG_SO, h = Math.max(8, Math.round(ca.h*w/ca.w));
    const A = veRa(ca,w,h,0,0);
    const lech = lechNhoNhat(A,cs,w,h);
    ra.push({b: ten, tuKiem: true, lech, batDuoc: lech > NGUONG});
  }
}
await fetch("/ket-qua",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(ra)});
document.title="XONG";
</script>`;

const may = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/ket-qua") {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); xong(JSON.parse(b)); });
    return;
  }
  const d = decodeURIComponent((req.url || "/").split("?")[0]);
  if (d === "/__kiem.html") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(trang); return; }
  if (d.startsWith("/hong/")) {
    const goc = readFileSync(join(SVG, "hinh-bai30-bonbuoc.svg"), "utf8");
    let x = goc;
    if (d === "/hong/bot.svg") {
      // xoa 40% the <path>, giong ca mat chi tiet
      let n = 0;
      x = goc.replace(/<path\b[^>]*\/>/g, (m) => (++n % 5 < 2 ? "" : m));
    } else if (d === "/hong/dich.svg") {
      x = goc.replace(/<svg([^>]*)>/, '<svg$1><g transform="translate(8,8)">').replace(/<\/svg>\s*$/, "</g></svg>");
    } else if (d === "/hong/trang.svg") {
      // SVG trang that su, giu nguyen khung. Ban truoc chi xoa mot the nen
      // van con nguyen hinh, va cong "bat duoc 0%" la BO DO HONG chu khong
      // phai ket qua am.
      const m = /<svg[^>]*>/.exec(goc);
      x = (m ? m[0] : "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>") + "</svg>";
    }
    res.writeHead(200, { "content-type": "image/svg+xml" }).end(x);
    return;
  }
  let p = d.startsWith("/pdf/") ? join(TMP, d.slice(5).replace(/\.png$/, "-pdf.png")) : join(ROOT, d);
  if (!existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }).end(readFileSync(p));
});
await new Promise((r) => may.listen(0, "127.0.0.1", r));
const cong = may.address().port;

const ch = spawn(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
  "--user-data-dir=" + join(TMP, "cr"), `http://127.0.0.1:${cong}/__kiem.html`], { stdio: "ignore" });
const hh = setTimeout(() => { console.error("  Qua gio."); ch.kill(); may.close(); process.exit(2); }, 300000);
const ra = await doi;
clearTimeout(hh); ch.kill(); may.close();

// 3) Doi chieu
const xau = [];
const tk = ra.filter((r) => r.tuKiem);
let dat = 0, tkHong = 0;
for (const r of tk) {
  if (!r.batDuoc) { tkHong++; xau.push(`  ✗ ${r.b}: cong KHONG bat duoc (lech ${((r.lech||0)*100).toFixed(2)}%)`); }
}
for (const r of ra.filter((x) => !x.tuKiem)) {
  if (r.loi) { xau.push(`  ✗ ${r.b}: ${r.loi}`); continue; }
  if (r.mucDoiChung < 0.002) { xau.push(`  ✗ ${r.b}: ban doi chung gan nhu TRANG (${(r.mucDoiChung * 100).toFixed(3)}% muc)`); continue; }
  // Khong cham diem ti le khung mực nua. Sau khi da chuan hoa theo khung muc,
  // phep do diem anh o tren DA bao trum viec sai hinh hoc (ca tiem loi "xe dich
  // 8 diem" bi bat o 19,09%). Ti le khung luc nay chi con do nhieu bien: mot net
  // rat nhat o mep duoc bo render nay thay ma bo kia khong. Giu lai chi la do
  // mot thu KHAC voi dieu no khai bao ve. Van in ra de theo doi.
  if (r.lech > NGUONG) { xau.push(`  ✗ ${r.b}: SVG lech ban PDF ${(r.lech * 100).toFixed(2)}% diem anh`); continue; }
  dat++;
}

console.log(`\n  CONG HINH (so SVG web voi ban PDF do LaTeX dung)`);
console.log("  " + "-".repeat(52));
const th = ra.filter((r) => !r.tuKiem);
const sx = th.filter((r) => !r.loi).map((r) => r.lech).sort((a, b) => b - a);
console.log(`  ✓ ${dat} dat / ${th.length - dat} hong tren ${th.length} hinh  (so tren ban thu nho ${RONG_SO}px)`);
if (tk.length) {
  console.log(`  tu kiem: ${tk.length} ca tiem loi, ${tkHong} ca cong khong bat duoc`);
  for (const r of tk) console.log(`     ${r.batDuoc ? "✓ bat duoc" : "✗ SOT"}  ${r.b}  lech ${((r.lech||0)*100).toFixed(2)}%`);
}
if (sx.length) console.log(`  lech lon nhat ${(sx[0] * 100).toFixed(2)}%, trung vi ${(sx[Math.floor(sx.length / 2)] * 100).toFixed(2)}%  (nguong ${(NGUONG * 100).toFixed(0)}%)`);
if (sx.length && tk.length) {
  const yeuNhat = Math.min(...tk.map((r) => r.lech ?? 1));
  console.log(`  khe an toan: hinh that cao nhat ${(sx[0] * 100).toFixed(2)}%  <  ca tiem loi yeu nhat ${(yeuNhat * 100).toFixed(2)}%`);
  if (sx[0] >= yeuNhat) console.log("  ✗ KHONG CON KHE: co hinh that lech hon ca ca tiem loi. Nguong vo nghia.");
}
if (dungHong) console.log(`  ${dungHong} hinh khong dung lai duoc tu LaTeX`);
console.log("\n  Tam hinh lech nhieu nhat:");
for (const r of th.filter((x) => !x.loi).sort((a, b) => b.lech - a.lech).slice(0, 8))
  console.log(`     ${(r.lech * 100).toFixed(2).padStart(6)}%  ${r.b}`);
if (xau.length) { console.log(""); xau.forEach((x) => console.log(x)); }
if (xau.length || dungHong || tkHong) { console.log("\n  CONG DO.\n"); process.exit(1); }
console.log(`\n  ✓ Ca ${th.length} hinh tren web khop ban PDF goc.\n`);
