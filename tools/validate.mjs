#!/usr/bin/env node
// validate.mjs - CONG LUOC DO: kiem toan bo data/ theo CHUAN-QIF-PY.md.
// Node thuan, chi dung node: builtin.  Chay: node tools/validate.mjs [--tu-kiem]
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const MA = join(ROOT, "..", "python-cho-con", "ma");
const TU_KIEM = process.argv.includes("--tu-kiem");

const loi = [], canh = [];
const E = (f, id, m) => loi.push(`✗ [${f}${id ? " · " + id : ""}] ${m}`);
const W = (f, id, m) => canh.push(`⚠ [${f}${id ? " · " + id : ""}] ${m}`);

const THE_CHO_PHEP = new Set(["p","b","i","code","ul","ol","li","br","sup","sub","span","h4","table","thead","tbody","tr","th","td","div","figure","img"]);
const KIND = new Set(["muc_tieu","van","hinh","vidu","nhac","la","guess_text","single_choice","predict_output","code_fill","fill_blank","free_code"]);

function gachNgang(s) { return /—|–|(^|\s)--(\s|$)/.test(String(s)); }
function theLa(html) {
  const ra = [];
  for (const m of String(html).matchAll(/<\/?([a-zA-Z0-9]+)/g)) if (!THE_CHO_PHEP.has(m[1])) ra.push(m[1]);
  return [...new Set(ra)];
}
const TRUONG_HTML = ["html", "stem", "explanation", "reveal", "loiHayMac", "goiY", "deBai"];
function chuHtml(k) {
  const r = [];
  for (const t of TRUONG_HTML) if (typeof k[t] === "string") r.push(k[t]);
  for (const t of ["options", "items", "checklist"]) if (Array.isArray(k[t])) r.push(...k[t].filter((x) => typeof x === "string"));
  if (Array.isArray(k.hints)) for (const h of k.hints) { if (h && h.hoi) r.push(h.hoi); if (h && h.dap) r.push(h.dap); }
  if (Array.isArray(k.hoiTruoc)) r.push(...k.hoiTruoc);
  return r;
}
function moiChu(k) {
  const r = [];
  const di = (v) => {
    if (typeof v === "string") r.push(v);
    else if (Array.isArray(v)) v.forEach(di);
    else if (v && typeof v === "object") Object.values(v).forEach(di);
  };
  di(k);
  return r;
}

const mf = JSON.parse(readFileSync(join(DATA, "manifest.json"), "utf8"));
const ids = new Set();
let nKhoi = 0, nViec = 0, nHinh = 0;
const demKind = {};

// -------------------------------------------------------------- manifest
if (mf.bai.length !== 32) E("manifest", "", `co ${mf.bai.length} bai, phai 32`);
if (mf.chang.length !== 6) E("manifest", "", `co ${mf.chang.length} chang, phai 6`);
{
  const tong = mf.chang.flatMap((c) => c.bai).sort((a, b) => a - b);
  const mong = Array.from({ length: 32 }, (_, i) => i + 1);
  if (tong.join(",") !== mong.join(",")) E("manifest", "", "cac chang khong phu kin 32 bai khong trung");
}

// ------------------------------------------------------------------ bai
for (const b of mf.bai) {
  const f = b.file;
  const d = JSON.parse(readFileSync(join(DATA, f), "utf8"));
  if (d.so !== b.so) E(f, "", "so bai khong khop manifest");
  const dsViec = d.khoi.filter((k) => k.id);

  for (const k of d.khoi) {
    nKhoi++;
    demKind[k.kind] = (demKind[k.kind] || 0) + 1;
    if (!KIND.has(k.kind)) { E(f, k.id, `kind la "${k.kind}"`); continue; }

    // em dash: LOI, khong phai canh bao
    for (const t of moiChu(k)) if (gachNgang(t)) E(f, k.id, `co gach ngang: "${String(t).slice(0, 60)}"`);

    // The HTML chi quet o truong THUC SU la HTML. Khong quet alt, code, template:
    // nhung truong do la van ban thuan va co the chua chu nhu "<module>" lay tu
    // thong bao loi that cua Python. Chung duoc thoat khi dung trang.
    for (const t of chuHtml(k)) {
      if (typeof t !== "string" || !t.includes("<")) continue;
      const xau = theLa(t);
      if (xau.length) E(f, k.id, `the HTML ngoai danh sach: ${xau.join(", ")}`);
    }

    if (k.id) {
      nViec++;
      if (ids.has(k.id)) E(f, k.id, "id trung");
      ids.add(k.id);
      if (!/^bai\d{2}-[a-z]+-\d{2}$/.test(k.id)) E(f, k.id, "id sai dang baiNN-loai-NN");
    }

    if (k.kind === "hinh") {
      nHinh++;
      if (!existsSync(join(ROOT, k.src))) E(f, "", `thieu tep ${k.src}`);
      if (!k.alt || k.alt.length < 20) E(f, "", `hinh ${k.src} thieu alt`);
      if (k.alt && !/[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹý]/i.test(k.alt))
        E(f, "", `alt cua ${k.src} KHONG co dau tieng Viet`);
    }

    if (k.kind === "single_choice") {
      if (!Array.isArray(k.options) || k.options.length < 2 || k.options.length > 6)
        E(f, k.id, `options phai 2..6`);
      if (!(k.answerIndex >= 0 && k.answerIndex < (k.options || []).length))
        E(f, k.id, `answerIndex ngoai dai`);
      if (!k.explanation || k.explanation.length < 15) E(f, k.id, "thieu giai thich visao");
      if (new Set(k.options).size !== (k.options || []).length) E(f, k.id, "co hai lua chon trung nhau");
    }

    if (k.kind === "predict_output") {
      const n = String(k.expectOut).replace(/\n$/, "").split("\n").length;
      if (k.soDong !== n) E(f, k.id, `soDong=${k.soDong} nhung expectOut co ${n} dong`);
      if (!k.code) E(f, k.id, "thieu code");
    }

    if (k.kind === "code_fill" || k.kind === "fill_blank") {
      const t = k.kind === "code_fill" ? k.template : (k.items || []).join("\n");
      const o = [...String(t).matchAll(/\{\{(\d+)\}\}/g)].map((m) => +m[1]);
      const duy = [...new Set(o)].sort((a, b) => a - b);
      if (duy.length !== (k.blanks || []).length)
        E(f, k.id, `co ${duy.length} o nhung blanks co ${(k.blanks || []).length}`);
      if (duy.join(",") !== duy.map((_, i) => i + 1).join(","))
        E(f, k.id, "o {{n}} khong danh so lien tuc tu 1");
      for (const [i, bl] of (k.blanks || []).entries())
        if (!bl.accept || !bl.accept.length || !bl.accept[0].trim())
          E(f, k.id, `blanks[${i}] khong co dap an`);
      if (k.bank && k.bank.length) {
        const thieu = (k.blanks || []).map((x) => x.accept[0]).filter((a) => !k.bank.includes(a));
        if (thieu.length && k.kind === "fill_blank")
          W(f, k.id, `dap an khong co trong ngan hang tu: ${thieu.join(", ")}`);
      }
    }

    // SO HAI NGUON: expectOut phai khop TUNG BYTE voi tep .out trong kho sach
    if (k.kind === "code_fill" && k.chayDuoc) {
      const n = /^bai(\d+)-dien-/.exec(k.id);
      const so = String(d.so).padStart(2, "0");
      const idx = d.khoi.filter((x) => x.kind === "code_fill").indexOf(k) + 1;
      const rel = `bai${so}/lo0${idx}.out`;
      if (!existsSync(join(MA, rel))) E(f, k.id, `thieu ${rel} trong kho sach`);
      else if (readFileSync(join(MA, rel), "utf8") !== k.expectOut)
        E(f, k.id, `expectOut KHONG khop tung byte voi ma/${rel}`);
    }
    if (k.kind === "vidu" && k.out == null) E(f, "", "vidu thieu out");

    if (k.kind === "free_code") {
      if (!k.hints || !k.hints.length) E(f, k.id, "thieu thang goi y");
      // Sach viet dap an bai tu viet theo HAI kieu: vai bai cho han khoi code,
      // phan lon chi ta cach lam bang loi van. Doi phai co code la tieu chi TOI
      // tu dat ra ma nguon khong he co. Cai BAT BUOC la phai co dap an, du dang
      // nao: loi van (goiY) hoac code (loiGiai).
      if (!k.goiY && !k.loiGiai) E(f, k.id, "khong co dap an o dang nao");
      for (const h of k.hints || []) if (!h.hoi) E(f, k.id, "mot bac goi y khong co cau hoi");
    }
    if (k.kind === "guess_text" && !k.reveal) E(f, k.id, "thieu phan may tra loi");
  }

  if (dsViec.length !== b.soViec) E(f, "", `manifest ghi ${b.soViec} viec nhung co ${dsViec.length}`);
  if (dsViec.length !== 14) E(f, "", `co ${dsViec.length} viec, moi bai phai co 14`);
}

// --------------------------------------------------------------- phu luc
for (const p of mf.phuLuc) {
  const d = JSON.parse(readFileSync(join(DATA, p.file), "utf8"));
  for (const k of d.khoi) {
    if (k.kind === "hinh") { nHinh++; if (!existsSync(join(ROOT, k.src))) E(p.file, "", `thieu ${k.src}`); }
    for (const t of moiChu(k)) if (gachNgang(t)) E(p.file, "", `co gach ngang: "${String(t).slice(0, 60)}"`);
  }
  if (p.id === "a") {
    if (!d.muc || d.muc.length < 10) E(p.file, "", `bang tra loi chi co ${(d.muc || []).length} muc`);
    for (const m of d.muc || []) {
      if (!m.khop) E(p.file, "", "mot muc thieu truong khop");
      if (!m.nghiaLa) E(p.file, "", `muc ${m.khop} thieu nghiaLa`);
    }
  }
}

// ------------------------------------------------------------- hinh thua
{
  const dung = new Set();
  for (const b of mf.bai) for (const k of JSON.parse(readFileSync(join(DATA, b.file), "utf8")).khoi)
    if (k.kind === "hinh") dung.add(k.src.split("/").pop());
  for (const p of mf.phuLuc) for (const k of JSON.parse(readFileSync(join(DATA, p.file), "utf8")).khoi)
    if (k.kind === "hinh") dung.add(k.src.split("/").pop());
  const co = readdirSync(join(ROOT, "assets", "hinh"));
  const thua = co.filter((f) => !dung.has(f));
  if (thua.length) W("assets/hinh", "", `${thua.length} tep khong bai nao dung: ${thua.slice(0, 5).join(", ")}`);
}

// --------------------------------------------------------------- tu kiem
let tkHong = 0;
if (TU_KIEM) {
  const ca = [
    ["em dash trong chu", () => gachNgang("mot — hai")],
    ["gach doi trong chu", () => gachNgang("mot -- hai")],
    ["chu sach khong bao nham", () => !gachNgang("so 3-4 con meo")],
    ["the HTML la bi bat", () => theLa('<script>x</script>').includes("script")],
    ["the HTML dung khong bao", () => theLa("<p>a <code>b</code></p>").length === 0],
    ["id sai dang bi bat", () => !/^bai\d{2}-[a-z]+-\d{2}$/.test("bai1-tn-1")],
    ["id dung dang khong bao", () => /^bai\d{2}-[a-z]+-\d{2}$/.test("bai01-tn-02")],
    ["dem o {{n}} dung", () => [...String("{{1}}a{{2}}").matchAll(/\{\{(\d+)\}\}/g)].length === 2],
  ];
  console.log("\n  TU KIEM bo do");
  for (const [ten, f] of ca) {
    let ok = false;
    try { ok = !!f(); } catch { ok = false; }
    if (!ok) tkHong++;
    console.log(`     ${ok ? "✓" : "✗ SOT"}  ${ten}`);
  }
}

// ----------------------------------------------------------------- bao cao
console.log(`\n  CONG LUOC DO\n  ${"-".repeat(52)}`);
console.log(`  ${nKhoi} khoi, ${nViec} viec co cham diem, ${nHinh} tham chieu hinh, ${ids.size} id`);
console.log(`  theo loai: ${Object.entries(demKind).sort().map(([k, v]) => `${k}=${v}`).join("  ")}`);
canh.forEach((c) => console.log("  " + c));
if (loi.length) {
  console.log(`\n  ${loi.length} LOI:`);
  loi.slice(0, 40).forEach((l) => console.log("  " + l));
  if (loi.length > 40) console.log(`  ... va ${loi.length - 40} loi nua`);
}
if (loi.length || tkHong) { console.log("\n  CONG DO.\n"); process.exit(1); }
console.log(`\n  ✓ Hop chuan QIF-PY (${canh.length} canh bao).\n`);
