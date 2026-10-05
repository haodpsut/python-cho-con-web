#!/usr/bin/env node
// kiem-het.mjs - chay ca tam cong, in gio tung cai.
// Chay: node tools/kiem-het.mjs [--tu-kiem]
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const TU_KIEM = process.argv.includes("--tu-kiem");

const CONG = [
  ["boc.mjs",            false, "boc LaTeX ra JSON, in do phu"],
  ["validate.mjs",       true,  "luoc do, em dash, so .out hai nguon"],
  ["kiem-sach.mjs",      true,  "so chu web voi 6 PDF sach in"],
  ["kiem-hinh.mjs",      true,  "45 hinh vs ban PDF, do tren anh"],
  ["kiem-chay.mjs",      true,  "191 chuong trinh trong Chrome that"],
  ["kiem-khop.mjs",      true,  "hinh dung bai, o ket qua khop ma tren trang"],
  ["kiem-web.mjs",       false, "32 bai + 4 phu luc, dau vet LaTeX sot"],
  ["kiem-tuong-tac.mjs", false, "lai that qua 6 loai bai tap + kho dien thoai"],
];

const t0 = Date.now();
const ra = [];
let hong = 0;
for (const [tep, coTuKiem, mo] of CONG) {
  const dau = Date.now();
  process.stdout.write(`  ${tep.padEnd(20)} ${mo} ... `);
  const r = spawnSync(process.execPath,
    [join(HERE, tep), ...(TU_KIEM && coTuKiem ? ["--tu-kiem"] : [])],
    { encoding: "utf8" });
  const giay = ((Date.now() - dau) / 1000).toFixed(1);
  const ok = r.status === 0;
  if (!ok) hong++;
  console.log(`${ok ? "✓" : "✗ HONG"}  ${giay}s`);
  ra.push({ tep, ok, giay, log: (r.stdout || "") + (r.stderr || "") });
}

console.log(`\n  ${"-".repeat(56)}`);
console.log(`  ${CONG.length - hong}/${CONG.length} cong xanh, tong ${((Date.now() - t0) / 1000).toFixed(1)} giay`
  + (TU_KIEM ? "  (co ca tiem loi)" : "  (chay nhanh, them --tu-kiem de bat ca tiem loi)"));
if (hong) {
  for (const r of ra.filter((x) => !x.ok)) {
    console.log(`\n  ===== ${r.tep} =====`);
    console.log(r.log.split("\n").slice(-25).join("\n"));
  }
  process.exit(1);
}
console.log("");
