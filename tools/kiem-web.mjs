#!/usr/bin/env node
// kiem-web.mjs - CONG NOI DUNG: quet CA 32 BAI va 4 PHU LUC trong mot phien
// duyet, doc DOM that sau khi app.js dung xong.
//
// Khong phong mot Chrome cho moi trang: cham gap ba muoi lan. Dung chinh
// router cua trang de di qua tung bai.
//
// Chay: node tools/kiem-web.mjs [url]     (mac dinh http://localhost:8080)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Khong tim thay Chrome."); process.exit(2); }

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".zip": "application/zip", ".woff2": "font/woff2",
};

const KICH_BAN = String.raw`
const loi = [], tin = {bt:0, tn:0, hinh:0, hinhTep:new Set()};
const E = (t,m) => loi.push("✗ " + t + ": " + m);
const nghi = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (s,g=document) => g.querySelector(s);
const $$ = (s,g=document) => [...g.querySelectorAll(s)];

// Dau vet LaTeX con sot trong chu HIEN RA cho chau doc. Cong luoc do kiem
// JSON, cong nay kiem cai mat chau thuc su nhin thay tren trang.
const VET = [
  [/\\[a-zA-Z]{2,}/, "con macro LaTeX"],
  [/\{\{\d+\}\}/, "con o {{n}} chua thay"],
  [/&amp;(amp|lt|gt);|&lt;(code|b|p)&gt;/, "bi thoat HTML hai lan"],
  [/\bundefined\b|\[object Object\]|\bNaN\b/, "co gia tri JS lot ra"],
  [/—|–/, "co em dash"],
  [/\bNaN\b|\bnull\b/, "co null hay NaN"],
];
function chuTrang(){
  const m = document.getElementById("app");
  return (m ? m.innerText : "").replace(/\s+/g," ");
}
const _anh = {};
function taiAnh(src){
  if (_anh[src]) return _anh[src];
  _anh[src] = new Promise((r) => {
    const i = new Image();
    i.onload = () => r({ w: i.naturalWidth, h: i.naturalHeight });
    i.onerror = () => r(null);
    setTimeout(() => r(null), 20000);
    i.src = src;
  });
  return _anh[src];
}
async function di(duong){
  history.pushState({}, "", duong);
  dispatchEvent(new PopStateEvent("popstate"));
  const het = Date.now()+20000;
  while(Date.now()<het){ if($("h1")) break; await nghi(60); }
  await nghi(120);
}

for (let n = 1; n <= 32; n++) {
  const t = "bai " + n;
  await di("/bai/" + n);
  const h1 = $("h1");
  if (!h1 || !new RegExp("^Bài " + n + "\\.").test(h1.textContent)) {
    E(t, "tieu de sai: " + (h1 ? h1.textContent : "khong co")); continue;
  }
  const bt = $$(".bt").length; tin.bt += bt;
  if (bt !== 14) E(t, "co " + bt + " khoi bai tap, phai 14");

  const tn = $$('[data-chon="0"]').length; tin.tn += tn;
  if (tn !== 6) E(t, "co " + tn + " cau trac nghiem, phai 6");
  for (const q of $$(".lc")) if ($$("button", q).length !== 4) E(t, "mot cau co " + $$("button", q).length + " lua chon");

  if ($$("[data-nop]").filter(b => /Chạy và so/.test(b.textContent)).length !== 2)
    E(t, "khong du 2 bai doan ket qua");
  if ($$("input.o-dien").length < 4) E(t, "chi co " + $$("input.o-dien").length + " o dien");
  if (!$("[data-goiy]")) E(t, "thieu nut goi y");
  if (!$("[data-chay-tu]")) E(t, "thieu nut chay bai tu viet");

  // Hinh dat loading="lazy". Trong che do khong giao dien thi cuon trang KHONG
  // kich hoat tai, nen doc img.complete se bao nham la "khong tai duoc".
  // Nap thang tung tep de do dung cai can do: tep co tai duoc va co kich thuoc that.
  for (const img of $$("figure.hinh img")) {
    tin.hinh++; tin.hinhTep.add(img.getAttribute("src"));
    if (!img.alt || img.alt.length < 20) E(t, "hinh " + img.getAttribute("src") + " thieu alt");
    else if (!/[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹý]/i.test(img.alt))
      E(t, "alt cua " + img.getAttribute("src") + " khong co dau tieng Viet");
    const sz = await taiAnh(img.getAttribute("src"));
    if (!sz) E(t, "hinh " + img.getAttribute("src") + " khong tai duoc");
    else if (sz.w < 30 || sz.h < 10) E(t, "hinh " + img.getAttribute("src") + " chi " + sz.w + "x" + sz.h);
  }

  for (const pre of $$("pre")) if (!pre.textContent.trim()) E(t, "co khoi code rong");
  for (const k of $$(".kq")) if (!k.textContent.trim()) E(t, "co khoi ket qua rong");
  for (const s of $$(".bt")) if (s.innerText.trim().length < 30) E(t, "co khoi bai tap gan nhu rong");

  const chu = chuTrang();
  if (chu.length < 800) E(t, "noi dung qua ngan, chi " + chu.length + " ky tu");
  for (const [re, ten] of VET) {
    const m = re.exec(chu);
    if (m) E(t, ten + ': "' + chu.slice(Math.max(0,m.index-45), m.index+45).trim() + '"');
  }
}

for (const id of ["a","b","c","d"]) {
  const t = "phu luc " + id;
  await di("/phu-luc/" + id);
  if (!$("h1")) { E(t, "khong co tieu de"); continue; }
  const chu = chuTrang();
  // Phu luc D von rat ngan: chi mot doan dan va hai bang tram o. Dem ky tu la
  // do SAI thu. Cai can kiem la co du khoi va co hinh.
  const soKhoi = $$("#app > *").length;
  if (soKhoi < 3) E(t, "chi co " + soKhoi + " khoi, co the boc thieu");
  if (chu.length < 150) E(t, "noi dung qua ngan, chi " + chu.length + " ky tu");
  for (const [re, ten] of VET) {
    const m = re.exec(chu);
    if (m) E(t, ten + ': "' + chu.slice(Math.max(0,m.index-45), m.index+45).trim() + '"');
  }
  for (const img of $$("figure.hinh img")) {
    tin.hinh++; tin.hinhTep.add(img.getAttribute("src"));
    const sz = await taiAnh(img.getAttribute("src"));
    if (!sz) E(t, "hinh " + img.getAttribute("src") + " khong tai duoc");
  }
}

await di("/");
{
  const the = $$(".the-bai").length;
  if (the !== 36) E("trang chu", "co " + the + " the, phai 32 bai + 4 phu luc");
  for (let i=1;i<=6;i++) if (!document.body.innerText.includes("Chặng " + i + ".")) E("trang chu","thieu chang " + i);
  for (const [re, ten] of VET) { const m = re.exec(chuTrang()); if (m) E("trang chu", ten); }
}

await fetch("/ket-qua", {method:"POST", headers:{"content-type":"application/json"},
  body: JSON.stringify({loi, tin: {...tin, hinhTep: [...tin.hinhTep]}})});
document.title = "XONG";
`;

let xong = null;
const doi = new Promise((r) => { xong = r; });

const may = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/ket-qua") {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); xong(JSON.parse(b)); });
    return;
  }
  const d = decodeURIComponent((req.url || "/").split("?")[0]);
  let p = join(ROOT, d);
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, "index.html");
  if (p === join(ROOT, "index.html")) {
    // Ham thay the, khong phai chuoi: chuoi thi "$$(" bi bien thanh "$(".
    const chen = `<script type="module">
      await new Promise(r => setTimeout(r, 900));
      ${KICH_BAN}
    </script></body>`;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" })
       .end(readFileSync(p, "utf8").replace("</body>", () => chen));
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" })
     .end(readFileSync(p));
});

await new Promise((r) => may.listen(0, "127.0.0.1", r));
const cong = may.address().port;
console.log("  Quet 32 bai + 4 phu luc trong mot phien duyet...");
const ch = spawn(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
  "--user-data-dir=" + join(ROOT, "tools", ".chrome-web"),
  `http://127.0.0.1:${cong}/bai/1`], { stdio: "ignore" });
const hh = setTimeout(() => { console.error("  Qua 10 phut."); ch.kill(); may.close(); process.exit(2); }, 600000);
const kq = await doi;
clearTimeout(hh); ch.kill(); may.close();

const { loi, tin } = kq;
console.log(`\n  CONG NOI DUNG\n  ${"-".repeat(52)}`);
console.log(`  32 bai · ${tin.bt} khoi bai tap · ${tin.tn} cau trac nghiem`);
console.log(`  ${tin.hinh} lan dung hinh, ${tin.hinhTep.length} tep anh khac nhau, tat ca deu tai duoc`);
if (loi.length) {
  console.log(`\n  ${loi.length} LOI:`);
  loi.slice(0, 40).forEach((l) => console.log("  " + l));
  if (loi.length > 40) console.log(`  ... va ${loi.length - 40} loi nua`);
  console.log("\n  CONG DO.\n"); process.exit(1);
}
console.log(`\n  ✓ Sach tren ca 32 bai, 4 phu luc va trang chu.\n`);
