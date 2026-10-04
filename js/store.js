// store.js - tien do hoc nam HOAN TOAN tren may chau. Khong gui di dau.
// Khong co tai khoan, khong co may chu, khong co theo doi.
const KEY = "pythoncon.progress.v1";
const KEY_THEME = "pythoncon.theme";

function doc() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function ghi(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* che do rieng tu */ }
}
function trong() { return { viec: {}, bai: {}, lanCuoi: null }; }

export function trangThai() {
  const s = doc();
  return { ...trong(), ...s, viec: s.viec || {}, bai: s.bai || {} };
}

// Ghi ket qua mot viec. ket = "dung" | "sai" | "xong" (viec khong cham diem).
export function ghiViec(soBai, idViec, ket) {
  const s = trangThai();
  s.viec[idViec] = { ket, luc: Date.now() };
  s.lanCuoi = Number(soBai);
  ghi(s);
}

export function ketViec(idViec) {
  const v = trangThai().viec[idViec];
  return v ? v.ket : null;
}

// Mot bai goi la xong khi moi viec co id deu da lam.
export function tienDoBai(soBai, dsId) {
  const s = trangThai();
  const lam = dsId.filter((i) => s.viec[i]).length;
  const dung = dsId.filter((i) => s.viec[i] && s.viec[i].ket === "dung").length;
  return { lam, dung, tong: dsId.length, xong: dsId.length > 0 && lam === dsId.length };
}

export function danhDauBai(soBai, dsId) {
  const s = trangThai();
  const td = tienDoBai(soBai, dsId);
  s.bai[soBai] = { lam: td.lam, tong: td.tong, dung: td.dung, xong: td.xong };
  s.lanCuoi = Number(soBai);
  ghi(s);
  return td;
}

export function tomTatBai(soBai) {
  return trangThai().bai[soBai] || null;
}

export function lanCuoi() { return trangThai().lanCuoi; }

export function xoaHet() { ghi(trong()); }

export function xoaBai(dsId) {
  const s = trangThai();
  for (const i of dsId) delete s.viec[i];
  ghi(s);
}

// ---------------------------------------------------------------- giao dien
export function layTheme() {
  try { return localStorage.getItem(KEY_THEME); } catch { return null; }
}
export function datTheme(t) {
  try { localStorage.setItem(KEY_THEME, t); } catch { /* bo qua */ }
  document.documentElement.dataset.theme = t;
}
