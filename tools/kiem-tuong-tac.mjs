#!/usr/bin/env node
// kiem-tuong-tac.mjs - CONG: lai that trinh duyet qua tung loai bai tap, kiem
// rang CHAM dung va KHOI GIAI THICH hien ra dung.
//
// Anh chup tinh khong chung minh duoc dieu nay, nen phai bam that.
// Moi loai bai tap deu co CA DUNG va CA SAI, vi cong chi thu ca dung thi
// khong chung minh duoc no biet phan biet.
//
// Chay: node tools/kiem-tuong-tac.mjs
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/chromium",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Khong tim thay Chrome."); process.exit(2); }

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".zip": "application/zip", ".woff2": "font/woff2",
};

// Kich ban chay BEN TRONG trang, sau khi app.js da dung xong giao dien.
const KICH_BAN = String.raw`
const ra = [];
const L = (m) => fetch("/buoc", { method:"POST", body:String(m) });
const ok = (ten, dat, ghi) => { ra.push({ ten, dat: !!dat, ghi: ghi || "" }); L((dat?"ok  ":"HONG ")+ten); };
const nghi = (ms) => new Promise(r => setTimeout(r, ms));
const $ = (s, g=document) => g.querySelector(s);
const $$ = (s, g=document) => [...g.querySelectorAll(s)];

// doi mot dieu kien thanh that, toi han
async function cho(f, han=20000, buoc=100){
  const het = Date.now()+han;
  while(Date.now()<het){ if(f()) return true; await nghi(buoc); }
  return false;
}
async function moBai(n){
  history.pushState({},"", "/bai/"+n);
  dispatchEvent(new PopStateEvent("popstate"));
  await cho(()=> $("h1") && /^Bài /.test($("h1").textContent));
  await nghi(60);
}

try {
  localStorage.clear();
  await moBai(1);

  await L(">>> muc 1");
  // ---------------------------------------------- 1. trac nghiem: chon SAI
  {
    const bt = $$(".bt").find(b => $("[data-chon]", b));
    const nut = $$("[data-chon]", bt);
    nut[0].click();                       // dap an dung la B (index 1)
    await nghi(60);
    const g = $(".giai", bt);
    ok("trac nghiem chon SAI: hien khoi giai thich", g && g.classList.contains("bad"));
    ok("trac nghiem chon SAI: noi ro dap an dung", g && /Đáp án đúng là/.test(g.textContent));
    ok("trac nghiem chon SAI: co nguyen van visao",
       g && /Hai dấu nháy chỉ để nói cho máy biết/.test(g.textContent));
    ok("trac nghiem chon SAI: to do o da chon", nut[0].classList.contains("sai"));
    ok("trac nghiem chon SAI: to xanh o dung", nut[1].classList.contains("dung"));
    ok("trac nghiem: khoa khong cho chon lai", nut.every(n => n.disabled));
    ok("trac nghiem SAI: vien o bai tap thanh do", bt.classList.contains("xong-sai"));
  }

  await L(">>> muc 2");
  // ---------------------------------------------- 2. trac nghiem: chon DUNG
  {
    const bt = $$(".bt").filter(b => $("[data-chon]", b))[1];
    const nut = $$("[data-chon]", bt);
    const dung = nut.findIndex((n,i)=> i===1);  // cau 2 dap an la C (index 2)
    nut[2].click();
    await nghi(60);
    const g = $(".giai", bt);
    ok("trac nghiem chon DUNG: khoi giai thich mau xanh", g && g.classList.contains("ok"));
    ok("trac nghiem chon DUNG: van co visao", g && g.textContent.length > 40);
    ok("trac nghiem DUNG: vien o bai tap thanh xanh", bt.classList.contains("xong-dung"));
  }

  await L(">>> muc 3");
  // ---------------------------------------------- 3. doan ket qua: SAI
  {
    const bt = $$(".bt").find(b => $("[data-nhap]", b) && /Chạy và so/.test(b.textContent));
    $("[data-nhap]", bt).value = "sai be ret";
    $("[data-nop]", bt).click();
    const co = await cho(()=> $(".giai", bt));
    ok("doan ket qua SAI: co khoi giai thich", co);
    const g = $(".giai", bt);
    ok("doan ket qua SAI: bao chua khop", g && g.classList.contains("bad"));
    ok("doan ket qua SAI: co bang so tung dong", g && $(".so-dong", g));
    ok("doan ket qua SAI: co dong duoc to lech", g && $(".so-dong tr.lech", g));
  }

  await L(">>> muc 4");
  // ---------------------------------------------- 4. doan ket qua: DUNG
  {
    const bt = $$(".bt").filter(b => $("[data-nhap]", b) && /Chạy và so/.test(b.textContent))[1];
    // lay dung ket qua tu chinh du lieu bai
    const d = await (await fetch("/data/bai/bai01.json")).json();
    const k = d.khoi.filter(x => x.kind === "predict_output")[1];
    $("[data-nhap]", bt).value = k.expectOut.replace(/\n$/,"");
    $("[data-nop]", bt).click();
    const co = await cho(()=> $(".giai", bt));
    const g = $(".giai", bt);
    ok("doan ket qua DUNG: bao dung", co && g.classList.contains("ok"));
    ok("doan ket qua DUNG: khong con dong lech", g && !$(".so-dong tr.lech", g));
  }

  await L(">>> muc 5");
  // ---------------------------------------------- 5. dien o van xuoi
  {
    const bt = $$(".bt").find(b => $("input.o-dien", b) && !$("pre", b));
    const o = $$("input.o-dien", bt);
    o[0].value = "print"; o[1].value = "SAI"; o[2].value = "F5";
    $("[data-nop]", bt).click();
    await nghi(60);
    const g = $(".giai", bt);
    ok("dien van xuoi: bat duoc 1 o sai", g && /Còn 1 ô chưa đúng/.test(g.textContent));
    ok("dien van xuoi: to do dung o sai", o[1].classList.contains("sai"));
    ok("dien van xuoi: to xanh o dung", o[0].classList.contains("dung") && o[2].classList.contains("dung"));
    ok("dien van xuoi: hien day du dap an", g && /ô 2 là/.test(g.textContent));
  }

  await L(">>> muc 6");
  // ---------------------------------------------- 6. dien o trong code: DUNG
  {
    const bt = $$(".bt").find(b => $("input.o-dien", b) && $("pre", b));
    $$("input.o-dien", bt)[0].value = "print";
    $("[data-nop]", bt).click();
    const co = await cho(()=> $(".giai", bt), 25000);
    const g = $(".giai", bt);
    ok("dien code DUNG: chay that roi bao dung", co && g.classList.contains("ok"));
    ok("dien code DUNG: hien chuong trinh da ghep", g && /Chương trình của con/.test(g.textContent));
  }

  await L(">>> muc 7");
  // ------------------------------- 7. dien o trong code: SAI, phai chi ro cho sai
  {
    const bt = $$(".bt").filter(b => $("input.o-dien", b) && $("pre", b))[1];
    const o = $$("input.o-dien", bt);
    o.forEach(x => x.value = "print");
    o[0].value = "Print";                       // hoa chu P -> NameError
    $("[data-nop]", bt).click();
    const co = await cho(()=> $(".giai", bt), 25000);
    const g = $(".giai", bt);
    ok("dien code SAI: bao chua dung", co && g.classList.contains("bad"));
    ok("dien code SAI: DOI LOI sang tieng Viet tu Phu luc A",
       g && /máy không biết|viết hoa|Máy đang nói gì/.test(g.textContent), g ? g.textContent.slice(0,120) : "");
  }

  await L(">>> muc 8");
  // ---------------------------------------------- 8. tu viet: thang goi y
  {
    const bt = $$(".bt").find(b => $("[data-goiy]", b));
    const nut = $("[data-goiy]", bt);
    nut.click(); await nghi(30);
    const bac1 = $$(".bac", bt);
    ok("tu viet: bac 1 hien mot goi y", bac1.length === 1);
    ok("tu viet: bac 1 KHONG lo loi giai", !/print\(/.test(bac1[0].textContent));
    let n = 0;
    while (!nut.disabled && n < 30) { nut.click(); await nghi(20); n++; }
    const het = $$(".bac", bt);
    ok("tu viet: bam het thi ra nhieu bac", het.length >= 4, "co " + het.length + " bac");
    ok("tu viet: bac CUOI moi la loi giai",
       /print\(/.test(het[het.length-1].textContent));
    ok("tu viet: nut goi y tat khi het bac", nut.disabled);
  }

  await L(">>> muc 9");
  // ---------------------------------------------- 9. chay bai tu viet
  {
    const bt = $$(".bt").find(b => $("[data-chay-tu]", b));
    $("[data-nhap]", bt).value = 'print("xin chao")';
    $("[data-chay-tu]", bt).click();
    const co = await cho(()=> $("[data-kqtu] .kq", bt), 25000);
    ok("tu viet: chay duoc bai cua chau", co && /xin chao/.test($("[data-kqtu]", bt).textContent));
  }

  await L(">>> muc 10");
  // ------------------------------- 10. tu viet loi -> doi sang tieng Viet
  {
    const bt = $$(".bt").find(b => $("[data-chay-tu]", b));
    $("[data-nhap]", bt).value = 'print("chua dong ngoac"';
    $("[data-chay-tu]", bt).click();
    await nghi(1500);
    const t = $("[data-kqtu]", bt).textContent;
    ok("tu viet: loi cu phap hien giai thich tieng Viet",
       /Máy đang nói gì|Máy báo lỗi/.test(t), t.slice(0, 120));
  }

  await L(">>> muc 11");
  // ---------------------------------------------- 11. xem lai ca bai
  {
    const xl = $("#xem-lai");
    ok("xem lai: co bang tong ket", xl && $("table", xl));
    ok("xem lai: dem dung so viec da lam", xl && /Con đã làm/.test(xl.textContent));
    ok("xem lai: co ca dong 'chua dung'", xl && /chưa đúng/.test(xl.textContent));
  }

  await L(">>> muc 12");
  // ---------------------------------------------- 12. tien do luu lai duoc
  {
    const truoc = $("#xem-lai").textContent;
    await moBai(2); await moBai(1);
    const sau = $("#xem-lai") ? $("#xem-lai").textContent : "";
    ok("tien do: roi trang roi quay lai van con", sau.includes("Con đã làm"));
    ok("tien do: trac nghiem van hien lai giai thich", !!$(".giai"));
  }

  await L(">>> muc 13");
  // ---------------------------------------------- 13. hinh co that
  {
    await moBai(1);
    const img = $$("figure.hinh img");
    ok("hinh: bai 1 co 2 hinh", img.length === 2, "co " + img.length);
    await cho(()=> img.every(i => i.complete), 10000);
    ok("hinh: tai duoc va co kich thuoc that",
       img.every(i => i.naturalWidth > 50 && i.naturalHeight > 20),
       img.map(i => i.naturalWidth + "x" + i.naturalHeight).join(" "));
    ok("hinh: moi hinh deu co alt tieng Viet",
       img.every(i => i.alt && i.alt.length > 10 && /[àáâãèéêìíòóôõùúăđĩũơư]/i.test(i.alt)),
       img.map(i => i.alt.slice(0,40)).join(" | "));
  }
  await L(">>> muc 14");
  // ------------------- 14. KHO DIEN THOAI: trang khong duoc tran ngang
  // Cung goc nen doc duoc ben trong iframe. Do that chu khong nhin anh.
  {
    for (const [duong, w] of [["/bai/3",390],["/bai/9",390],["/bai/30",390],["/",390],["/phu-luc/d",360],["/bai/19",360]]) {
      const f = document.createElement("iframe");
      f.style.cssText = "width:"+w+"px;height:800px;border:0;position:absolute;left:-9999px";
      f.src = duong; document.body.appendChild(f);
      await new Promise(r => { f.onload = r; setTimeout(r, 15000); });
      await nghi(1200);
      let tran = true, chiTiet = "";
      try {
        const e = f.contentDocument.documentElement;
        tran = e.scrollWidth > e.clientWidth + 1;
        if (tran) {
          const thua = [];
          for (const el of f.contentDocument.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.right > w + 1.5 && r.width > 0)
              thua.push(el.tagName + "." + String(el.className || "").slice(0, 24) + "@" + Math.round(r.right));
          }
          chiTiet = "scroll=" + e.scrollWidth + " client=" + e.clientWidth + "  vuot: " + [...new Set(thua)].slice(0, 4).join(", ");
        }
      } catch (err) { chiTiet = "khong doc duoc: " + err; }
      ok("kho " + w + "px " + duong + ": khong tran ngang", !tran, chiTiet);
      f.remove();
    }
  }

  await L(">>> muc 15");
  // --------------- 15. khoi code khong duoc ve vien theo tung dong
  {
    await moBai(3);
    const c = $(".code-khoi pre code");
    const st = getComputedStyle(c);
    ok("khoi code: <code> ben trong khong co nen rieng",
       st.backgroundColor === "rgba(0, 0, 0, 0)" || st.backgroundColor === "transparent", st.backgroundColor);
    ok("khoi code: <code> ben trong khong co vien",
       parseFloat(st.borderTopWidth) === 0, st.borderTopWidth);
  }

  await L(">>> muc 15b");
  // ----- 15b. khoi code nhieu dong phai CAO tuong xung voi so dong
  // CSS co the don ca khoi thanh mot dong ma DOM van du dau xuong dong, nen
  // khong cong nao khac bat duoc. Phai do chieu cao that.
  {
    await moBai(30);
    let xau = 0, soKiem = 0;
    for (const pre of $$(".code-khoi pre")) {
      const dong = pre.textContent.replace(/\n+$/, "").split("\n").length;
      if (dong < 3) continue;
      soKiem++;
      const caoMotDong = parseFloat(getComputedStyle(pre).lineHeight) || 24;
      if (pre.clientHeight < caoMotDong * dong * 0.8) xau++;
    }
    ok("khoi code nhieu dong khong bi don thanh mot dong",
       soKiem > 0 && xau === 0, "kiem " + soKiem + " khoi, " + xau + " khoi bi don");
  }

  await L(">>> muc 16");
  // --------------- 16. o dien phai HEP theo do dai dap an
  {
    await moBai(3);
    const d = await (await fetch("/data/bai/bai03.json")).json();
    const k = d.khoi.filter(x => x.kind === "code_fill").find(x => x.blanks.length === 2);
    const bt = $('[data-bt="' + k.id + '"]');
    const o = $$("input.o-dien", bt);
    const rong = o.map(x => Math.round(x.getBoundingClientRect().width));
    // dap an la "+" va "2", moi cai mot ky tu, nen o phai nho
    ok("o dien mot ky tu phai hep hon 70px", rong.every(r => r < 70), "rong = " + rong.join(", "));
    const pre = $("pre", bt);
    ok("dong code chua o dien khong tran khoi khoi",
       pre.scrollWidth <= pre.clientWidth + 1, "scroll=" + pre.scrollWidth + " client=" + pre.clientWidth);
  }
} catch (e) {
  ra.push({ ten: "KICH BAN NEM LOI", dat: false, ghi: String(e && e.stack || e) });
}
await fetch("/ket-qua", { method:"POST", headers:{"content-type":"application/json"},
  body: JSON.stringify(ra) });
document.title = "XONG";
`;

let xong = null;
const doi = new Promise((r) => { xong = r; });

const may = createServer((req, res) => {
  if (req.method === "POST" && req.url === "/buoc") {
    let b = ""; req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); console.log("    " + b); });
    return;
  }
  if (req.method === "POST" && req.url === "/ket-qua") {
    let b = "";
    req.on("data", (c) => { b += c; });
    req.on("end", () => { res.writeHead(204).end(); xong(JSON.parse(b)); });
    return;
  }
  const duong = decodeURIComponent((req.url || "/").split("?")[0]);
  let p = join(ROOT, duong);
  if (!p.startsWith(ROOT) || !existsSync(p) || statSync(p).isDirectory()) p = join(ROOT, "index.html");

  if (p === join(ROOT, "index.html")) {
    // chen kich ban SAU app.js, de app.js dung xong giao dien roi moi lai
    // CHU Y: phai dung HAM thay the. Dung chuoi thi replace() coi "$$" la mot
    // dau "$", nen moi "$$(" trong kich ban bi bien thanh "$(", gay trung khai
    // bao va loi cu phap, va module khong chay dong nao ma cung khong bao gi.
    const chen = `<script type="module">
         await new Promise(r => setTimeout(r, 900));
         ${KICH_BAN}
       </script></body>`;
    const h = readFileSync(p, "utf8").replace("</body>", () => chen);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(h);
    return;
  }
  res.writeHead(200, {
    "content-type": MIME[extname(p)] || "application/octet-stream",
  }).end(readFileSync(p));
});

await new Promise((r) => may.listen(0, "127.0.0.1", r));
const cong = may.address().port;

console.log("  Lai that trinh duyet qua tung loai bai tap...");
const ch = spawn(CHROME, [
  "--headless", "--disable-gpu", "--no-sandbox", "--mute-audio",
  "--user-data-dir=" + join(ROOT, "tools", ".chrome-tt"),
  `http://127.0.0.1:${cong}/bai/1`,
], { stdio: "ignore" });

const hh = setTimeout(() => {
  console.error("  Qua 5 phut khong thay ket qua.");
  ch.kill(); may.close(); process.exit(2);
}, 180000);

const ra = await doi;
clearTimeout(hh);
ch.kill();
may.close();

const hong = ra.filter((r) => !r.dat);
console.log(`\n  CONG TUONG TAC\n  ${"-".repeat(52)}`);
for (const r of ra) {
  console.log(`  ${r.dat ? "✓" : "✗"} ${r.ten}${r.ghi && !r.dat ? `\n      ${r.ghi}` : ""}`);
}
console.log(`  ${"-".repeat(52)}`);
console.log(`  ${ra.length - hong.length} dat / ${hong.length} hong tren ${ra.length} phep kiem`);
if (hong.length) { console.log("\n  CONG DO.\n"); process.exit(1); }
console.log("\n  ✓ Cham dung va khoi giai thich hien dung o ca sau loai bai tap.\n");
