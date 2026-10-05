// to-ma.js - to mau code Python theo DUNG bang mau cua sach giay:
//   tu cua may  tim  #7C3AED   (macro \tumay)
//   chu may in  do   #C62828   (macro \chuin)
//   loi ghi chu xanh #15803D   (macro \ghichu)
// Khong nap thu vien to mau nao ca, va cung khong can: bai trong sach chi
// dung mot phan nho cua Python.
//
// Ham nay THUAN, tra ve chuoi HTML da thoat. Dung cho khoi code chi doc.

const TU_MAY = new Set([
  "False", "None", "True", "and", "as", "break", "class", "continue", "def",
  "del", "elif", "else", "except", "finally", "for", "from", "global", "if",
  "import", "in", "is", "lambda", "not", "or", "pass", "raise", "return",
  "try", "while", "with", "yield",
  // nhung nut bam co san ma sach co day
  "print", "input", "int", "str", "float", "len", "range", "list", "map",
  "sum", "min", "max", "abs", "round", "sorted", "type", "math",
]);

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function toMa(ma) {
  let r = "";
  const s = String(ma);
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    // loi ghi chu: tu dau thang toi het dong
    if (c === "#") {
      const k = s.indexOf("\n", i);
      const het = k < 0 ? s.length : k;
      r += `<span class="m-ghichu">${esc(s.slice(i, het))}</span>`;
      i = het;
      continue;
    }

    // chu may se in ra: nam giua hai dau nhay. Co chuoi f cung tinh.
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < s.length && s[j] !== c) { if (s[j] === "\\") j++; j++; }
      j = Math.min(j + 1, s.length);
      // chu f ngay truoc dau nhay thi gom vao luon
      let dau = i;
      if (i > 0 && /[fF]/.test(s[i - 1]) && !/[A-Za-z0-9_]/.test(s[i - 2] || " ")) {
        r = r.slice(0, r.length - 1);
        dau = i - 1;
      }
      r += `<span class="m-chuin">${esc(s.slice(dau, j))}</span>`;
      i = j;
      continue;
    }

    // ten hoac tu khoa
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      const tu = s.slice(i, j);
      r += TU_MAY.has(tu) ? `<span class="m-tumay">${esc(tu)}</span>` : esc(tu);
      i = j;
      continue;
    }

    // so
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      r += `<span class="m-so">${esc(s.slice(i, j))}</span>`;
      i = j;
      continue;
    }

    r += esc(c);
    i++;
  }
  return r;
}
