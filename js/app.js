// app.js - dinh tuyen theo pathname + cac khung nhin.
// Can rewrite trong vercel.json de moi duong dan deu ve index.html.
import { getManifest, getBai, getPhuLuc } from "./data.js";
import * as S from "./store.js";
import * as C from "./chay.js";
import * as L from "./loi.js";
import {
  khoiHtml, khoiCode, khoiKetQua, bangSoDong, giaiOk, giaiBad, esc, KY,
} from "./render.js";

const app = document.getElementById("app");
const td = document.getElementById("thanh-td");

// --------------------------------------------------------------- tien ich
const $ = (s, g = document) => g.querySelector(s);
const $$ = (s, g = document) => [...g.querySelectorAll(s)];

function datChang(mau) {
  document.documentElement.style.setProperty("--chang", mau || "#0E7490");
}
function datTieuDe(t) {
  document.title = t ? `${t} · Python cho con` : "Python cho con";
}
function tienDo(p) { td.firstElementChild.style.width = Math.round(p * 100) + "%"; }

function di(url) {
  history.pushState({}, "", url);
  ve();
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='/']");
  if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  di(a.getAttribute("href"));
});
addEventListener("popstate", ve);

function chuan(s) { return String(s ?? "").replace(/\r/g, "").replace(/[ \t]+$/gm, "").replace(/\n+$/, ""); }

// ============================================================== trang chu
async function trangChu() {
  const mf = await getManifest();
  datChang("#0E7490");
  datTieuDe("");
  tienDo(0);

  const lc = S.lanCuoi();
  const xongHet = mf.bai.filter((b) => (S.tomTatBai(b.so) || {}).xong).length;

  app.innerHTML = `
  <h1>Python cho con</h1>
  <p>Ba mươi hai bài học Python cho học sinh lớp 3. Con đọc bài, chọn đáp án,
  đoán xem máy in ra gì, rồi tự gõ chương trình ngay trên trang này.
  <b>Python chạy thật trong trình duyệt</b>, con không cần cài gì cả.</p>

  <p class="ghi-chu">Không cần đăng nhập. Tiến độ của con lưu ngay trong máy này
  và không gửi đi đâu cả.</p>

  ${lc ? `<p><a class="nut" href="/bai/${lc}" style="display:inline-block;text-decoration:none">
      Học tiếp bài ${lc}</a></p>` : ""}

  <p class="ghi-chu">Con đã làm xong <b>${xongHet}</b> trên 32 bài.</p>

  ${mf.chang.map((c) => `
    <section class="chang-khoi">
      <div class="chang-dau">
        <span class="chang-cham" style="background:${esc(c.mau)}"></span>
        <h2 style="margin:0;color:${esc(c.mau)}">Chặng ${c.id}. ${esc(c.ten)}</h2>
      </div>
      <div class="luoi-bai">
        ${c.bai.map((n) => {
          const b = mf.bai.find((x) => x.so === n);
          const t = S.tomTatBai(n);
          return `<a class="the-bai ${t && t.xong ? "xong" : ""}" href="/bai/${n}"
                     style="--bmau:${esc(c.mau)}">
            <div class="so">BÀI ${n}</div>
            <div class="tn">${esc(b.ten)}</div>
            <div class="td">${t ? (t.xong ? `✓ xong, đúng ${t.dung}/${t.tong}` : `đang làm ${t.lam}/${t.tong}`) : `${b.soViec} việc`}</div>
          </a>`;
        }).join("")}
      </div>
    </section>`).join("")}

  <h2>Phụ lục</h2>
  <div class="luoi-bai">
    ${mf.phuLuc.map((p) => `<a class="the-bai" href="/phu-luc/${p.id}" style="--bmau:#6B7280">
      <div class="so">PHỤ LỤC ${p.id.toUpperCase()}</div>
      <div class="tn">${esc(p.ten)}</div></a>`).join("")}
  </div>`;
}

// ============================================================== trang bai
async function trangBai(so) {
  const mf = await getManifest();
  const d = await getBai(so);
  if (!d) return khongCo();
  await L.napBang();

  const chang = mf.chang.find((c) => c.id === d.chang);
  datChang(chang ? chang.mau : "#0E7490");
  datTieuDe(`Bài ${d.so}. ${d.ten}`);

  const dsId = d.khoi.filter((k) => k.id).map((k) => k.id);
  let demViec = 0;
  let demVd = 0;

  const than = d.khoi.map((k) => {
    const ctx = {};
    if (k.id) ctx.so = ++demViec;
    if (k.kind === "vidu") ctx.vdId = `vd${++demVd}`;
    return khoiHtml(k, ctx);
  }).join("\n");

  const truoc = d.so > 1 ? `<a class="nut phu" href="/bai/${d.so - 1}" style="text-decoration:none">← Bài ${d.so - 1}</a>` : "<span></span>";
  const sau = d.so < 32 ? `<a class="nut" href="/bai/${d.so + 1}" style="text-decoration:none">Bài ${d.so + 1} →</a>` : `<a class="nut" href="/" style="text-decoration:none">Về trang chủ</a>`;

  app.innerHTML = `
  <p class="ghi-chu"><a href="/">Trang chủ</a> · Chặng ${d.chang}. ${esc(chang ? chang.ten : "")}</p>
  <h1>Bài ${d.so}. ${esc(d.ten)}</h1>
  ${than}
  <section id="xem-lai"></section>
  <div class="dieu-huong">${truoc}${sau}</div>`;

  noiSuKien(d, dsId);
  capNhatTienDo(d, dsId);
  scrollTo(0, 0);
}

// ------------------------------------------------------- noi su kien
function noiSuKien(d, dsId) {
  const theoId = Object.fromEntries(d.khoi.filter((k) => k.id).map((k) => [k.id, k]));

  // --- nut Chay cua khoi vi du
  let iVd = 0;
  for (const k of d.khoi) {
    if (k.kind !== "vidu") continue;
    const id = `vd${++iVd}`;
    const nut = $(`[data-chay="${id}"]`);
    const o = $(`[data-kq="${id}"]`);
    const tt = $(`[data-chay-tt="${id}"]`);
    if (!nut) continue;
    nut.addEventListener("click", async () => {
      nut.disabled = true;
      tt.innerHTML = `<span class="nap"><span class="quay"></span> đang mở Python...</span>`;
      const r = await C.chay(k.code, k.stdin);
      tt.textContent = "";
      nut.disabled = false;
      o.innerHTML = `<p class="kq-ten">Máy in ra</p>` + khoiKetQua(r, L.tra);
    });
  }

  // --- tung bai tap
  for (const id of dsId) {
    const k = theoId[id];
    const el = $(`[data-bt="${id}"]`);
    if (!el) continue;
    if (k.kind === "single_choice") notTracNghiem(k, el, d, dsId);
    else if (k.kind === "guess_text") notThuDoan(k, el, d, dsId);
    else if (k.kind === "predict_output") notDoan(k, el, d, dsId);
    else if (k.kind === "fill_blank") notDienVan(k, el, d, dsId);
    else if (k.kind === "code_fill") notDienCode(k, el, d, dsId);
    else if (k.kind === "free_code") notTuViet(k, el, d, dsId);

    // ve lai trang thai da luu
    const cu = S.ketViec(id);
    if (cu) el.classList.add(cu === "sai" ? "xong-sai" : "xong-dung");
  }

  // ngan hang tu: bam mot tu thi do vao o dang duoc chon
  $$(".bank .tu").forEach((b) => {
    b.addEventListener("click", () => {
      const bt = b.closest(".bt");
      const o = bt.querySelector("input.o-dien:focus") ||
        [...bt.querySelectorAll("input.o-dien")].find((x) => !x.value);
      if (o) { o.value = b.dataset.tu; o.focus(); }
    });
  });

  // Tab trong o soan thanh 4 dau cach, khong nhay ra khoi o
  $$("textarea.soan").forEach((t) => {
    t.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      const s = t.selectionStart, k = t.selectionEnd;
      t.value = t.value.slice(0, s) + "    " + t.value.slice(k);
      t.selectionStart = t.selectionEnd = s + 4;
    });
  });
}

function xong(id, ket, d, dsId, el) {
  S.ghiViec(d.so, id, ket);
  el.classList.remove("xong-dung", "xong-sai");
  el.classList.add(ket === "sai" ? "xong-sai" : "xong-dung");
  capNhatTienDo(d, dsId);
}

function capNhatTienDo(d, dsId) {
  const t = S.danhDauBai(d.so, dsId);
  tienDo(t.tong ? t.lam / t.tong : 0);
  veXemLai(d, dsId);
}

// ------------------------------------------------------------ trac nghiem
function notTracNghiem(k, el, d, dsId) {
  const giai = $("[data-giai]", el);
  const nut = $$("[data-chon]", el);
  const cu = S.ketViec(k.id);
  if (cu) hien(cu === "dung" ? k.answerIndex : -1, false);

  nut.forEach((b) => b.addEventListener("click", () => {
    const i = Number(b.dataset.chon);
    hien(i, true);
    xong(k.id, i === k.answerIndex ? "dung" : "sai", d, dsId, el);
  }));

  function hien(chon, moi) {
    nut.forEach((b, i) => {
      b.disabled = true;
      if (i === k.answerIndex) b.classList.add("dung");
      else if (i === chon) b.classList.add("sai");
    });
    const ok = chon === k.answerIndex;
    giai.innerHTML = ok
      ? giaiOk("Chính xác", `<p>${k.explanation}</p>`)
      : giaiBad(moi ? "Chưa đúng" : "Lần trước con chọn sai",
          `<p>Đáp án đúng là <b>${KY[k.answerIndex]}</b>. ${k.explanation}</p>`);
  }
}

// -------------------------------------------------------------- thu doan
function notThuDoan(k, el, d, dsId) {
  const giai = $("[data-giai]", el);
  const nop = $("[data-nop]", el);
  if (S.ketViec(k.id)) hien();
  nop.addEventListener("click", () => { hien(); xong(k.id, "xong", d, dsId, el); });
  function hien() {
    nop.disabled = true;
    giai.innerHTML = giaiOk("Máy trả lời", k.reveal);
  }
}

// --------------------------------------------------------- doan ket qua
function notDoan(k, el, d, dsId) {
  const giai = $("[data-giai]", el);
  const nop = $("[data-nop]", el);
  const nhap = $("[data-nhap]", el);

  nop.addEventListener("click", async () => {
    nop.disabled = true;
    giai.innerHTML = `<p class="nap"><span class="quay"></span> đang chạy...</p>`;
    const r = await C.chay(k.code, k.stdin);
    nop.disabled = false;

    if (r.hetGio || r.loi) {
      giai.innerHTML = khoiKetQua(r, L.tra);
      return;
    }
    const dung = chuan(nhap.value) === chuan(r.ra);
    const bang = bangSoDong(nhap.value, r.ra);
    giai.innerHTML = dung
      ? giaiOk("Con đoán đúng hết", bang)
      : giaiBad("Có dòng chưa khớp", `${bang}
         <p class="ghi-chu">Dòng tô đỏ là chỗ lệch. Con đọc lại chương trình
         xem máy chạy tới dòng ấy thì đang giữ số gì.</p>`);
    xong(k.id, dung ? "dung" : "sai", d, dsId, el);
  });
}

// --------------------------------------------- dien o trong van xuoi
function notDienVan(k, el, d, dsId) {
  const giai = $("[data-giai]", el);
  const nop = $("[data-nop]", el);
  const o = $$("input.o-dien", el);

  nop.addEventListener("click", () => {
    let sai = 0;
    o.forEach((inp, i) => {
      const mong = (k.blanks[i] && k.blanks[i].accept) || [];
      const ok = mong.some((a) => a.trim().toLowerCase() === inp.value.trim().toLowerCase());
      inp.classList.toggle("dung", ok);
      inp.classList.toggle("sai", !ok);
      if (!ok) sai++;
    });
    const ds = k.blanks.map((b, i) => `ô ${i + 1} là <code>${esc(b.accept[0])}</code>`).join("; ");
    giai.innerHTML = sai === 0
      ? giaiOk("Đúng cả ba ô", `<p>Theo thứ tự: ${ds}.</p>`)
      : giaiBad(`Còn ${sai} ô chưa đúng`, `<p>Đáp án theo thứ tự: ${ds}.</p>`);
    xong(k.id, sai === 0 ? "dung" : "sai", d, dsId, el);
  });
}

// ------------------------------------------------- dien o trong khoi code
function notDienCode(k, el, d, dsId) {
  const giai = $("[data-giai]", el);
  const nop = $("[data-nop]", el);
  const o = $$("input.o-dien", el);

  nop.addEventListener("click", async () => {
    // tung o: to dung sai theo accept, chi de GIAI THICH
    const tungO = o.map((inp, i) => {
      const mong = (k.blanks[i] && k.blanks[i].accept) || [];
      const ok = mong.some((a) => a.trim() === inp.value.trim());
      inp.classList.toggle("dung", ok);
      inp.classList.toggle("sai", !ok);
      return ok;
    });
    const ds = k.blanks.map((b, i) => `ô ${i + 1} là <code>${esc(b.accept[0])}</code>`).join("; ");

    // ghep chuong trinh tu cai chau dien
    let ma = k.template;
    o.forEach((inp, i) => { ma = ma.replaceAll(`{{${i + 1}}}`, inp.value); });

    if (!k.chayDuoc) {
      const ok = tungO.every(Boolean);
      giai.innerHTML = ok
        ? giaiOk("Đúng rồi", `<p>Theo thứ tự: ${ds}.</p>`)
        : giaiBad("Chưa đúng", `<p>Đáp án theo thứ tự: ${ds}.</p>`);
      xong(k.id, ok ? "dung" : "sai", d, dsId, el);
      return;
    }

    nop.disabled = true;
    giai.innerHTML = `<p class="nap"><span class="quay"></span> đang chạy chương trình của con...</p>`;
    const r = await C.chay(ma, k.stdin);
    nop.disabled = false;

    // CHAM BANG KET QUA CHAY, khong phai bang so chuoi.
    // Chau dien cach khac ma may in dung thi VAN DUNG.
    const ok = !r.hetGio && !r.loi && chuan(r.ra) === chuan(k.expectOut);
    const chuongTrinh = `<p class="kq-ten">Chương trình của con</p>${khoiCode(ma)}`;

    if (ok) {
      const khac = !tungO.every(Boolean);
      giai.innerHTML = giaiOk("Máy in ra đúng rồi",
        chuongTrinh + (khac
          ? `<p>Con điền khác sách mà máy vẫn in đúng, nên vẫn tính là đúng.
             Sách điền: ${ds}.</p>`
          : `<p>Theo thứ tự: ${ds}.</p>`));
    } else {
      giai.innerHTML = giaiBad("Máy chưa in ra đúng",
        chuongTrinh + khoiKetQua(r, L.tra) +
        (r.hetGio || r.loi ? "" : `<p class="kq-ten">So từng dòng</p>${bangSoDong(r.ra, k.expectOut)}`) +
        `<p>Đáp án của sách: ${ds}.</p>`);
    }
    xong(k.id, ok ? "dung" : "sai", d, dsId, el);
  });
}

// ------------------------------------------------------------- tu viet
function notTuViet(k, el, d, dsId) {
  const nhap = $("[data-nhap]", el);
  const oKq = $("[data-kqtu]", el);
  const oBac = $("[data-bac]", el);
  const giai = $("[data-giai]", el);
  const nutChay = $("[data-chay-tu]", el);
  const nutGoiY = $("[data-goiy]", el);
  const nop = $("[data-nop]", el);

  // thang goi y: tung bac mot. Cau hoi truoc, dap an sau, loi giai cuoi cung.
  const bac = [];
  for (const h of k.hints) {
    bac.push({ ten: "Gợi ý", noi: `<p>${h.hoi}</p>` });
    if (h.dap) bac.push({ ten: "Trả lời gợi ý trên", noi: `<p>${esc(h.dap)}</p>` });
  }
  if (k.loiHayMac) bac.push({ ten: "Lỗi hay mắc ở bài này", noi: k.loiHayMac });
  if (k.goiY) bac.push({ ten: "Cách làm", noi: k.goiY });
  if (k.loiGiai) bac.push({ ten: "Một cách viết đúng", noi: khoiCode(k.loiGiai) });
  let iBac = 0;

  nutGoiY.addEventListener("click", () => {
    if (iBac >= bac.length) return;
    const b = bac[iBac++];
    oBac.insertAdjacentHTML("beforeend",
      `<div class="bac"><div class="bac-ten">Bậc ${iBac} trên ${bac.length} · ${esc(b.ten)}</div>${b.noi}</div>`);
    if (iBac >= bac.length) { nutGoiY.disabled = true; nutGoiY.textContent = "Hết gợi ý rồi"; }
    else nutGoiY.textContent = `Gợi ý tiếp (còn ${bac.length - iBac})`;
  });

  nutChay.addEventListener("click", async () => {
    nutChay.disabled = true;
    oKq.innerHTML = `<p class="nap"><span class="quay"></span> đang chạy bài của con...</p>`;
    const r = await C.chay(nhap.value, null);
    nutChay.disabled = false;
    oKq.innerHTML = `<p class="kq-ten">Máy in ra</p>` + khoiKetQua(r, L.tra);
  });

  nop.addEventListener("click", () => {
    nop.disabled = true;
    giai.innerHTML = giaiOk("Con đã làm xong bài này",
      `<p class="kq-ten">Đáp án</p>` + (k.goiY || "") +
      (k.loiGiai ? `<p class="kq-ten">Một cách viết đúng</p>${khoiCode(k.loiGiai)}` : ""));
    xong(k.id, "xong", d, dsId, el);
  });
}

// --------------------------------------------------------- xem lai ca bai
function veXemLai(d, dsId) {
  const o = $("#xem-lai");
  if (!o) return;
  const t = S.tienDoBai(d.so, dsId);
  if (!t.lam) { o.innerHTML = ""; return; }

  const ten = {
    guess_text: "Thử đoán xem", single_choice: "Chọn đáp án",
    predict_output: "Máy in ra gì", fill_blank: "Điền chỗ trống",
    code_fill: "Điền chỗ trống", free_code: "Con tự viết",
  };
  const theoId = Object.fromEntries(d.khoi.filter((k) => k.id).map((k) => [k.id, k]));

  o.innerHTML = `
  <h2>Xem lại cả bài</h2>
  <p>Con đã làm <b>${t.lam}</b> trên ${t.tong} việc${t.lam ? `, đúng <b>${t.dung}</b>` : ""}.</p>
  <div class="bang-cuon"><table>
    <thead><tr><th>Việc</th><th>Loại</th><th>Kết quả</th></tr></thead>
    <tbody>${dsId.map((id, i) => {
      const k = S.ketViec(id);
      const n = ten[theoId[id].kind] || theoId[id].kind;
      const v = k === "dung" ? "✓ đúng" : k === "sai" ? "✗ chưa đúng" : k === "xong" ? "✓ đã làm" : "chưa làm";
      return `<tr><td><a href="#" data-toi="${esc(id)}">Việc ${i + 1}</a></td><td>${esc(n)}</td><td>${v}</td></tr>`;
    }).join("")}</tbody>
  </table></div>
  ${t.xong ? `<div class="hop hoc"><span class="hop-ten">Xong bài ${d.so} rồi</span>
     <p>Con đã làm hết ${t.tong} việc của bài này.</p></div>` : ""}
  <p><button class="nut phu nho" id="lam-lai">Làm lại bài này từ đầu</button></p>`;

  $$("[data-toi]", o).forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    const el = $(`[data-bt="${a.dataset.toi}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }));
  $("#lam-lai", o).addEventListener("click", () => {
    S.xoaBai(dsId);
    trangBai(d.so);
  });
}

// ============================================================= phu luc
async function trangPhuLuc(id) {
  const p = await getPhuLuc(id);
  if (!p) return khongCo();
  datChang("#6B7280");
  datTieuDe(p.ten);
  tienDo(0);
  app.innerHTML = `
  <p class="ghi-chu"><a href="/">Trang chủ</a> · Phụ lục ${id.toUpperCase()}</p>
  <h1>${esc(p.ten)}</h1>
  ${p.khoi.map((k) => khoiHtml(k, {})).join("\n")}
  <div class="dieu-huong"><a class="nut phu" href="/" style="text-decoration:none">← Trang chủ</a><span></span></div>`;
  scrollTo(0, 0);
}

// ============================================================ linh tinh
function khongCo() {
  datTieuDe("Không có trang này");
  app.innerHTML = `<h1>Không có trang này</h1>
    <p>Con quay lại <a href="/">trang chủ</a> rồi chọn bài nhé.</p>`;
}

async function trangTienBo() {
  const mf = await getManifest();
  datChang("#0E7490");
  datTieuDe("Con học tới đâu rồi");
  tienDo(0);
  const r = mf.bai.map((b) => ({ b, t: S.tomTatBai(b.so) }));
  const xongHet = r.filter((x) => x.t && x.t.xong).length;
  app.innerHTML = `
  <p class="ghi-chu"><a href="/">Trang chủ</a></p>
  <h1>Con học tới đâu rồi</h1>
  <p>Đã làm xong <b>${xongHet}</b> trên 32 bài.</p>
  <div class="bang-cuon"><table>
    <thead><tr><th>Bài</th><th>Tên</th><th>Đã làm</th><th>Đúng</th></tr></thead>
    <tbody>${r.map(({ b, t }) => `<tr>
      <td><a href="/bai/${b.so}">${b.so}</a></td><td>${esc(b.ten)}</td>
      <td>${t ? `${t.lam}/${t.tong}` : "chưa"}</td>
      <td>${t ? t.dung : ""}</td></tr>`).join("")}</tbody>
  </table></div>
  <p><button class="nut phu nho" id="xoa">Xoá hết tiến độ</button></p>`;
  $("#xoa").addEventListener("click", () => {
    if (confirm("Xoá hết tiến độ đã học? Việc này không lấy lại được.")) {
      S.xoaHet(); trangTienBo();
    }
  });
}

// ============================================================== dinh tuyen
async function ve() {
  const p = location.pathname.replace(/\/+$/, "") || "/";
  try {
    let m;
    if (p === "/") await trangChu();
    else if ((m = /^\/bai\/(\d+)$/.exec(p))) await trangBai(Number(m[1]));
    else if ((m = /^\/phu-luc\/([a-d])$/.exec(p))) await trangPhuLuc(m[1]);
    else if (p === "/tien-bo") await trangTienBo();
    else khongCo();
  } catch (e) {
    app.innerHTML = `<h1>Có trục trặc</h1><p>${esc(String(e.message || e))}</p>
      <p><a href="/">Về trang chủ</a></p>`;
  }
}

// ---------------------------------------------------------------- khoi dong
$("#doi-theme").addEventListener("click", () => {
  const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  S.datTheme(t);
});

C.khiDoiTrangThai((t) => {
  const o = $("#tt-python");
  if (!o) return;
  o.textContent = t === "dang-nap" ? "đang mở Python..."
    : t === "san-sang" ? "Python sẵn sàng"
    : t === "da-giet" ? "đã dừng Python" : "";
});

ve();
