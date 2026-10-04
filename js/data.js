// data.js - nap manifest va bai. Bust cache theo version trong manifest.
let _mf = null;
const _bai = {};
const _pl = {};

export async function getManifest() {
  if (_mf) return _mf;
  const r = await fetch("data/manifest.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("Không tải được danh sách bài");
  _mf = await r.json();
  return _mf;
}

export function phienBan() { return _mf ? _mf.version || "0" : "0"; }

export async function getBai(so) {
  if (_bai[so]) return _bai[so];
  const mf = await getManifest();
  const b = mf.bai.find((x) => x.so === Number(so));
  if (!b) return null;
  const r = await fetch("data/" + b.file + "?v=" + phienBan());
  if (!r.ok) return null;
  _bai[so] = await r.json();
  return _bai[so];
}

export async function getPhuLuc(id) {
  if (_pl[id]) return _pl[id];
  const mf = await getManifest();
  const p = mf.phuLuc.find((x) => x.id === id);
  if (!p) return null;
  const r = await fetch("data/" + p.file + "?v=" + phienBan());
  if (!r.ok) return null;
  _pl[id] = await r.json();
  return _pl[id];
}

export async function mauChang(n) {
  const mf = await getManifest();
  const c = mf.chang.find((x) => x.id === n);
  return c ? c.mau : "#0E7490";
}
