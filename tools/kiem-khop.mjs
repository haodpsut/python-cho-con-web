#!/usr/bin/env node
// kiem-khop.mjs - CONG GHEP CAP. Hai cau hoi ma nam cong kia deu khong hoi:
//
//  1. HINH hien ra o bai N co dung la hinh ma sach dat o bai N khong, va co
//     dung THU TU khong. Cong hinh chi kiem "anh nay giong ban PDF cua chinh
//     no", khong kiem "anh nay co dung cho cho nay".
//
//  2. O "Máy phải in ra đúng thế này" hien tren trang co dung bang cai ma
//     CODE IN TREN CHINH TRANG AY chay ra khong. Cong chay thu doi chieu
//     JSON voi tep .out; cong nay doi chieu CHU TREN MAN HINH voi KET QUA
//     CHAY THAT. Khac nhau o cho: no bat duoc loi o khau hien thi.
//
// Lay ma tu DOM chu khong tu JSON, vi dieu can chung minh la cai chau NHIN
// THAY sinh ra cai chau DOC DUOC.
//
// Chay: node tools/kiem-khop.mjs
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TU_KIEM = process.argv.includes("--tu-kiem");
const SACH = join(ROOT, "..", "python-cho-con");
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Khong tim thay Chrome."); process.exit(2); }

// --- nguon doi chung 1: thu tu hinh trong tung tep .tex cua sach
const hinhTheoBai = {};
for (let n = 1; n <= 32; n++) {
  const sn = String(n).padStart(2, "0");
  const tex = readFileSync(join(SACH, "sach", "bai", `bai${sn}.tex`), "utf8");
  hinhTheoBai[n] = [...tex.matchAll(/\\input\{hinh\/([^}]+)\.tex\}/g)].map((m) => m[1]);
}
// --- nguon doi chung 2: tep .out that trong kho sach
const outTheoTep = {};
for (const d of readdirSync(join(SACH, "ma")).filter((x) => x.startsWith("bai")))
  for (const f of readdirSync(join(SACH, "ma", d)).filter((x) => x.endsWith(".out")))
    outTheoTep[`${d}/${f}`] = readFileSync(join(SACH, "ma", d, f), "utf8");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".zip": "application/zip",
};

const KICH_BAN = String.raw`
const HINH = __HINH__;
const loi = [];
const dem = { hinh: 0, kq: 0, vidu: 0, doan: 0 };
const E = (t, m) => loi.push("✗ " + t + ": " + m);
const nghi = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (s, g=document) => g.querySelector(s);
const $$ = (s, g=document) => [...g.querySelectorAll(s)];
const chuan = (s) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+$/gm, "").replace(/\n+$/, "");

// --- nhan Python rieng cua cong, khong muon cua app
let w = null, idc = 0;
function moiW(){ if (w) w.terminate(); w = new Worker("js/worker.js", { type: "module" }); }
moiW();
function chay(ma, stdin){
  const id = ++idc;
  return new Promise((kq) => {
    let roi = false;
    const gio = setTimeout(() => { if (roi) return; roi = true; moiW(); kq({ ra: "", loi: "QUA GIO" }); }, 15000);
    const h = (e) => { if (e.data.id !== id || roi) return; roi = true; clearTimeout(gio);
      w.removeEventListener("message", h); kq({ ra: e.data.ra || "", loi: e.data.loi || null }); };
    w.addEventListener("message", h);
    w.postMessage({ id, loai: "chay", ma, stdin: stdin ?? null });
  });
}

async function di(n){
  history.pushState({}, "", "/bai/" + n);
  dispatchEvent(new PopStateEvent("popstate"));
  const het = Date.now() + 20000;
  while (Date.now() < het) { if ($("h1") && new RegExp("^Bài " + n + "\\.").test($("h1").textContent)) break; await nghi(60); }
  await nghi(150);
}

for (let n = 1; n <= 32; n++) {
  const t = "bai " + n;
  await di(n);
  const d = await (await fetch("/data/bai/bai" + String(n).padStart(2,"0") + ".json")).json();

  // ===== 1. HINH: dung tep, dung thu tu =====
  const tren = $$("figure.hinh img").map(i => i.getAttribute("src").replace("assets/hinh/","").replace(".svg",""));
  const sach = HINH[n];
  dem.hinh += tren.length;
  if (tren.join("|") !== sach.join("|"))
    E(t, "hinh tren trang khong khop sach.\n      trang: [" + tren.join(", ") + "]\n      sach : [" + sach.join(", ") + "]");

  // ===== 2. VI DU: ma IN TREN TRANG chay ra dung o ket qua cua sach =====
  {
    const vd = d.khoi.filter(k => k.kind === "vidu");
    const nutVd = $$("[data-chay]");
    if (nutVd.length !== vd.length) E(t, "co " + nutVd.length + " nut Chay thu nhung " + vd.length + " vi du");
    for (let i = 0; i < vd.length; i++) {
      // ma lay tu DOM: khoi code dung ngay truoc nut Chay thu
      const khoi = nutVd[i].closest(".code-khoi");
      const maTren = khoi ? khoi.querySelector("pre code").textContent : "";
      if (chuan(maTren) !== chuan(vd[i].code))
        E(t, "vi du " + (i+1) + ": ma in tren trang khac ma trong du lieu");
      const r = await chay(maTren, vd[i].stdin);
      dem.vidu++;
      if (r.loi) E(t, "vi du " + (i+1) + ": chay bao loi " + String(r.loi).split("\n").pop());
      else if (chuan(r.ra) !== chuan(vd[i].out))
        E(t, "vi du " + (i+1) + ": chay ra khac o ket qua cua sach\n      chay: " + JSON.stringify(chuan(r.ra)).slice(0,90) + "\n      sach: " + JSON.stringify(chuan(vd[i].out)).slice(0,90));
    }
  }

  // ===== 3. DOAN KET QUA: so dong ghi tren trang phai dung =====
  {
    const kd = d.khoi.filter(k => k.kind === "predict_output");
    for (const k of kd) {
      const bt = $('[data-bt="' + k.id + '"]');
      if (!bt) { E(t, k.id + ": khong thay khoi tren trang"); continue; }
      const maTren = $("pre code", bt).textContent;
      if (chuan(maTren) !== chuan(k.code)) E(t, k.id + ": ma in tren trang khac du lieu");
      const nhan = bt.innerText.match(/Con đoán máy in ra (\d+) dòng/);
      if (!nhan) { E(t, k.id + ": khong thay dong ghi so dong"); continue; }
      const r = await chay(maTren, k.stdin);
      dem.doan++;
      if (r.loi) { E(t, k.id + ": chay bao loi " + String(r.loi).split("\n").pop()); continue; }
      const thuc = chuan(r.ra) === "" ? 0 : chuan(r.ra).split("\n").length;
      if (Number(nhan[1]) !== thuc)
        E(t, k.id + ": trang ghi " + nhan[1] + " dong nhung chay ra " + thuc + " dong");
      // o nhap phai du cho ngan ay dong
      const ta = $("textarea[data-nhap]", bt);
      if (!ta || !/Viết \d+ dòng/.test(ta.placeholder)) E(t, k.id + ": o nhap thieu loi nhac so dong");
    }
  }

  // ===== 4. O "May phai in ra dung the nay" =====
  {
    const cf = d.khoi.filter(k => k.kind === "code_fill");
    for (const k of cf) {
      const bt = $('[data-bt="' + k.id + '"]');
      if (!bt) { E(t, k.id + ": khong thay khoi tren trang"); continue; }
      const oKq = $(".kq", bt);
      if (!k.chayDuoc) { if (oKq) E(t, k.id + ": khoi khong chay duoc ma van hien o ket qua"); continue; }
      if (!oKq) { E(t, k.id + ": thieu o 'May phai in ra dung the nay'"); continue; }
      dem.kq++;

      // ma lay tu DOM: chu trong <pre> cong voi dap an do vao tung o
      const pre = $("pre code", bt);
      let maTren = "";
      for (const node of pre.childNodes) {
        if (node.nodeType === 3) maTren += node.textContent;
        else if (node.tagName === "INPUT") {
          const j = Number(node.dataset.o);
          maTren += (k.blanks[j-1] && k.blanks[j-1].accept[0]) || "";
        } else maTren += node.textContent;
      }
      const r = await chay(maTren, k.stdin);
      if (r.loi) { E(t, k.id + ": ghep dap an vao ma TREN TRANG roi chay thi bao loi: " + String(r.loi).split("\n").pop()); continue; }
      if (chuan(r.ra) !== chuan(oKq.textContent))
        E(t, k.id + ": o ket qua TREN TRANG khong khop ket qua chay that\n      trang: " + JSON.stringify(chuan(oKq.textContent)).slice(0,90) + "\n      chay : " + JSON.stringify(chuan(r.ra)).slice(0,90));
    }
  }
}

await fetch("/ket-qua", { method:"POST", headers:{"content-type":"application/json"},
  body: JSON.stringify({ loi, dem }) });
document.title = "XONG";
`.replace("__HINH__", JSON.stringify(hinhTheoBai));

let xong = null;
const doi = new Promise((r) => { xong = r; });
const may = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/ket-qua") {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); xong(JSON.parse(b)); });
    return;
  }
  const d = decodeURIComponent((req.url || "/").split("?")[0]);

  // TU KIEM: tiem bon kieu hong vao du lieu bai 5, roi doi hoi cong phai bao
  // dung bon loi ay. Khong co buoc nay thi cong xanh khong chung minh dieu gi.
  if (TU_KIEM && d === "/data/bai/bai05.json") {
    const o = JSON.parse(readFileSync(join(ROOT, "data/bai/bai05.json"), "utf8"));
    const hinh = o.khoi.find((k) => k.kind === "hinh");
    if (hinh) hinh.src = "assets/hinh/hinh-bai20-luoi.svg";          // 1. hinh cua bai khac
    const vd = o.khoi.find((k) => k.kind === "vidu");
    if (vd) vd.out = vd.out + "dong thua\n";                         // 2. o ket qua vi du sai
    const dk = o.khoi.find((k) => k.kind === "predict_output");
    if (dk) dk.soDong = dk.soDong + 1;                                // 3. so dong ghi sai
    const cf = o.khoi.find((k) => k.kind === "code_fill" && k.chayDuoc);
    if (cf) cf.expectOut = "SAI BET\n";                              // 4. o ket qua dien sai
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" })
       .end(JSON.stringify(o));
    return;
  }

  let p = join(ROOT, d);
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, "index.html");
  if (p === join(ROOT, "index.html")) {
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
console.log("  Ghep cap hinh va o ket qua tren ca 32 bai, chay Python that...");
const ch = spawn(CHROME, ["--headless", "--disable-gpu", "--no-sandbox",
  "--user-data-dir=" + join(ROOT, "tools", ".chrome-khop"),
  `http://127.0.0.1:${cong}/bai/1`], { stdio: "ignore" });
const hh = setTimeout(() => { console.error("  Qua 20 phut."); ch.kill(); may.close(); process.exit(2); }, 1200000);
const kq = await doi;
clearTimeout(hh); ch.kill(); may.close();

const { loi, dem } = kq;
console.log(`\n  CONG GHEP CAP\n  ${"-".repeat(52)}`);
console.log(`  ${dem.hinh} hinh doi chieu voi thu tu trong tep .tex cua sach`);
console.log(`  ${dem.vidu} vi du, ${dem.doan} bai doan, ${dem.kq} o ket qua: ma TREN TRANG da chay that`);
if (TU_KIEM) {
  const b5 = loi.filter((l) => l.startsWith("✗ bai 5:"));
  const khac = loi.filter((l) => !l.startsWith("✗ bai 5:"));
  const muon = [
    ["hinh sai bai", (l) => /hinh tren trang khong khop sach/.test(l)],
    ["o ket qua vi du sai", (l) => /vi du .*chay ra khac o ket qua/.test(l)],
    ["so dong ghi sai", (l) => /trang ghi \d+ dong nhung chay ra/.test(l)],
    ["o ket qua dien sai", (l) => /o ket qua TREN TRANG khong khop/.test(l)],
  ];
  console.log("\n  TU KIEM: tiem 4 kieu hong vao bai 5");
  let sot = 0;
  for (const [ten, f] of muon) {
    const bat = b5.some(f);
    if (!bat) sot++;
    console.log(`     ${bat ? "✓ bat duoc" : "✗ SOT"}  ${ten}`);
  }
  if (khac.length) { console.log(`\n  ${khac.length} LOI THAT ngoai bai 5:`); khac.slice(0,20).forEach((l)=>console.log("  "+l)); }
  if (sot || khac.length) { console.log("\n  CONG DO.\n"); process.exit(1); }
  console.log("\n  ✓ Cong bat duoc ca bon kieu hong, va khong bao nham o 31 bai kia.\n");
  process.exit(0);
}
if (loi.length) {
  console.log(`\n  ${loi.length} LOI:`);
  loi.slice(0, 30).forEach((l) => console.log("  " + l));
  if (loi.length > 30) console.log(`  ... va ${loi.length - 30} loi nua`);
  console.log("\n  CONG DO.\n"); process.exit(1);
}
console.log(`\n  ✓ Hinh dung bai dung thu tu, va moi o ket qua khop voi ma in tren chinh trang ay.\n`);
