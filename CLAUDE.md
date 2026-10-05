# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong kho này.

## Đây là gì

Site học Python cho học sinh lớp 3, dựng từ quyển sách giấy `python-cho-con`.
Toàn bộ là **HTML + CSS + ES module thuần**: không framework, không build step,
không dependency, không `package.json`. **Gốc kho LÀ web root.**

Theo đúng khuôn của `working/openedu/web/`. Đọc `CLAUDE.md` ở đó trước khi đổi
kiến trúc.

## Lệnh

```bash
# Chay thu o nha. BAT BUOC dung cai nay chu khong dung python3 -m http.server,
# vi router doc location.pathname nen moi duong dan phai ve index.html.
node tools/phuc-vu.mjs 8080

# Boc lai noi dung tu sach LaTeX. Chay moi khi sach doi.
node tools/boc.mjs          # -> data/manifest.json + data/bai/*.json

# Dung lai 45 hinh tu TikZ. Can lualatex va pdftocairo.
node tools/hinh.mjs         # -> assets/hinh/*.svg

# Bay cong. Chay het truoc moi lan commit cham vao data/ hay js/.
node tools/validate.mjs      --tu-kiem   # luoc do, em dash, so .out hai nguon
node tools/kiem-sach.mjs     --tu-kiem   # so chu tren web voi SAU TEP PDF quyen chau
node tools/kiem-hinh.mjs     --tu-kiem   # 45 hinh vs ban PDF goc, do tren anh
node tools/kiem-chay.mjs     --tu-kiem   # 191 chuong trinh trong Chrome that
node tools/kiem-khop.mjs     --tu-kiem   # hinh dung bai, o ket qua khop ma TREN TRANG
node tools/kiem-web.mjs                  # quet ca 32 bai + 4 phu luc, dau vet LaTeX sot
node tools/kiem-tuong-tac.mjs            # lai that qua tung loai bai tap + kho dien thoai
```

`--tu-kiem` bật các ca **tiêm lỗi**. Cổng xanh mà không có ca tiêm lỗi thì
không chứng minh được gì, nên đừng bỏ cờ này khi sửa cổng.

## Nguồn dữ liệu

Nguồn là `../python-cho-con/` (LaTeX), **không phải** 6 tệp PDF. PDF quyển cháu
thiếu ba thứ làm nên tính tương tác: 192 dòng `\visao`, đáp án 264 ô trống, và
32 khối "cách hỏi dẫn khi cháu bí" (nằm ở quyển bố).

`data/` là **sinh ra**, không sửa tay. Sửa sách rồi chạy lại `boc.mjs`.

## Kiến trúc

- `js/app.js` định tuyến theo `location.pathname` (`/`, `/bai/<n>`,
  `/phu-luc/<a-d>`, `/tien-bo`). Cần rewrite trong `vercel.json`.
- `js/render.js` là **sổ đăng ký**: `kind -> hàm trả chuỗi HTML`. Hàm render
  phải thuần, không chạm DOM. `app.js` nối sự kiện sau.
- `js/worker.js` chạy Pyodide trong Web Worker. `js/chay.js` quản worker,
  **giết sau 5 giây** rồi dựng cái mới, vì cháu sẽ viết `while True`.
- `js/loi.js` dịch lỗi Python sang tiếng Việt, tra từ **Phụ lục A của chính
  quyển sách**. Không khớp mục nào thì hiện nguyên văn, **không bịa**.
- `js/store.js` tiến độ trong `localStorage`, không rời khỏi máy.

## Luật phải giữ

- **Không em dash.** Không `—`, không `–`, không `--`. `validate.mjs` coi đây
  là **lỗi**, không phải cảnh báo.
- **Không thêm dependency.** Kể cả trình soạn code. `tools/*.mjs` chỉ dùng
  `node:` builtin (gọi `lualatex`, `pdftocairo`, Chrome qua `spawn` thì được).
- **Tiếng Việt có dấu hoàn toàn.** Các dòng chú thích `%` trong sách viết
  KHÔNG dấu, nên **không được** dùng chúng làm nội dung hiển thị. Đã vấp hai
  lần: "từ mới trong bài" và `alt` của hình.
- Chấm bài điền code **bằng cách chạy thật**, không so chuỗi. Cháu điền khác
  sách mà máy in đúng thì vẫn đúng.

## Chỗ đã vấp, đừng vấp lại

1. **`xelatex` → `.xdv` → `dvisvgm` làm MẤT SẠCH nét vẽ TikZ**, chỉ còn chữ.
   Nó chỉ cảnh báo chứ không báo lỗi. Đường đúng là `lualatex` →
   PDF → `pdftocairo -svg`.
2. **7 trong 45 hình** cần `\tikzset{vatdem, ovuongdem}` khai trong
   `preamble.tex`. Wrapper đã đủ ở `tools/hinh-pre.tex`, đừng viết lại.
3. **Sách có HAI cách nhóm bài**: "tập" (6 quyển in: 1-5, 6-10, ...) và
   "chặng" (nội dung: 2, 6, 6, 6, 4, 8 bài). Màu theo **chặng**. Lẫn hai cái
   này là lỗi đã mắc. `boc.mjs` có cổng so hai nguồn cho chỗ này.
4. **`String.replace()` coi `$$` là một dấu `$`.** Chèn kịch bản có `$$(` vào
   trang bằng chuỗi thay thế sẽ làm hỏng cú pháp và module **không chạy dòng
   nào mà cũng không báo gì**. Dùng hàm thay thế.
5. **Bài 2 có một khối điền cố ý không chạy** (xếp thứ tự Sáng/Trưa/Chiều/Tối)
   nên thiếu `\khoiketqua`. Đánh số khối điền theo thứ tự, đừng theo
   `\khoiketqua`. Vì vậy 96 khối điền nhưng chỉ 95 có tệp `.py`.
6. **`kiem-sach.mjs` khong duoc go the HTML khoi chu lay tu PDF.** Trong sach
   co `<class 'int'>`, trong y het mot the HTML nen bi nuot mat, lam cong bao
   nham 90 lan. Chu tu PDF la van ban thuan, chu tu `data/` moi la HTML.
   Hai ben phai co hai ham chuan hoa rieng.
7. **Khong so anh o kich thuoc that giua hai bo render khac nhau.** pdftocairo
   và Chrome khử răng cưa khác nhau, và đặt khung bao khác nhau. Phải cắt về
   khung chứa mực, thu nhỏ, rồi dò dịch chuyển. Xem phần hiệu chuẩn ngưỡng
   ghi trong `tools/kiem-hinh.mjs`.
8. **`loading="lazy"` khong kich hoat khi Chrome chay khong giao dien.** Cuon
   trang cung khong an thua. Cong nao can kiem anh thi phai nap thang tep,
   dung dua vao `img.complete`.
