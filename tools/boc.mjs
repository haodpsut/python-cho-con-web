#!/usr/bin/env node
// boc.mjs - boc 32 bai LaTeX ra JSON. Chay: node tools/boc.mjs
// Nguon: ../python-cho-con/sach/bai/*.tex va ../python-cho-con/ma/
// In DO PHU va thoat 1 neu bat ky hang muc nao chua du 100%.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "..", "python-cho-con");
const BAI = join(SRC, "sach", "bai");
const MA = join(SRC, "ma");
const HINH = join(SRC, "sach", "hinh");
const OUT = join(ROOT, "data");

const loi = [];
function err(m) { loi.push(m); }

// ---------------------------------------------------------------- tien ich
// Tach doi so {...} can bang ngoac bat dau tai vi tri dau '{'.
function doiSo(s, i) {
  if (s[i] !== "{") return null;
  let d = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "\\") { j++; continue; }
    if (s[j] === "{") d++;
    else if (s[j] === "}") { d--; if (d === 0) return { noi: s.slice(i + 1, j), het: j + 1 }; }
  }
  return null;
}

// Doc doi so tuy chon [..] roi doi so bat buoc {..}
function sauLenh(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  let tuyChon = null;
  if (s[i] === "[") {
    const k = s.indexOf("]", i);
    if (k > 0) { tuyChon = s.slice(i + 1, k); i = k + 1; }
  }
  while (i < s.length && /\s/.test(s[i])) i++;
  return { tuyChon, i };
}

// Cat moi truong \begin{ten} ... \end{ten} (khong long nhau cung ten).
function moiTruong(tex, ten) {
  const ra = [];
  const b = `\\begin{${ten}}`, e = `\\end{${ten}}`;
  let i = 0;
  while (true) {
    const s = tex.indexOf(b, i);
    if (s < 0) break;
    const t = tex.indexOf(e, s);
    if (t < 0) { err(`thieu \\end{${ten}}`); break; }
    ra.push({ noi: tex.slice(s + b.length, t), dau: s, cuoi: t + e.length });
    i = t + e.length;
  }
  return ra;
}

// Bo khoang trang cuoi dong va dong trong cuoi tep, de so hai nguon cho cong bang.
function chuanHoa(s) {
  return s.replace(/[ \t]+$/gm, "").replace(/\n+$/, "");
}

function thoatHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// -------------------------------------------------- chu noi tuyen -> HTML
// Xu ly \ma \textbf \textit \tenbe \dots \ldots va cac dau thoat.
// Macro la thi BAO LOI chu khong bo qua im lang.
const MACRO_BIET = new Set([
  "ma", "textbf", "textit", "emph", "tenbe", "dots", "ldots", "tumay", "chuin",
  "ghichu", "oo", "tukhoa", "tick", "visao", "quad", "qquad", ",", ";", "!",
]);
// Macro chi doi kieu chu, gap trong nhan cua \node khi dung alt. Bo han.
const MACRO_KIEU = new Set([
  "mdseries", "bfseries", "ttfamily", "rmfamily", "sffamily", "itshape",
  "upshape", "normalfont", "tiny", "scriptsize", "footnotesize", "small",
  "normalsize", "large", "Large", "huge", "strut", "relax", "n", "r",
]);

function vanHtml(tex, ngu, { choPhepOo = false, oo = null, nheTay = false } = {}) {
  let r = "";
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === "\\") {
      // dau thoat mot ky tu
      const k = tex[i + 1];
      if (k && "%$&#_{}".includes(k)) { r += thoatHtml(k); i += 2; continue; }
      if (k === "\\") {
        let j2 = i + 2;
        while (j2 < tex.length && /\s/.test(tex[j2])) j2++;
        if (tex[j2] === "[") { const e = tex.indexOf("]", j2); if (e > 0) j2 = e + 1; } else j2 = i + 2;
        r += "<br>"; i = j2; continue;
      }
      const m = /^\\([a-zA-Z]+)\*?/.exec(tex.slice(i));
      if (!m) { i++; continue; }
      const ten = m[1];
      let j = i + m[0].length;
      if (ten === "dots" || ten === "ldots") { r += "..."; i = j; continue; }
      if (ten === "tenbe") { r += ngu.tenbe; i = j; if (tex.slice(i, i + 2) === "{}") i += 2; continue; }
      if (["quad", "qquad"].includes(ten)) { r += " "; i = j; continue; }
      if (MACRO_KIEU.has(ten)) { i = j; continue; }
      const a = doiSo(tex, (sauLenh(tex, j), j > 0 && tex[j] === "{" ? j : skipWs(tex, j)));
      if (!a) {
        if (!MACRO_BIET.has(ten) && !nheTay) err(`macro la \\${ten} trong van xuoi`);
        i = j; continue;
      }
      const noi = a.noi;
      if (ten === "ma" || ten === "texttt") r += `<code>${vanHtml(noi, ngu, { choPhepOo, oo, nheTay })}</code>`;
      else if (ten === "textbf") r += `<b>${vanHtml(noi, ngu, { choPhepOo, oo, nheTay })}</b>`;
      else if (ten === "textit" || ten === "emph") r += `<i>${vanHtml(noi, ngu, { choPhepOo, oo, nheTay })}</i>`;
      else if (ten === "tumay") r += `<span class="tumay">${vanHtml(noi, ngu, { nheTay })}</span>`;
      else if (ten === "chuin") r += `<span class="chuin">${vanHtml(noi, ngu, { nheTay })}</span>`;
      else if (ten === "ghichu") r += `<span class="ghichu">${vanHtml(noi, ngu, { nheTay })}</span>`;
      else if (ten === "tukhoa") r += vanHtml(noi, ngu, { nheTay });
      else if (ten === "oo") {
        if (!choPhepOo) { err("gap \\oo ngoai cho cho phep"); }
        else { oo.push(vanTho(noi, ngu)); r += `{{${oo.length}}}`; }
      } else {
        if (!MACRO_BIET.has(ten) && !nheTay) err(`macro la \\${ten}`);
        r += vanHtml(noi, ngu, { choPhepOo, oo, nheTay });
      }
      i = a.het;
      continue;
    }
    if (c === "~") { r += " "; i++; continue; }
    if (c === "%") { const k = tex.indexOf("\n", i); i = k < 0 ? tex.length : k + 1; continue; }
    r += thoatHtml(c);
    i++;
  }
  return r;
}
function skipWs(s, i) { while (i < s.length && /\s/.test(s[i])) i++; return i; }

// Van tho: bo moi macro, chi lay chu. Dung cho dap an o trong.
function vanTho(tex, ngu, nheTay = false) {
  return vanHtml(tex, ngu, { nheTay }).replace(/<[^>]+>/g, "").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
}

// Macro chi de dan trang, bo han khong anh huong noi dung.
const BO_HAN = /\\(clearpage|newpage|par|noindent|centering|bfseries|large|normalsize|small|footnotesize|toprule|midrule|bottomrule|endfirsthead|endhead|hline)\b/g;
const BO_CO_DOISO = ["setlength", "renewcommand", "vspace", "hspace", "needspace", "label", "index", "color", "arraystretch", "itemsep"];

// Toan hoc don gian, chi gap o phu luc C. Doi sang chu doc duoc, khong nap thu vien.
function congThuc(s) {
  let t = s;
  t = t.replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, "($1) / ($2)");
  t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1) / ($2)");
  t = t.replace(/\\left|\\right/g, "");
  t = t.replace(/\\times/g, "×").replace(/\\cdot/g, "·").replace(/\\mid/g, "|");
  t = t.replace(/\\log/g, "log").replace(/\\ln/g, "ln").replace(/\\sqrt/g, "căn");
  t = t.replace(/\\dots|\\ldots|\\cdots/g, "...");
  t = t.replace(/\\[,;!quad]+/g, " ");
  t = t.replace(/\^\{([^{}]*)\}/g, (m, p) => `<sup>${thoatHtml(p)}</sup>`);
  t = t.replace(/\^(\w)/g, (m, p) => `<sup>${thoatHtml(p)}</sup>`);
  t = t.replace(/_\{([^{}]*)\}/g, (m, p) => `<sub>${thoatHtml(p)}</sub>`);
  t = t.replace(/[{}]/g, "");
  return `<span class="ct">${t.replace(/\s+/g, " ").trim()}</span>`;
}

// Bang longtable / tabular -> <table>. Hang dau la tieu de.
function bang(noi, ngu) {
  const sach = noi.replace(BO_HAN, "").replace(/\\\\\s*\\\\/g, "\\\\");
  const hang = sach.split(/\\\\/).map((h) => h.trim()).filter((h) => h && !/^[\s&]*$/.test(h));
  if (!hang.length) return "";
  const o = hang.map((h) => h.split(/(?<!\\)&/).map((c) => vanHtml(c, ngu).trim()));
  // longtable khai dong tieu de HAI lan, mot cho \endfirsthead mot cho
  // \endhead. Tren web bang khong ngat trang nen phai bo ban lap, neu khong
  // chau se thay "Từ | Để làm gì | Bài" hien ra hai lan lien nhau.
  const khoaDau = o[0].join("\u0001");
  const than = o.slice(1).filter((r) => r.join("\u0001") !== khoaDau);
  const dau = o[0].map((c) => `<th>${c}</th>`).join("");
  const thanHtml = than.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n");
  return `<div class="bang-cuon"><table><thead><tr>${dau}</tr></thead><tbody>\n${thanHtml}\n</tbody></table></div>`;
}

// Dung van xuoi co khoi: danh sach, bang, center, \mucno, cong thuc.
function doan(tex, ngu, opt = {}) {
  let t = tex;

  // Phai lam TRUOC khi go cac macro doi kieu chu, neu khong thi khi chung bien
  // mat se con tro lai "{ chu }" tro ngoac.
  t = t.replace(/\{\s*(?:\\(?:color|bfseries|large|Large|itshape|ttfamily|small|footnotesize|normalsize|mdseries|sffamily|rmfamily)\b(?:\{[^{}]*\})?\s*)+([^{}]*?)\s*\}/g,
    (m, c) => c);

  // bo macro dan trang co doi so
  for (const m of BO_CO_DOISO) {
    const re = new RegExp(`\\\\${m}\\s*`, "g");
    let s;
    while ((s = re.exec(t)) !== null) {
      let i = s.index + s[0].length;
      let het = i;
      while (t[het] === "{") { const a = doiSo(t, het); if (!a) break; het = a.het; }
      t = t.slice(0, s.index) + t.slice(het);
      re.lastIndex = 0;
    }
  }
  t = t.replace(/\{\\color\{[^}]*\}([^{}]*)\}/g, "$1");
  t = t.replace(BO_HAN, "");
  // (luat nhom ngoac da chay o dau ham)
  // CHU Y: khong duoc bo ngoac mot cach chung chung. Ngoac trong LaTeX la doi
  // so cua macro, bo bua se cat mat noi dung: \textbf{không} tung bi bien
  // thanh "ông" vi kieu sua ay.
  // Chi xu ly dung mot the: nhom MO DAU bang cac macro doi kieu chu, nhu
  // {\color{\maubai}\bfseries\large Bảng thứ hai}.


  const phan = [];
  const giuCho = (html) => { phan.push(html); return `\u0000${phan.length - 1}\u0000`; };

  // bang. Thay TUNG cai mot roi quet lai, vi thay roi thi vi tri cu lech het.
  for (const ten of ["longtable", "tabularx", "tabular"]) {
    for (let e; (e = moiTruong(t, ten)[0]);) {
      let noi = e.noi;
      // bo phan khai cot, vi du {@{}p{3.2cm}p{7cm}@{}}
      const k = skipWs(noi, 0);
      if (noi[k] === "{") { const a = doiSo(noi, k); if (a) noi = noi.slice(a.het); }
      t = t.slice(0, e.dau) + giuCho(bang(noi, ngu)) + t.slice(e.cuoi);
    }
  }
  // danh sach
  for (const [ten, the] of [["enumerate", "ol"], ["itemize", "ul"]]) {
    let e;
    while ((e = moiTruong(t, ten)[0])) {
      const li = [...e.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)]
        .map((m) => `<li>${doan(m[1], ngu, opt).replace(/^<p>|<\/p>$/g, "").trim()}</li>`).join("\n");
      t = t.slice(0, e.dau) + giuCho(`<${the}>\n${li}\n</${the}>`) + t.slice(e.cuoi);
    }
  }
  // center
  for (let e; (e = moiTruong(t, "center")[0]);) {
    t = t.slice(0, e.dau) + giuCho(`<div class="giua">${doan(e.noi, ngu, opt)}</div>`) + t.slice(e.cuoi);
  }
  // \mucno{C.1}{Tieu de}
  t = t.replace(/\\mucno\s*\{([^}]*)\}\s*\{([^}]*)\}/g,
    (m, so, ten) => giuCho(`<h4>${so} ${vanHtml(ten, ngu)}</h4>`));
  // cong thuc $...$
  t = t.replace(/\$([^$]+)\$/g, (m, c) => giuCho(congThuc(c)));

  const ra = t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    // doan chi chua giu cho khoi thi khong boc <p>
    const chi = p.replace(/\u0000\d+\u0000/g, "").trim();
    const html = vanHtml(p, ngu).trim();
    return chi === "" ? html : `<p>${html}</p>`;
  }).join("\n");

  return ra.replace(/\u0000(\d+)\u0000/g, (m, i) => phan[+i]);
}


// Hinh KHONG co chu tieng Viet nao ben trong thi phai khai alt bang tay o day.
// Hien chi co mot: bang tram o, trong hinh chi co so 1 toi 100.
const ALT_TAY = {
  "hinh-plD-bangtram": "Bảng một trăm ô, đánh số từ 1 đến 100, xếp mười hàng mười cột, để con gạch sàng bằng bút chì.",
};

// alt cho hinh. KHONG lay dong chu thich % dau tep: ca 45 tep deu viet KHONG
// DAU ("hai cua so cua IDLE"), dua len trang tieng Viet co dau la sai.
// Lay chu that ben trong hinh, vi chu ay co dau day du.
function altHinh(tex, ngu) {
  const chu = [];
  for (const m of tex.matchAll(/\\node\b/g)) {
    // nhan cua \node la nhom ngoac CUOI cung truoc dau cham phay
    let i = m.index + 5, sau = null;
    let d = 0, trongNgoac = false;
    for (; i < tex.length; i++) {
      const c = tex[i];
      if (c === "\\") { i++; continue; }
      if (c === "{") { if (d === 0) sau = i; d++; trongNgoac = true; }
      else if (c === "}") { d--; if (d === 0) { const a = doiSo(tex, sau); if (a) { sau = a; } } }
      else if (c === ";" && d === 0) break;
    }
    if (sau && typeof sau === "object") {
      const t = vanTho(sau.noi, ngu, true).replace(/\s+/g, " ").trim();
      if (t && t.length <= 70) chu.push(t);
    }
  }
  const gon = [...new Set(chu)].filter(Boolean);
  if (!gon.length) return "";
  const co = /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹý]/i;
  if (!gon.some((t) => co.test(t))) return "";   // khong co chu tieng Viet co dau
  return "Hình trong sách. Chữ trong hình: " + gon.slice(0, 14).join("; ") + ".";
}

// ------------------------------------------------- khoi code codelo -> py
// Tra ve { template, blanks[], chuIn[] }. \oo thanh {{n}}.
function bocCodelo(noi, ngu) {
  const dong = [];
  const blanks = [];
  const chuIn = [];
  let i = 0;
  while (true) {
    const k = noi.indexOf("\\dong", i);
    if (k < 0) break;
    const a = doiSo(noi, skipWs(noi, k + 5));
    if (!a) { err("\\dong khong co doi so"); break; }
    // \dong{...} co the XUONG DONG giua chung trong .tex cho vua be ngang trang.
    // Gop lai thanh mot dong, neu khong se lech voi tep .py.
    const tho = a.noi.replace(/\n\s*/g, " ");
    // \dong{~} la mot DONG TRONG, khong phai dau cach.
    dong.push(tho.trim() === "~" ? "" : maDong(tho, ngu, blanks, chuIn));
    i = a.het;
  }
  return { template: dong.join("\n"), blanks, chuIn };
}

// Mot dong code: \thut, \thut[n], \tumay, \oo, \chuin, \ghichu, dau thoat.
function maDong(tex, ngu, blanks, chuIn) {
  let r = "";
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === "\\") {
      const k = tex[i + 1];
      if (k && "%$&#_{}".includes(k)) { r += k; i += 2; continue; }
      const m = /^\\([a-zA-Z]+)/.exec(tex.slice(i));
      if (!m) { i++; continue; }
      const ten = m[1];
      let j = i + m[0].length;
      if (ten === "thut") {
        const s = sauLenh(tex, j);
        const n = s.tuyChon ? parseInt(s.tuyChon, 10) : 1;
        r += "    ".repeat(n);
        i = s.i;
        continue;
      }
      if (ten === "tenbe") { r += ngu.tenbe; i = j; if (tex.slice(i, i + 2) === "{}") i += 2; continue; }
      const a = doiSo(tex, skipWs(tex, j));
      if (!a) { err(`macro \\${ten} trong code khong co doi so`); i = j; continue; }
      if (ten === "oo") {
        // LONG MACRO: \tumay{\oo{break}} cung phai bat duoc.
        blanks.push({ accept: [maDong(a.noi, ngu, [], [])] });
        r += `{{${blanks.length}}}`;
      } else if (ten === "chuin") {
        const t = maDong(a.noi, ngu, blanks, chuIn);
        chuIn.push(t);
        r += t;
      } else if (["tumay", "ghichu"].includes(ten)) {
        r += maDong(a.noi, ngu, blanks, chuIn);
      } else {
        err(`macro la \\${ten} trong khoi code`);
        r += maDong(a.noi, ngu, blanks, chuIn);
      }
      i = a.het;
      continue;
    }
    r += c;
    i++;
  }
  return r;
}

// -------------------------------------------------------------- nap nguon
function doc(p) { return readFileSync(p, "utf8"); }
function docMa(rel) {
  const p = join(MA, rel);
  if (!existsSync(p)) { err(`thieu tep ma/${rel}`); return null; }
  return doc(p);
}

const dem = {
  bai: 0, tn: 0, visao: 0, doan: 0, vidu: 0, codelo: 0, oo: 0, tuviet: 0,
  guess: 0, hinh: 0, hinhPl: 0, py: 0, out: 0, dapan: 0, proseFill: 0,
};

const TEN_CHANG = {
  changMot: 1, changHai: 2, changBa: 3, changBon: 4, changNam: 5, changSau: 6,
};

function bocBai(n, ngu) {
  const sn = String(n).padStart(2, "0");
  const tex = doc(join(BAI, `bai${sn}.tex`));
  const khoi = [];
  let nid = 0;
  const id = (loai) => `bai${sn}-${loai}-${String(++nid).padStart(2, "0")}`;

  // --- \mobai
  const mo = /\\mobai\{(\d+)\}\{/.exec(tex);
  if (!mo) { err(`bai${sn}: khong thay \\mobai`); return null; }
  const tenA = doiSo(tex, mo.index + mo[0].length - 1);
  const changA = doiSo(tex, skipWs(tex, tenA.het));
  const ten = vanTho(tenA.noi, ngu);
  const chang = TEN_CHANG[changA.noi.trim()];
  if (!chang) err(`bai${sn}: chang la "${changA.noi}"`);
  dem.bai++;

  // Khong boc "khai niem moi" tu dong chu thich %: chu thich trong sach viet
  // KHONG DAU (vi du "dau nhay kep"), dua len trang tieng Viet co dau la sai.
  const khaiNiemMoi = [];

  // --- hocgi
  const hg = moiTruong(tex, "hocgi")[0];
  if (!hg) err(`bai${sn}: thieu hocgi`);
  else {
    const items = [...hg.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|\\end\{itemize\}|$)/g)]
      .map((m) => vanHtml(m[1], ngu).trim()).filter(Boolean);
    if (!items.length) err(`bai${sn}: hocgi rong`);
    khoi.push({ kind: "muc_tieu", items });
  }

  // --- thudoan  (reveal lay tu khoi dap an, xu ly sau)
  const td = moiTruong(tex, "thudoan")[0];
  let guessId = null;
  if (!td) err(`bai${sn}: thieu thudoan`);
  else {
    guessId = id("guess");
    khoi.push({ kind: "guess_text", id: guessId, html: doan(td.noi, ngu), reveal: "" });
    dem.guess++;
  }

  // --- than bai: quet tuan tu tu sau thudoan toi \muc{Chọn đáp án đúng}
  const than = tex.slice(td ? td.cuoi : 0, tex.indexOf("\\muc{Chọn đáp án đúng}"));
  quetThan(than, khoi, ngu, sn);

  // --- tracnghiem
  const tn = moiTruong(tex, "tracnghiem")[0];
  if (!tn) err(`bai${sn}: thieu tracnghiem`);
  else {
    for (const q of bocTracNghiem(tn.noi, ngu, sn)) { q.id = id("tn"); khoi.push(q); }
  }

  // --- doan ket qua
  khoi.push({ kind: "van", heading: "Máy in ra gì", html: "<p>Đọc chương trình rồi đoán xem máy in ra gì. Đoán xong hãy bấm Chạy để so.</p>" });
  for (const m of tex.matchAll(/\\doan\{([^}]+)\}/g)) {
    const rel = m[1];
    const py = docMa(rel + ".py"), out = docMa(rel + ".out");
    if (py === null || out === null) continue;
    dem.py++; dem.out++; dem.doan++;
    khoi.push({
      kind: "predict_output", id: id("doan"), code: py.replace(/\n$/, ""),
      expectOut: out, soDong: out.replace(/\n$/, "").split("\n").length,
      stdin: stdinCho(rel, py),
    });
  }

  // --- phan dien
  bocPhanDien(tex, khoi, ngu, sn, id);

  // --- tu viet
  bocTuViet(tex, khoi, ngu, sn, id);

  // --- dap an: gan reveal cho thudoan + hints cho tu viet
  ganDapAn(tex, khoi, ngu, sn, guessId);

  return { schemaVersion: "1.0", so: n, ten, chang, khaiNiemMoi, khoi };
}

// Quet than bai theo thu tu: \muc, \input{hinh}, \vidu, coichung, chuyenla, van xuoi.
function quetThan(than, khoi, ngu, sn, laPhuLuc = false) {
  const moc = [];
  for (const m of than.matchAll(/\\muc\{([^}]*)\}/g)) moc.push({ at: m.index, len: m[0].length, loai: "muc", v: m[1] });
  for (const m of than.matchAll(/\\input\{hinh\/([^}]+)\.tex\}/g)) moc.push({ at: m.index, len: m[0].length, loai: "hinh", v: m[1] });
  for (const m of than.matchAll(/\\vidu\{([^}]+)\}/g)) moc.push({ at: m.index, len: m[0].length, loai: "vidu", v: m[1] });
  for (const t of ["coichung", "chuyenla"]) {
    for (const e of moiTruong(than, t)) moc.push({ at: e.dau, len: e.cuoi - e.dau, loai: t, v: e.noi });
  }
  moc.sort((a, b) => a.at - b.at);

  let cur = 0, heading = "";
  const xaVan = (tu, den) => {
    const v = than.slice(tu, den).trim();
    if (!v) return;
    const h = doan(v, ngu);
    if (h.trim()) { khoi.push({ kind: "van", heading, html: h }); heading = ""; }
  };
  for (const m of moc) {
    xaVan(cur, m.at);
    cur = m.at + m.len;
    if (m.loai === "muc") heading = vanTho(m.v, ngu);
    else if (m.loai === "hinh") {
      const p = join(HINH, m.v + ".tex");
      let alt = "";
      if (existsSync(p)) alt = altHinh(doc(p), ngu);
      else err(`thieu tep hinh ${m.v}.tex`);
      if (!alt) alt = ALT_TAY[m.v] || "";
      if (!alt) err(`khong dung duoc alt tieng Viet cho hinh ${m.v}`);
      if (!existsSync(join(ROOT, "assets", "hinh", m.v + ".svg"))) err(`thieu assets/hinh/${m.v}.svg`);
      khoi.push({ kind: "hinh", src: `assets/hinh/${m.v}.svg`, alt });
      dem.hinh++; if (laPhuLuc) dem.hinhPl++;
    } else if (m.loai === "vidu") {
      const py = docMa(m.v + ".py"), out = docMa(m.v + ".out");
      if (py === null || out === null) continue;
      dem.py++; dem.out++; dem.vidu++;
      khoi.push({ kind: "vidu", code: py.replace(/\n$/, ""), out, stdin: stdinCho(m.v, py) });
    } else {
      khoi.push({ kind: m.loai === "coichung" ? "nhac" : "la", html: doan(m.v, ngu) });
    }
  }
  xaVan(cur, than.length);
}

function bocTracNghiem(noi, ngu, sn) {
  const ra = [];
  const phan = noi.split(/\\cauhoi/).slice(1);
  for (const p of phan) {
    const a = doiSo(p, skipWs(p, 0));
    if (!a) { err(`bai${sn}: \\cauhoi khong co doi so`); continue; }
    const stem = vanHtml(a.noi, ngu).trim();
    const options = []; let answerIndex = -1;
    let i = a.het;
    while (true) {
      const m = /\\pa(\*?)\s*\{/.exec(p.slice(i));
      if (!m) break;
      const at = i + m.index;
      const b = doiSo(p, at + m[0].length - 1);
      if (!b) break;
      if (m[1] === "*") answerIndex = options.length;
      options.push(vanHtml(b.noi, ngu).trim());
      i = b.het;
      if (/^\s*\\visao/.test(p.slice(i))) break;
    }
    const vs = /\\visao\s*\{/.exec(p.slice(i));
    let explanation = "";
    if (vs) {
      const c = doiSo(p, i + vs.index + vs[0].length - 1);
      if (c) { explanation = vanHtml(c.noi, ngu).trim(); dem.visao++; }
    }
    if (!explanation) err(`bai${sn}: mot cau trac nghiem thieu \\visao`);
    if (answerIndex < 0) err(`bai${sn}: mot cau trac nghiem khong co \\pa*`);
    if (options.length < 2) err(`bai${sn}: cau trac nghiem co ${options.length} lua chon`);
    dem.tn++;
    ra.push({ kind: "single_choice", stem, options, answerIndex, explanation });
  }
  return ra;
}

function bocPhanDien(tex, khoi, ngu, sn, id) {
  const i0 = tex.indexOf("\\muc{Điền vào chỗ trống}");
  const i1 = tex.indexOf("\\muc{Con tự viết}");
  if (i0 < 0 || i1 < 0) { err(`bai${sn}: thieu muc dien hoac tu viet`); return; }
  const kh = tex.slice(i0, i1);
  khoi.push({ kind: "van", heading: "Điền vào chỗ trống", html: "" });

  // ngan hang tu
  let bank = [];
  const nh = /\\nganhangtu\s*\{/.exec(kh);
  if (nh) {
    const a = doiSo(kh, nh.index + nh[0].length - 1);
    if (a) bank = [...a.noi.matchAll(/\\tukhoa\s*\{/g)].map((m) => {
      const b = doiSo(a.noi, m.index + m[0].length - 1);
      return b ? vanTho(b.noi, ngu) : "";
    }).filter(Boolean);
  }
  if (!bank.length) err(`bai${sn}: thieu \\nganhangtu`);

  // Bai 1: dien vao cau van (enumerate co \oo noi tuyen)
  const en = moiTruong(kh, "enumerate")[0];
  if (en) {
    const oo = [];
    const items = [...en.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)]
      .map((m) => vanHtml(m[1], ngu, { choPhepOo: true, oo }).trim()).filter(Boolean);
    if (oo.length) {
      dem.oo += oo.length; dem.proseFill++;
      khoi.push({
        kind: "fill_blank", id: id("dien"),
        deBai: "Chọn từ trong ngân hàng điền vào ba câu sau.",
        bank, items, blanks: oo.map((a) => ({ accept: [a] })),
      });
    }
  }

  // Bai 2,3,4: codelo thu k khop ma/baiNN/lo0(k+1).  Khong dung \khoiketqua de
  // danh so, vi bai02 co MOT khoi co y khong chay (xep thu tu Sang/Trua/Chieu/Toi)
  // nen thieu \khoiketqua. Khoi do cham bang accept thay vi chay.
  const cls = moiTruong(kh, "codelo");
  if (cls.length !== 3) err(`bai${sn}: co ${cls.length} codelo, mong 3`);
  for (let k = 0; k < cls.length; k++) {
    const { template, blanks, chuIn } = bocCodelo(cls[k].noi, ngu);
    const rel = `bai${sn}/lo${String(k + 1).padStart(2, "0")}`;
    const coTep = existsSync(join(MA, rel + ".py"));
    let out = null, py = null;
    if (coTep) {
      py = docMa(rel + ".py"); out = docMa(rel + ".out");
      if (py !== null && out !== null) {
        dem.py++; dem.out++;
        // So HAI NGUON: ghep dap an vao template phai ra DUNG tep .py
        let ghep = template;
        blanks.forEach((b, j) => { ghep = ghep.replaceAll(`{{${j + 1}}}`, b.accept[0]); });
        if (chuanHoa(ghep) !== chuanHoa(py)) {
          err(`bai${sn}: codelo ${k + 1} ghep lai KHONG khop ma/${rel}.py`);
        }
      }
    }
    dem.codelo++; dem.oo += blanks.length;
    // De bai: lay nhan "Bài n." CUOI CUNG truoc khoi code, roi cat truoc moi
    // \begin{...}. Neu khong cat, doan nay nuot ca khoi enumerate phia tren.
    const truoc = kh.slice(k === 0 ? 0 : cls[k - 1].cuoi, cls[k].dau);
    const nhan = [...truoc.matchAll(/\\textbf\{Bài \d+\.\}/g)].pop();
    let deBai = "";
    if (nhan) {
      let t = truoc.slice(nhan.index + nhan[0].length);
      const b = t.indexOf("\\begin{");
      if (b >= 0) t = t.slice(0, b);
      deBai = vanHtml(t, ngu).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    }
    khoi.push({
      kind: "code_fill", id: id("dien"),
      deBai,
      bank, template, blanks, chuIn,
      expectOut: out, chayDuoc: coTep,
      stdin: coTep ? stdinCho(rel + ".py", py || "") : null,
    });
  }
}

function bocTuViet(tex, khoi, ngu, sn, id) {
  const i0 = tex.indexOf("\\muc{Con tự viết}");
  if (i0 < 0) return;
  const i1 = tex.indexOf("\\dalamduoc", i0);
  const kh = tex.slice(i0, i1 < 0 ? tex.length : i1);
  const db = /\\textbf\{Đề bài\.\}([\s\S]*?)(?=\n\s*\n|\\begin\{enumerate\})/.exec(kh);
  const en = moiTruong(kh, "enumerate")[0];
  const hoiTruoc = en ? [...en.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)]
    .map((m) => vanHtml(m[1], ngu).trim()).filter(Boolean) : [];
  // checklist
  let checklist = [];
  const dl = /\\dalamduoc\s*\{%?/.exec(tex);
  if (dl) {
    const a = doiSo(tex, tex.indexOf("{", dl.index));
    if (a) checklist = [...a.noi.matchAll(/\\tick\s*\{/g)].map((m) => {
      const b = doiSo(a.noi, m.index + m[0].length - 1);
      return b ? vanHtml(b.noi, ngu).trim() : "";
    }).filter(Boolean);
  }
  dem.tuviet++;
  khoi.push({
    kind: "free_code", id: id("tuviet"),
    deBai: db ? vanHtml(db[1], ngu).replace(/<\/?p>/g, "").trim() : "",
    hoiTruoc, checklist, hints: [], loiHayMac: "", loiGiai: "",
  });

  // Duoi bai: sau \khungoly con co the con "Bài thưởng" hoac ban do tong ket,
  // va hai bai co hinh o day (bai23, bai32). Quet not, neu khong se sot hinh.
  const ky = /\\khungoly\s*\{[^}]*\}/.exec(kh);
  if (ky) {
    const duoi = kh.slice(ky.index + ky[0].length);
    if (duoi.trim()) quetThan(duoi, khoi, ngu, sn);
  }
}

// Khoi dap an (quyen bo): tach reveal cho thudoan, hints + loi hay mac cho tu viet.
function ganDapAn(tex, khoi, ngu, sn, guessId) {
  const da = moiTruong(tex, "khoidapan")[0];
  if (!da) { err(`bai${sn}: thieu khoidapan`); return; }
  dem.dapan++;
  const noi = da.noi;

  const lay = (nhan) => {
    const re = new RegExp(`\\\\textbf\\{${nhan}[^}]*\\}([\\s\\S]*?)(?=\\\\textbf\\{|\\\\end\\{khoidapan\\}|$)`);
    const m = re.exec(noi);
    return m ? m[1] : "";
  };

  const g = khoi.find((k) => k.id === guessId);
  if (g) {
    const t = lay("Thử đoán xem");
    g.reveal = t ? doan(t, ngu) : "";
    if (!g.reveal) err(`bai${sn}: khoi dap an thieu phan "Thu doan xem"`);
  }

  const tv = khoi.find((k) => k.kind === "free_code");
  if (tv) {
    const hd = lay("Cách hỏi dẫn");
    if (hd) {
      const en = moiTruong(hd, "enumerate")[0];
      // Sach viet "Cau hoi? (dap an)". Tach doi: hien CAU HOI truoc, dap an
      // o lan bam sau. Khong tach thi bac goi y lo dap an ngay tu dau.
      if (en) tv.hints = [...en.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)]
        .map((m) => vanHtml(m[1], ngu).replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .map((s) => {
          const m = /^([\s\S]*?)\s*\(([^()]*)\)\s*$/.exec(s);
          return m ? { hoi: m[1].trim(), dap: m[2].trim() } : { hoi: s, dap: "" };
        });
    }
    if (!tv.hints.length) err(`bai${sn}: khong boc duoc thang goi y "Cach hoi dan"`);
    const lm = lay("Lỗi cháu hay mắc");
    tv.loiHayMac = lm ? doan(lm, ngu) : "";
    const cv = lay("Con tự viết");
    if (cv) {
      // Loi giai viet theo HAI kieu trong sach:
      //  (1) \khoicode{duong/dan.py}  -> lay nguyen tep
      //  (2) mot enumerate moi \item la mot dong \ma{...}  -> ghep lai
      const kc = /\\khoicode\{([^}]+)\}/.exec(cv);
      if (kc) {
        const p = docMa(kc[1]);
        if (p) tv.loiGiai = p.replace(/\n$/, "");
      } else {
        const en = moiTruong(cv, "enumerate")[0];
        if (en) {
          const dong = [...en.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)]
            .map((m) => {
              const a = /\\ma\s*\{/.exec(m[1]);
              if (!a) return "";
              const b = doiSo(m[1], a.index + a[0].length - 1);
              return b ? vanTho(b.noi, ngu) : "";
            }).filter(Boolean);
          if (dong.length) tv.loiGiai = dong.join("\n");
        }
      }
      tv.goiY = doan(cv.replace(/\\khoicode\{[^}]+\}/, "").replace(/\\begin\{enumerate\}[\s\S]*?\\end\{enumerate\}/, ""), ngu);
    }
  }
}

// stdin: tu tep .in neu co, neu khong thi tu dong chu thich "# Con go X roi bam Enter"
function stdinCho(rel, py) {
  const pin = join(MA, rel.replace(/\.py$/, "") + ".in");
  if (existsSync(pin)) return doc(pin);
  if (!/(^|\n)\s*\w*\s*=?\s*.*input\(/.test(py) && !py.includes("input(")) return null;
  const ghi = [...py.matchAll(/^#\s*Con gõ\s+(.+)$/gm)].map((m) => m[1]);
  if (!ghi.length) return null;
  // "7 rồi bấm Enter" -> 7 ; "Na, rồi gõ 9" -> Na\n9
  const t = ghi.join(", ").replace(/rồi bấm Enter/gi, "").replace(/rồi gõ/gi, ",");
  return t.split(",").map((s) => s.trim()).filter(Boolean).join("\n") + "\n";
}

// ------------------------------------------------------------------ phu luc
function bocPhuLuc(ngu) {
  const map = [
    ["a", "A-tu-dien-loi"], ["b", "B-bang-tra-tu-khoa"],
    ["c", "C-de-danh-lop-sau"], ["d", "D-bang-tram-o"],
  ];
  const ra = [];
  for (const [id, tep] of map) {
    const p = join(SRC, "sach", "phu-luc", tep + ".tex");
    if (!existsSync(p)) { err(`thieu phu luc ${tep}`); continue; }
    const tex = doc(p);
    const mo = /\\mophuluc\{[^}]*\}\{/.exec(tex);
    const tenA = mo ? doiSo(tex, mo.index + mo[0].length - 1) : null;
    const ten = tenA ? vanTho(tenA.noi, ngu) : tep;
    // \mophuluc co BA doi so: chu cai, ten, va mau chang. Bo het ca ba, neu
    // chi bo hai thi "{changSau}" se lot vao van ban.
    let sauMo = tenA ? tenA.het : 0;
    if (tenA) { const c = doiSo(tex, skipWs(tex, tenA.het)); if (c) sauMo = c.het; }
    const khoi = [];
    quetThan(tex.slice(sauMo), khoi, ngu, "pl" + id, true);
    const o = { schemaVersion: "1.0", id, ten, khoi };
    if (id === "a") o.muc = bocTuDienLoi(tex, ngu);
    ra.push(o);
  }
  return ra;
}

function bocTuDienLoi(tex, ngu) {
  const en = moiTruong(tex, "enumerate")[0];
  if (!en) { err("phu luc A: khong thay danh sach loi"); return []; }
  const muc = [];
  for (const m of en.noi.matchAll(/\\item\s+([\s\S]*?)(?=\\item|$)/g)) {
    const t = m[1];
    const ma = /\\ma\{/.exec(t);
    if (!ma) continue;
    const a = doiSo(t, ma.index + ma[0].length - 1);
    if (!a) continue;
    const mau = vanTho(a.noi, ngu);
    const khop = (/^[A-Za-z]+Error|^[A-Za-z]+Warning/.exec(mau) || [mau.split(":")[0]])[0];
    const ng = /\\textbf\{Nghĩa là\}([\s\S]*?)(?=\\textbf\{|$)/.exec(t);
    const su = /\\textbf\{Sửa\}([\s\S]*?)(?=\\textbf\{|$)/.exec(t);
    muc.push({
      khop, mau,
      nghiaLa: ng ? vanHtml(ng[1], ngu).replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ") : "",
      sua: su ? vanHtml(su[1], ngu).replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ") : "",
    });
  }
  return muc;
}

// ---------------------------------------------------------------------- main
const ngu = { tenbe: "Bi" };
mkdirSync(join(OUT, "bai"), { recursive: true });
mkdirSync(join(OUT, "phu-luc"), { recursive: true });

// CHU Y: sach co HAI cach nhom khac nhau, de lan.
//  - "tập" la cach chia SACH IN thanh 6 quyen: 1-5, 6-10, 11-15, 16-20, 21-26, 27-32.
//  - "chặng" la cach chia NOI DUNG, chinh la doi so thu ba cua \mobai, va la
//    cai quyet dinh mau. Chang khong deu nhau: 2, 6, 6, 6, 4, 8 bai.
// Web khong co quyen in nen dung CHANG. Ten chang lay tu KE-HOACH-BAI.md.
const CHANG = [
  [1, "Chào máy tính", "#0E7490", [1, 2]],
  [2, "Cái hộp đựng số", "#B45309", [3, 8]],
  [3, "Máy biết chọn", "#7C3AED", [9, 14]],
  [4, "Máy biết lặp", "#15803D", [15, 20]],
  [5, "Dãy số và vòng lặp while", "#BE185D", [21, 24]],
  [6, "Hàm, đếm và số nguyên tố", "#1D4ED8", [25, 32]],
];

const dsBai = [];
for (let n = 1; n <= 32; n++) {
  const b = bocBai(n, ngu);
  if (!b) continue;
  writeFileSync(join(OUT, "bai", `bai${String(n).padStart(2, "0")}.json`), JSON.stringify(b, null, 1));
  dsBai.push({
    so: b.so, ten: b.ten, chang: b.chang,
    file: `bai/bai${String(n).padStart(2, "0")}.json`,
    soViec: b.khoi.filter((k) => k.id).length,
  });
}

const pl = bocPhuLuc(ngu);
for (const p of pl) writeFileSync(join(OUT, "phu-luc", `${p.id}.json`), JSON.stringify(p, null, 1));

const manifest = {
  schemaVersion: "1.0",
  version: new Date().toISOString().slice(0, 10).replace(/-/g, ".") + "-1",
  title: "Python cho con",
  tenbe: ngu.tenbe,
  chang: CHANG.map(([id, ten, mau]) => ({
    id, ten, mau, bai: dsBai.filter((b) => b.chang === id).map((b) => b.so),
  })),
  bai: dsBai,
  phuLuc: pl.map((p) => ({ id: p.id, ten: p.ten, file: `phu-luc/${p.id}.json` })),
};
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));

// ------------------------------------------------------------------- do phu
const nPy = readdirSync(MA).filter((d) => d.startsWith("bai"))
  .flatMap((d) => readdirSync(join(MA, d)).filter((f) => f.endsWith(".py"))).length;
const nHinhTep = readdirSync(HINH).filter((f) => f.endsWith(".tex")).length;

// Dich khong lay tu chinh bo boc. Lay tu HAI nguon doc lap:
//  (1) quet tho nguon .tex va thu muc ma/  -> cot "nguồn"
//  (2) so TRANG-THAI.md cua sach giay       -> cot "sổ"
// Lech bat ky cho nao la gay.
const texTatCa = Array.from({ length: 32 }, (_, i) =>
  doc(join(BAI, `bai${String(i + 1).padStart(2, "0")}.tex`))).join("\n");
const demNguon = (re) => (texTatCa.match(re) || []).length;

const SO_SACH = { bai: 32, py: 191, hinh: 45 }; // TRANG-THAI.md cua python-cho-con

const muc = [
  ["bài", dem.bai, 32],
  ["câu trắc nghiệm", dem.tn, demNguon(/\\cauhoi/g)],
  ["dòng \\visao", dem.visao, demNguon(/\\visao/g)],
  ["bài đoán kết quả", dem.doan, demNguon(/\\doan\{/g)],
  ["ví dụ mẫu", dem.vidu, demNguon(/\\vidu\{/g)],
  ["khối điền code", dem.codelo, demNguon(/\\begin\{codelo\}/g)],
  ["ô trống", dem.oo, demNguon(/\\oo\{/g)],
  ["bài tự viết", dem.tuviet, demNguon(/\\khungoly/g)],
  ["khối thử đoán", dem.guess, demNguon(/\\begin\{thudoan\}/g)],
  ["khối đáp án", dem.dapan, demNguon(/\\begin\{khoidapan\}/g)],
  ["tham chiếu hình trong bài", dem.hinh - dem.hinhPl, demNguon(/\\input\{hinh\//g)],
  ["tệp .py đã nhúng", dem.py, nPy],
  ["phụ lục", pl.length, 4],
];

console.log("\n  ĐỘ PHỦ BÓC\n  " + "-".repeat(44));
let thieu = 0;
for (const [ten, co, can] of muc) {
  const dat = co === can;
  if (!dat) thieu++;
  console.log(`  ${dat ? "✓" : "✗"} ${String(co).padStart(4)}/${String(can).padEnd(4)} ${ten}`);
}
console.log("  " + "-".repeat(44));
console.log(`  nguồn có ${nPy} tệp .py và ${nHinhTep} tệp hình`);
  for (const [ten, co, can] of [["bài (sổ sách)", dem.bai, SO_SACH.bai], ["tệp .py (sổ sách)", dem.py, SO_SACH.py], ["tệp hình (sổ sách)", nHinhTep, SO_SACH.hinh]]) {
    if (co !== can) { console.log(`  ✗ ${co}/${can} ${ten}  <-- LECH SO SACH`); thieu++; }
  }

// CONG SO HAI NGUON cho cach nhom chang:
//   nguon 1 = doi so thu ba cua \mobai trong tung tep .tex
//   nguon 2 = dai bai ghi o KE-HOACH-BAI.md cua sach
// Lan hai cach nhom nay la loi da tung mac: lay ten theo "tập" ma mau theo "chặng".
for (const [id, ten, , [tu, den]] of CHANG) {
  const thuc = dsBai.filter((b) => b.chang === id).map((b) => b.so);
  const mong = [];
  for (let n = tu; n <= den; n++) mong.push(n);
  if (thuc.join(",") !== mong.join(",")) {
    err(`chặng ${id} "${ten}": LaTeX cho [${thuc.join(",")}] nhưng sổ ghi [${mong.join(",")}]`);
    thieu++;
  }
}

if (loi.length) {
  console.log(`\n  ${loi.length} LỖI:`);
  const g = {};
  for (const l of loi) g[l] = (g[l] || 0) + 1;
  for (const [l, c] of Object.entries(g)) console.log(`   ✗ ${l}${c > 1 ? `  (x${c})` : ""}`);
}
if (thieu || loi.length) {
  console.log(`\n  BÓC CHƯA ĐỦ: ${thieu} hạng mục thiếu, ${loi.length} lỗi.\n`);
  process.exit(1);
}
console.log(`\n  ✓ Bóc đủ 100%. Đã ghi data/manifest.json + ${dsBai.length} bài + ${pl.length} phụ lục.\n`);
