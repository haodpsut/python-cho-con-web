// chay.js - noi trang voi Web Worker chay Python.
// Nap LUOI: chi tai Pyodide khi chau bam Chay lan dau.
// GIET sau HAN mili giay roi dung worker moi, vi chau se viet while True.

const HAN = 5000;
let w = null;
let dem = 0;
let dangNap = null;
let daNap = false;
const nghe = new Set();

function moiWorker() {
  if (w) w.terminate();
  w = new Worker("js/worker.js", { type: "module" });
  w.onerror = () => { /* bao o tung lan chay */ };
}

export function daSanSang() { return daNap; }
export function khiDoiTrangThai(f) { nghe.add(f); return () => nghe.delete(f); }
function bao(t) { for (const f of nghe) f(t); }

export function nap() {
  if (daNap) return Promise.resolve();
  if (dangNap) return dangNap;
  bao("dang-nap");
  if (!w) moiWorker();
  const id = ++dem;
  dangNap = new Promise((xong, hong) => {
    const h = (e) => {
      if (e.data.id !== id) return;
      w.removeEventListener("message", h);
      if (e.data.loai === "san-sang") { daNap = true; bao("san-sang"); xong(); }
      else { dangNap = null; bao("hong"); hong(new Error(e.data.loi || "không nạp được Python")); }
    };
    w.addEventListener("message", h);
    w.postMessage({ id, loai: "nap" });
  });
  return dangNap;
}

// Tra ve { ra, loi, hetGio }.  Khong bao gio nem loi.
export async function chay(ma, stdin) {
  try { await nap(); }
  catch (e) { return { ra: "", loi: String(e.message || e), hetGio: false }; }

  const id = ++dem;
  return new Promise((xong) => {
    let roi = false;
    const gio = setTimeout(() => {
      if (roi) return;
      roi = true;
      moiWorker();            // giet han, roi dung cai moi
      daNap = false; dangNap = null; bao("da-giet");
      xong({ ra: "", loi: null, hetGio: true });
    }, HAN);

    const h = (e) => {
      if (e.data.id !== id || roi) return;
      roi = true;
      clearTimeout(gio);
      w.removeEventListener("message", h);
      xong({ ra: e.data.ra || "", loi: e.data.loi || null, hetGio: false });
    };
    w.addEventListener("message", h);
    w.postMessage({ id, loai: "chay", ma, stdin: stdin ?? null });
  });
}
