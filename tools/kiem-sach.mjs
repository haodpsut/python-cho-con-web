#!/usr/bin/env node
// kiem-sach.mjs - CONG SO HAI NGUON THAT SU DOC LAP:
//   nguon 1 = data/*.json do bo boc cua toi sinh ra
//   nguon 2 = sau tep PDF quyen chau, do LaTeX dung, KHONG qua bo boc cua toi
//
// Moi cong khac deu doc tu cung mot bo boc, nen neu bo boc hieu sai mot macro
// thi ca loat cong cung sai theo ma khong cai nao biet. Cong nay doc chu tu
// PDF bang pdftotext roi hoi: cau hoi va lua chon tren web co THAT SU co
// trong sach in khong.
//
// Chay: node tools/kiem-sach.mjs [--tu-kiem]
import { readFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const TU_KIEM = process.argv.includes("--tu-kiem");
const TMP = join(ROOT, "tools", ".kiem-sach");

// Sau tep PDF quyen chau. Tim o kho sach truoc, roi toi Downloads.
const NOI = [join(ROOT, "..", "python-cho-con", "sach"), join(process.env.HOME, "Downloads", "for-win")];
let thuMuc = NOI.find((d) => existsSync(join(d, "main-tap1-cho-con.pdf")));
if (!thuMuc) {
  // giai nen tu for-win.zip neu co
  const zip = join(process.env.HOME, "Downloads", "for-win.zip");
  if (existsSync(zip)) {
    rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true });
    execFileSync("unzip", ["-o", "-q", zip, "-d", TMP]);
    thuMuc = TMP;
  }
}
if (!thuMuc) {
  console.error("  Khong tim thay sau tep PDF quyen chau (main-tapN-cho-con.pdf).");
  console.error("  Dat chung o python-cho-con/sach/ hoac giu Downloads/for-win.zip.");
  process.exit(2);
}

// --- doc chu tu sau quyen PDF
let chuSach = "";
for (let i = 1; i <= 6; i++) {
  const p = join(thuMuc, `main-tap${i}-cho-con.pdf`);
  if (!existsSync(p)) { console.error(`  Thieu ${p}`); process.exit(2); }
  const ra = join(TMP, `tap${i}.txt`);
  mkdirSync(TMP, { recursive: true });
  execFileSync("pdftotext", ["-enc", "UTF-8", p, ra]);
  chuSach += readFileSync(ra, "utf8") + "\n";
}

// Hai ham chuan hoa KHAC NHAU, va day la cho tung lam bo do nay bao nham 90 lan.
//
// ⛔ Khong duoc ap luat bo the HTML len chu lay tu PDF. Chu trong sach co
//    "<class 'int'>", trong y het mot the HTML, nen bi nuot mat sach.
//
// Ba cho khac cung tung lam bao nham:
//   sach in dung … (U+2026) cho \dots, con JSON dung ba dau cham
//   doi nhay don cong thanh nhay KEP se pha "'int'"; phai ve nhay don thang
//   bo the HTML de lai dau cach thua: "a + 3, hộp" thanh "a + 3 , hộp"
// Nen BO HAN khoang trang khi so. Chuoi tu 20 ky tu tro len van du dac trung.
function chungChung(s) {
  return String(s)
    .replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2026/g, "...").replace(/\u2212/g, "-")
    .replace(/\s+/g, "")
    .trim();
}
// Ben WEB: la HTML, phai go the va giai ma thuc the.
function chuanWeb(s) {
  return chungChung(String(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
}
// Ben SACH: la chu thuan tu pdftotext, KHONG go the, KHONG giai ma thuc the.
function chuanSach(s) { return chungChung(s); }

const sach = chuanSach(chuSach);

const loi = [], bo = [];
let nCau = 0, nLuaChon = 0, nTimThay = 0;

const mf = JSON.parse(readFileSync(join(DATA, "manifest.json"), "utf8"));
for (const b of mf.bai) {
  const d = JSON.parse(readFileSync(join(DATA, b.file), "utf8"));
  const t = `bai ${d.so}`;

  // ten bai phai co trong sach in
  if (!sach.includes(chuanWeb(d.ten))) loi.push(`✗ ${t}: ten bai "${d.ten}" khong co trong sach in`);

  for (const k of d.khoi) {
    if (k.kind !== "single_choice") continue;
    nCau++;
    const cau = chuanWeb(k.stem);
    // cau hoi dai thi so nguyen van; cau ngan de trung nen bo qua
    if (cau.length >= 12) {
      if (sach.includes(cau)) nTimThay++;
      else loi.push(`✗ ${t} ${k.id}: cau hoi KHONG co trong sach in: "${cau.slice(0, 70)}"`);
    } else bo.push(`${k.id} (cau hoi ngan ${cau.length} ky tu)`);

    for (const o of k.options) {
      const lc = chuanWeb(o);
      nLuaChon++;
      if (lc.length < 5) continue;          // lua chon qua ngan thi khong so
      if (!sach.includes(lc))
        loi.push(`✗ ${t} ${k.id}: lua chon KHONG co trong sach in: "${lc.slice(0, 60)}"`);
    }
  }
}

// TU KIEM: bia mot cau khong co trong sach, cong phai bao.
let tkHong = 0;
if (TU_KIEM) {
  const ca = [
    ["cau bia dat phai bi bat", "Con hay bam nut mau tim de goi con meo Mun ra khoi may tinh", false],
    ["cau that phai duoc nhan", "Máy in ra dòng nào khi con chạy", true],
    ["doi mot chu trong cau that phai bi bat", "Máy in ra dòng nào khi con chạu", false],
  ];
  console.log("\n  TU KIEM bo do");
  for (const [ten, chuoi, mong] of ca) {
    const co = sach.includes(chuanSach(chuoi));
    if (co !== mong) { tkHong++; console.log(`     ✗ SOT  ${ten}`); }
    else console.log(`     ✓  ${ten}`);
  }
}

console.log(`\n  CONG SO VOI SACH IN\n  ${"-".repeat(52)}`);
console.log(`  doc ${(chuSach.length / 1024).toFixed(0)} KB chu tu 6 tep PDF quyen chau`);
console.log(`  doi chieu ${nCau} cau hoi va ${nLuaChon} lua chon`);
console.log(`  ${nTimThay}/${nCau - bo.length} cau hoi dai tim thay nguyen van trong sach in`);
if (bo.length) console.log(`  ${bo.length} cau hoi qua ngan nen khong so`);
if (loi.length) {
  console.log(`\n  ${loi.length} LOI:`);
  loi.slice(0, 30).forEach((l) => console.log("  " + l));
  if (loi.length > 30) console.log(`  ... va ${loi.length - 30} loi nua`);
}
if (loi.length || tkHong) { console.log("\n  CONG DO.\n"); process.exit(1); }
console.log(`\n  ✓ Chu tren web khop sach in, doi chieu bang nguon doc lap.\n`);
