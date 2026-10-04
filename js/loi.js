// loi.js - doi loi Python sang tieng Viet, tra tu PHU LUC A cua chinh quyen sach.
// Khong co trong bang thi hien NGUYEN VAN loi cua Python. Khong bia loi giai thich.
import { getPhuLuc } from "./data.js";

let bang = null;

export async function napBang() {
  if (bang) return bang;
  const a = await getPhuLuc("a");
  bang = (a && a.muc) || [];
  return bang;
}

// Lay dong cuoi cua traceback, la dong noi ro loai loi.
export function dongLoi(raw) {
  const d = String(raw || "").trim().split("\n").filter((x) => x.trim());
  return d.length ? d[d.length - 1].trim() : "";
}

// Tra ve { dong, nghiaLa, sua } hoac { dong } neu khong tra duoc.
export function tra(raw) {
  const dong = dongLoi(raw);
  if (!bang || !dong) return { dong };
  // uu tien muc co chuoi khop dai nhat, de "IndentationError" khong bi
  // "Error" chung chung nuot mat.
  let tot = null;
  for (const m of bang) {
    if (!m.khop) continue;
    if (dong.includes(m.khop) && (!tot || m.khop.length > tot.khop.length)) tot = m;
  }
  return tot ? { dong, nghiaLa: tot.nghiaLa, sua: tot.sua, mau: tot.mau } : { dong };
}
