// render.js - so dang ky khoi: kind -> ham tra ve chuoi HTML.
// Ham render phai THUAN: khong cham DOM, khong goi fetch. app.js noi su kien.

export function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const KY = ["A", "B", "C", "D", "E", "F"];

// Khoi code chi de doc, kem nut Chay neu co.
function khoiCode(ma, { nutChay = false, id = "" } = {}) {
  return `<div class="code-khoi">
  <pre><code>${esc(ma)}</code></pre>
  ${nutChay ? `<div class="code-thanh">
    <button class="nut nho" data-chay="${esc(id)}">▶ Chạy thử</button>
    <span class="ghi-chu" data-chay-tt="${esc(id)}"></span>
  </div>` : ""}
</div>`;
}

function dauBaiTap(so, ten) {
  return `<div class="bt-dau"><span class="bt-so">${so}</span>${esc(ten)}</div>`;
}

// ---------------------------------------------------------- khoi chi doc
const R = {
  muc_tieu: (k) => `<div class="hop hoc"><span class="hop-ten">Hôm nay con học gì</span>
    <ul>${k.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`,

  van: (k) => (k.heading ? `<h2>${esc(k.heading)}</h2>` : "") + (k.html || ""),

  hinh: (k) => `<figure class="hinh">
    <img src="${esc(k.src)}" alt="${esc(k.alt)}" loading="lazy">
  </figure>`,

  nhac: (k) => `<div class="hop nhac"><span class="hop-ten">Coi chừng</span>${k.html}</div>`,

  la: (k) => `<div class="hop la"><span class="hop-ten">Chuyện lạ</span>${k.html}</div>`,

  vidu: (k, c) => `<p class="kq-ten">Ví dụ</p>${khoiCode(k.code, { nutChay: true, id: c.vdId })}
    <div data-kq="${esc(c.vdId)}"></div>`,

  // ------------------------------------------------------------ bai tap
  guess_text: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Thử đoán xem")}
  ${k.html}
  <p><textarea class="soan" data-nhap style="min-height:72px" placeholder="Con đoán máy in ra gì?"></textarea></p>
  <button class="nut" data-nop>Xem máy trả lời</button>
  <div data-giai></div>
</section>`,

  single_choice: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Chọn đáp án đúng")}
  <p>${k.stem}</p>
  <div class="lc">
    ${k.options.map((o, i) => `<button data-chon="${i}"><span class="ky">${KY[i]}</span><span>${o}</span></button>`).join("\n")}
  </div>
  <div data-giai></div>
</section>`,

  predict_output: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Máy in ra gì")}
  <p>Đọc chương trình rồi viết vào ô bên dưới. Viết xong hãy bấm Chạy để so.</p>
  ${khoiCode(k.code)}
  ${k.stdin ? `<p class="ghi-chu">Chương trình này hỏi con. Máy sẽ tự gõ: <code>${esc(String(k.stdin).trim().split("\n").join(" ⏎ "))}</code></p>` : ""}
  <p class="kq-ten">Con đoán máy in ra ${k.soDong} dòng</p>
  <textarea class="soan" data-nhap style="min-height:${Math.max(72, 26 * k.soDong)}px"
    placeholder="Viết ${k.soDong} dòng con đoán..."></textarea>
  <p><button class="nut" data-nop>Chạy và so</button></p>
  <div data-giai></div>
</section>`,

  fill_blank: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Điền vào chỗ trống")}
  <p>${esc(k.deBai)}</p>
  ${nganHang(k.bank)}
  <ol>${k.items.map((it) => `<li>${oTrong(it)}</li>`).join("\n")}</ol>
  <p><button class="nut" data-nop>Kiểm tra</button></p>
  <div data-giai></div>
</section>`,

  code_fill: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Điền vào chỗ trống")}
  <p>${esc(k.deBai)}</p>
  ${nganHang(k.bank)}
  <div class="code-khoi"><pre><code>${oTrongCode(k.template)}</code></pre></div>
  ${k.expectOut ? `<p class="kq-ten">Máy phải in ra đúng thế này</p><div class="kq">${esc(k.expectOut.replace(/\n$/, ""))}</div>` : ""}
  <p><button class="nut" data-nop>${k.chayDuoc ? "Chạy và kiểm tra" : "Kiểm tra"}</button></p>
  <div data-giai></div>
</section>`,

  free_code: (k, c) => `<section class="bt" data-bt="${esc(k.id)}">
  ${dauBaiTap(c.so, "Con tự viết")}
  <p><b>Đề bài.</b> ${esc(k.deBai)}</p>
  ${k.hoiTruoc.length ? `<p>Trả lời ba câu này trước khi gõ máy:</p>
    <ol>${k.hoiTruoc.map((h) => `<li>${h}</li>`).join("")}</ol>` : ""}
  <textarea class="soan" data-nhap placeholder="# Con gõ chương trình ở đây"></textarea>
  <p>
    <button class="nut" data-chay-tu>▶ Chạy bài của con</button>
    <button class="nut phu" data-goiy>Con bí rồi, gợi ý đi</button>
  </p>
  <div data-kqtu></div>
  <div data-bac></div>
  ${k.checklist.length ? `<p class="kq-ten">Con đã làm được</p>
    <ul class="chklist">${k.checklist.map((t, i) =>
      `<li><input type="checkbox" data-tick="${i}"><span>${t}</span></li>`).join("")}</ul>` : ""}
  <p><button class="nut" data-nop>Con làm xong bài này</button></p>
  <div data-giai></div>
</section>`,
};

function nganHang(bank) {
  if (!bank || !bank.length) return "";
  return `<p class="bank-ten">Ngân hàng từ</p><div class="bank">${
    bank.map((t) => `<button type="button" class="tu" data-tu="${esc(t)}">${esc(t)}</button>`).join("")
  }</div>`;
}

// {{n}} trong van xuoi -> o nhap
function oTrong(html) {
  return String(html).replace(/\{\{(\d+)\}\}/g,
    (m, n) => `<input type="text" class="o-dien" data-o="${n}" autocomplete="off" spellcheck="false">`);
}

// {{n}} trong khoi code -> o nhap, phan con lai PHAI thoat HTML
function oTrongCode(tpl) {
  return String(tpl).split(/(\{\{\d+\}\})/).map((p) => {
    const m = /^\{\{(\d+)\}\}$/.exec(p);
    return m
      ? `<input type="text" class="o-dien" data-o="${m[1]}" autocomplete="off" spellcheck="false">`
      : esc(p);
  }).join("");
}

export function khoiHtml(k, ctx) {
  const f = R[k.kind];
  if (!f) return `<p class="ghi-chu">[không biết khối "${esc(k.kind)}"]</p>`;
  return f(k, ctx || {});
}

export { khoiCode, KY };

// ----------------------------------------------------- khoi giai thich
export function giaiOk(tieuDe, than) {
  return `<div class="giai ok"><div class="giai-dau">${esc(tieuDe)}</div>${than || ""}</div>`;
}
export function giaiBad(tieuDe, than) {
  return `<div class="giai bad"><div class="giai-dau">${esc(tieuDe)}</div>${than || ""}</div>`;
}

// Bang so tung dong: du doan cua chau canh ket qua may.
export function bangSoDong(chau, may) {
  const a = String(chau).replace(/\s+$/, "").split("\n");
  const b = String(may).replace(/\s+$/, "").split("\n");
  const n = Math.max(a.length, b.length);
  let r = `<table class="so-dong"><thead><tr><th class="stt"></th>
    <th>Con đoán</th><th>Máy in ra</th></tr></thead><tbody>`;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? "", y = b[i] ?? "";
    const lech = x.trim() !== y.trim();
    r += `<tr class="${lech ? "lech" : ""}"><td class="stt">${i + 1}</td>
      <td>${esc(x) || "<i>bỏ trống</i>"}</td><td>${esc(y) || "<i>không có</i>"}</td></tr>`;
  }
  return r + "</tbody></table>";
}

// Khoi ket qua chay, co doi loi sang tieng Viet.
export function khoiKetQua(r, traLoi) {
  if (r.hetGio) {
    return `<div class="kq loi">Máy chạy quá 5 giây nên con dừng lại rồi.

Thường là chương trình bị kẹt trong vòng lặp không bao giờ dừng.
Con xem lại chỗ <b>while</b>, hoặc xem biến đếm đã tăng chưa.</div>`;
  }
  let h = "";
  if (r.ra) h += `<div class="kq">${esc(r.ra.replace(/\n$/, ""))}</div>`;
  if (r.loi) {
    const t = traLoi ? traLoi(r.loi) : { dong: r.loi };
    h += `<div class="kq loi">${esc(t.dong)}</div>`;
    if (t.nghiaLa) {
      h += `<div class="giai bad"><div class="giai-dau">Máy đang nói gì</div>
        <p><b>Nghĩa là</b> ${esc(t.nghiaLa)}</p>
        ${t.sua ? `<p><b>Sửa</b> ${esc(t.sua)}</p>` : ""}
        <p class="ghi-chu">Chữ đỏ không phải lời mắng. Đó là máy đang chỉ cho con chỗ sai.</p></div>`;
    } else {
      h += `<div class="giai bad"><div class="giai-dau">Máy báo lỗi</div>
        <p class="ghi-chu">Lỗi này chưa có trong Từ điển lỗi.
        Con đọc kỹ dòng chữ đỏ ở trên, nó chỉ đúng dòng bị sai.</p></div>`;
    }
  }
  if (!r.ra && !r.loi) h += `<div class="kq">(máy không in ra gì)</div>`;
  return h;
}
