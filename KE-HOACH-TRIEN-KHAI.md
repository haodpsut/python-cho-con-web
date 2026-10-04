# Kế hoạch triển khai: site học Python cho con

Chốt 04/10/2026. Đọc tệp này trước khi làm tiếp.

Nguồn nội dung: `working/python-cho-con/` (LaTeX, **không phải PDF**).
Khuôn kiến trúc: `working/openedu/web/` (vanilla ES module, không framework).
Đích: `python.agentra.io.vn`, công khai, Vercel bậc free.

## 0. Những gì đã đo được trước khi lập kế hoạch

Bốn con số dưới đây là **đo thật trên máy này ngày 04/10/2026**, không phải ước lượng.
Máy: Darwin 25.3.0 arm64. TeX Live ở `~/texlive/bin/universal-darwin`.
Node v20.20.2. Chrome ở `/Applications/Google Chrome.app`.

| Điều | Số đo | Cách đo |
|---|---|---|
| Độ đều của nguồn | **32/32 bài khớp khuôn tuyệt đối**: 6 trắc nghiệm, 2 đoán, 1 ví dụ, 3 khối điền, 1 khối đáp án | đếm macro trên cả 32 tệp `.tex` |
| Hình TikZ ra SVG | **45/45** biên dịch, **45/45** chuyển SVG, **45/45** render được trong Chrome | lualatex standalone, `pdftocairo -svg`, Chrome headless chụp ảnh |
| Tổng nặng hình | 4093 KB thô, **709 KB sau gzip**, trung bình 15 KB mỗi hình, nặng nhất 27 KB | `gzip -c` từng tệp |
| Pyodide tải lần đầu | **5,95 MB brotli** (`pyodide.asm.wasm` 3,44 MB + `python_stdlib.zip` 2,51 MB + `pyodide.js` 7,6 KB) | `curl -sIL -H 'Accept-Encoding: br'` lên jsDelivr, bản `v314.0.7` |

Suy ra: băng thông Vercel bậc free 100 GB mỗi tháng chia cho 5,95 MB được **khoảng 16.800 lượt
tải Pyodide mỗi tháng**. Chỉ tính lượt bấm Chạy lần đầu, không tính lượt chỉ đọc bài.

Hai cái bẫy đã gặp khi đo, ghi lại để không ai mất công lại:

1. **Đường `xelatex` ra `.xdv` rồi `dvisvgm` thì HỎNG.** Tệp nhỏ hơn 9 lần và có `<text>` chọn
   được, trông rất hấp dẫn, nhưng `dvisvgm` bỏ 299 PDF specials, tức là **mất sạch nét vẽ TikZ**,
   chỉ còn chữ. Nó chỉ cảnh báo chứ không báo lỗi. Đúng lớp lỗi "log sạch mà kết quả sai".
2. **7 trong 45 hình cần hai style TikZ khai trong `preamble.tex`**: `vatdem` và `ovuongdem`,
   cùng `\def\buocvat` và `\def\buocovuong`. Thiếu hai cái này thì pgfkeys báo lỗi. Wrapper
   phải bê đủ, xem mục G2.

## 1. Phạm vi

Đưa trọn 32 bài lên web, giữ nguyên thứ tự và cách chia 6 chặng của sách giấy.

| Thứ | Số lượng | Lên web thành |
|---|---|---|
| Bài học | 32, chia 6 chặng | 32 trang, mỗi trang một đường dẫn riêng |
| Trắc nghiệm | 192, mỗi câu có `\visao` | `single_choice`, hiện `\visao` sau khi trả lời |
| Đoán kết quả | 64 | `predict_output`, so từng dòng với kết quả chạy thật |
| Khối điền | 96 khối, 264 ô `\oo{}` | `code_fill`, chấm bằng cách chạy thật |
| Tự viết | 32 | `free_code`, thang gợi ý 4 bậc |
| Ví dụ mẫu | 32 | khối code có nút Chạy |
| Tệp chương trình | 191 `.py` kèm 191 `.out` | nhúng vào JSON |
| Hình | 45 | SVG tĩnh ở `assets/hinh/` |
| Phụ lục | A từ điển lỗi, B bảng tra từ khoá, C để dành lớp sau, D bảng trăm ô | 4 trang, A dùng cả làm bộ dịch lỗi |

Mỗi bài có **13 việc cho cháu**, đúng như sách: 1 thử đoán, 6 trắc nghiệm, 2 đoán kết quả,
3 điền ô, 1 tự viết.

Ngoài phạm vi lần này: tài khoản, đồng bộ nhiều máy, bảng xếp hạng, âm thanh.

## 2. Luật nhà áp cho dự án này

- **Không em dash.** Không `—`, không `–`, không `--`. Validator phải bắt, như openedu đang làm.
- **Không build step, không `package.json`, không dependency.** Gốc repo là web root.
  Các tệp trong `tools/` chỉ được dùng `node:` builtin.
- **Không thu thập dữ liệu của cháu.** Tiến độ nằm trong `localStorage`, không có backend,
  không gọi dịch vụ ngoài lúc chạy. Pyodide **tự chứa** chứ không gọi CDN, để giữ đúng
  lời hứa này.
- **Cổng phải được CÀI ĐẶT, không phải chỉ viết ra trong chú thích.** Mỗi cổng ở mục 3 kèm
  số ca tự kiểm bắt buộc.
- **Cổng hình đo trên ẢNH render, không đọc XML.**
- **Bộ bóc phải in ĐỘ PHỦ và gãy khi dưới 100%.**

## 3. Bảy giai đoạn

Ước lượng theo buổi làm việc. G1 và G2 độc lập nhau, chạy song song được.

### G0. Dựng khung repo (nửa buổi)

Làm:
- Cây thư mục theo mục 4.
- `index.html` kèm `<base href="/">`, script chọn theme sớm, thẻ OG, JSON-LD.
- `vercel.json`: rewrite mọi đường về `/index.html`, `no-cache` cho HTML/JS/CSS/data,
  `immutable` cho `assets/hinh/`, `assets/fonts/`, `assets/pyodide/`.
- `assets/styles.css` với bảng màu bê nguyên từ `python-cho-con/sach/preamble.tex`:

  | Vai | Mã |
  |---|---|
  | Chặng 1 tới 6 | `#0E7490` `#B45309` `#7C3AED` `#15803D` `#BE185D` `#1D4ED8` |
  | Chữ thân, nền code, viền ô, chữ xám | `#1B2430` `#F4F5F7` `#C9CED6` `#6B7280` |
  | Từ của máy, chữ máy in, lời ghi chú | `#7C3AED` `#C62828` `#15803D` |
  | Nền hộp Nhắc, Thử đoán, Học gì, Chuyện lạ | `#FEF3C7` `#E0F2FE` `#ECFDF5` `#F5F3FF` |

- Font Noto Sans và Noto Sans Mono tự chứa ở `assets/fonts/`, **chỉ nạp bộ chữ Việt**
  để nhẹ.
- `js/app.js` định tuyến rỗng, mới có trang chào.

Xong khi: `python3 -m http.server 8080` mở được `/`, `/bai/1`, `/phu-luc/a` mà không 404.

### G1. Bộ bóc LaTeX ra JSON (1 buổi)

Làm `tools/boc.mjs`. Đọc 32 tệp `sach/bai/baiNN.tex` cộng 4 phụ lục, sinh ra
`data/bai/baiNN.json` và `data/manifest.json`. Nhúng luôn nội dung 191 tệp `.py` và `.out`.

Bảng macro phải xử lý, lấy từ `preamble.tex`:

| Macro hoặc môi trường | Ra JSON thành |
|---|---|
| `\mobai{n}{tên}{chặng}` | `id`, `title`, `chang` |
| `hocgi` | khối `muc_tieu` |
| `thudoan` | bài tập `guess_text` |
| `\muc{...}` | tiêu đề mục |
| `\vidu{đường dẫn}` | khối `vidu`, nhúng `.py` và `.out` |
| `coichung`, `chuyenla` | khối `nhac`, `la` |
| `tracnghiem` với `\cauhoi` `\pa` `\pa*` `\visao` | `single_choice`, `\pa*` là đáp án, `\visao` là `explanation` |
| `\doan{đường dẫn}` | `predict_output`, `expectOut` lấy từ `.out` |
| `\nganhangtu` với `\tukhoa` | trường `bank` |
| `codelo` với `\dong`, `\oo{đáp án}`, `\chuin`, `\khoiketqua` | `code_fill`, `blanks[].accept`, `expectOut` |
| `\khungoly` | `free_code` |
| `dalamduoc` với `\tick` | `checklist` |
| `dapan` với `khoidapan` | `explanation` và `hints[]` |
| `\ma` `\textbf` `\tenbe` `\dots` | chữ nội tuyến |
| `\input{hinh/...}` | tham chiếu `assets/hinh/<tên>.svg` |

Ba chỗ dễ sai, phải viết ca kiểm riêng:
- `\oo{}` **lồng trong macro khác** thoát được mọi phép kiểm. Đây là ca đã bắt được ở sách giấy.
- `\chuin{...}` trong khối `codelo` là **gợi ý chữ máy sẽ in**, không phải ô trống. Bóc nhầm
  thành ô là hỏng bài.
- Dấu nháy thẳng trong `\ma{...}` phải giữ nguyên là nháy thẳng, không đổi thành nháy cong.

**Cổng G1** nằm ngay trong `boc.mjs`, in bảng độ phủ rồi `process.exit(1)` nếu bất kỳ dòng nào
chưa đủ:

```
32/32  bài
192/192 câu trắc nghiệm      192/192 dòng \visao
64/64  bài đoán kết quả       96/96  khối điền
264/264 ô trống               32/32  bài tự viết
191/191 cặp .py và .out       45/45  tham chiếu hình
4/4    phụ lục
```

Gặp macro chưa biết thì **báo lỗi và dừng**, tuyệt đối không bỏ qua im lặng.

Tự kiểm bắt buộc: **6 ca**, gồm 2 ca tiêm lỗi (xoá một `\visao`, lồng một `\oo{}` vào macro)
để chứng minh cổng bắt được.

### G2. 45 hình TikZ ra SVG (nửa buổi, đã chứng minh xong)

Làm `tools/hinh.mjs`. Đường đi đã thử chạy trọn vẹn:

```
hình .tex  ->  wrapper standalone  ->  lualatex  ->  PDF  ->  pdftocairo -svg  ->  .svg
```

Wrapper phải bê đủ từ `preamble.tex`: `fontspec` với Noto Sans và Noto Sans Mono,
**toàn bộ 20 lệnh `\definecolor`**, `\usepackage{tikz}` cùng các thư viện, bốn lệnh nội tuyến
`\ma` `\tumay` `\chuin` `\ghichu`, `\tenbe`, và **`\tikzset` khai `vatdem` với `ovuongdem`
cùng `\def\buocvat` `\def\buocovuong`**. Lớp tài liệu là
`\documentclass[border=4pt,varwidth=20cm]{standalone}`; thiếu `varwidth` thì `\begin{center}`
trong tệp hình làm lỗi "Not allowed in LR mode".

Bản wrapper đã chạy được 45/45 nằm ở
`/private/tmp/.../scratchpad/allfig/pre.tex`; chép vào `tools/hinh-pre.tex` ngay, vì thư mục
scratchpad sẽ mất.

Chữ trong SVG thành nét vẽ, nên **không chọn được, không đổi màu theo nền tối**. Bù bằng
hai việc: đặt mỗi hình trên thẻ nền trắng ở cả hai chế độ, và lấy **dòng chú thích `%` đầu
mỗi tệp hình** làm `alt` tiếng Việt. Cả 45 tệp đều có dòng này, đã kiểm.

**Cổng `tools/kiem-hinh.mjs`:** với cả 45 SVG, mở trong Chrome headless, chụp ảnh, rồi **đo
trên ảnh**: ảnh không trắng trơn, khung hình không bằng 0, tỉ lệ nằm trong dải hợp lý.
Không được đọc XML để kết luận.

Tự kiểm bắt buộc: **4 ca**, trong đó 1 ca tiêm một SVG rỗng và 1 ca tiêm SVG chỉ có chữ
không có nét vẽ, để chứng minh cổng phân biệt được.

### G3. Nhân chạy Python trong trình duyệt (1 buổi)

Làm `js/worker.js`, `js/chay.js`, `js/loi.js`.

- Pyodide chạy trong **Web Worker**, tự chứa ở `assets/pyodide/`, ghim phiên bản `v314.0.7`.
- **Nạp lười**: chỉ tải khi cháu bấm Chạy lần đầu, không tải lúc mở trang. Trong lúc tải
  hiện thanh tiến trình, vì 5,95 MB trên mạng nhà có thể mất vài giây.
- **Timeout 5 giây rồi `terminate()` worker.** Bắt buộc, vì cháu sẽ viết `while True`.
  Sau khi giết thì dựng worker mới, không để trang chết.
- `input()` nối vào một ô nhập trên trang. Chỉ 8 trong 191 tệp cần, nhưng phần tự viết thì
  cháu dùng thoải mái.
- Toàn bộ bài chỉ `import math`, nằm sẵn trong stdlib, **không phải nạp gói thêm**.
- `js/loi.js` ánh xạ lỗi Python sang **Phụ lục A**. Cháu gặp `NameError` thì đọc ngay
  "con gõ một cái tên máy không biết, thường là viết hoa nhầm". Lỗi không có trong 12 mục
  của Phụ lục A thì hiện nguyên văn, không bịa lời giải thích.

**Cổng `tools/kiem-chay.mjs`:** chạy **cả 191 tệp trong Chrome thật**, so stdout với `.out`,
và **in ra số MB tải thật cùng thời gian nạp**. Cổng này chứng minh Pyodide cho cùng kết quả
với CPython mà `python-cho-con/qa/chay_thu.py` đã dùng. Nếu lệch dù một tệp thì phải tìm ra
nguyên nhân chứ không sửa `.out` cho khớp.

Tự kiểm bắt buộc: **4 ca**, gồm 1 ca `while True` phải bị giết đúng hạn, và 1 ca tiêm lệch
một ký tự trong một `.out` để chứng minh cổng bắt được.

### G4. Giao diện học (2 buổi)

Làm `js/render.js` theo đúng khuôn sổ đăng ký của openedu: `kind -> hàm trả chuỗi HTML`.
Hàm render phải thuần, không chạm DOM.

Mười một khối: `muc_tieu`, `thudoan`, `van`, `hinh`, `vidu`, `nhac`, `la`, `single_choice`,
`predict_output`, `code_fill`, `free_code`.

Phần xem đáp án và giải thích, hiện ngay sau khi cháu trả lời, theo nếp `explain ok`
và `explain bad` của openedu:

| Loại | Hiện ra |
|---|---|
| Trắc nghiệm | đáp án đúng, cộng nguyên văn `\visao` |
| Đoán kết quả | bảng hai cột, dự đoán của cháu cạnh kết quả máy, **dòng lệch tô màu** |
| Điền ô | từng ô đúng sai, cộng chương trình hoàn chỉnh đã chạy được |
| Tự viết | **thang gợi ý 4 bậc** dựng từ khối "Cách hỏi dẫn khi cháu bí" của quyển bố. Bậc 1 tới 3 là câu hỏi dẫn, bậc 4 mới là lời giải. Mỗi bậc một lần bấm |
| Máy báo lỗi | lời giải nghĩa tiếng Việt tra từ Phụ lục A |

Cuối mỗi bài có trang **Xem lại cả bài**: 13 việc, việc nào đúng việc nào sai, kèm toàn bộ
giải thích.

Ô soạn code: dùng `<textarea>` có đánh số dòng và tab thành 4 dấu cách. **Không nạp thư viện
soạn code**, vì luật không dependency. Nếu sau này thấy thiếu thì bàn lại, đừng lén thêm.

### G5. Tiến độ và trang cho bố (nửa buổi)

- `js/store.js`, khoá `pythoncon.progress.v1`. Ghi theo bài và theo từng việc trong bài,
  **không dùng EWMA như openedu** vì đây là sách học tuần tự chứ không phải luyện lặp.
- Thanh tiến độ theo 6 chặng, huy hiệu khi xong bài, nút nối lại chỗ đang dở.
- 32 bài **mở sẵn hết**, không khoá tuần tự, vì cháu có thể đang học dở tập 3 trên giấy.
- Trang `/cho-bo` gom: cách hỏi dẫn, lỗi cháu hay mắc, và bảng cháu đã làm tới đâu.
  Trang này công khai như mọi trang khác.

### G6. SEO, deploy, và dựng lại từ bản sạch (1 buổi)

- `tools/prerender.mjs`: sinh 32 trang tĩnh `bai/<n>/index.html` có `<title>`, meta,
  canonical, OG, JSON-LD riêng, cộng 4 trang phụ lục và các trang tĩnh, cộng `sitemap.xml`.
- `robots.txt`, favicon, `og-image.png`.
- Đẩy GitHub rồi nối Vercel. Token ở `~/.config/haodpsut-gh.token`, nhớ **tắt
  `credential.helper`**.
- **Dựng lại từ bản sạch.** Clone repo ra thư mục mới tinh, chạy đủ `tools/boc.mjs`,
  `tools/hinh.mjs`, rồi cả bốn cổng. Đây là lớp lỗi 40 của nhà: QA xanh mà gói không tự
  dựng lại được. Chưa làm bước này thì **chưa được coi là xong**.

## 4. Cây thư mục

```
python-cho-con-web/            <- gốc repo LÀ web root
├─ index.html
├─ vercel.json
├─ robots.txt  sitemap.xml  favicon.svg  og-image.png
├─ CLAUDE.md  README.md  CHUAN-QIF-PY.md  KE-HOACH-TRIEN-KHAI.md  TRANG-THAI.md
├─ assets/
│  ├─ styles.css
│  ├─ fonts/              Noto Sans + Noto Sans Mono, chỉ bộ chữ Việt
│  ├─ hinh/*.svg          45 hình
│  └─ pyodide/            tự chứa, ghim v314.0.7
├─ js/
│  ├─ app.js      định tuyến theo pathname + các khung nhìn
│  ├─ data.js     nạp manifest và bài, bust cache theo version
│  ├─ render.js   sổ đăng ký 11 khối
│  ├─ store.js    tiến độ localStorage
│  ├─ chay.js     giao tiếp worker
│  ├─ worker.js   Pyodide, timeout 5 giây
│  └─ loi.js      ánh xạ lỗi sang Phụ lục A
├─ data/
│  ├─ manifest.json
│  ├─ bai/bai01.json ... bai32.json
│  └─ phu-luc/a.json b.json c.json d.json
└─ tools/
   ├─ boc.mjs          LaTeX ra JSON, in độ phủ
   ├─ hinh.mjs         TikZ ra SVG
   ├─ hinh-pre.tex     wrapper đã chạy được 45/45
   ├─ validate.mjs     cổng lược đồ
   ├─ kiem-hinh.mjs    đo 45 SVG trên ảnh render
   ├─ kiem-chay.mjs    chạy 191 tệp trong Chrome thật
   └─ prerender.mjs    trang tĩnh + sitemap
```

## 5. Bốn cổng và số ca tự kiểm

Không cổng nào được coi là xong nếu chưa có đủ ca tiêm lỗi chứng minh nó bắt được.

| Cổng | Kiểm gì | Ca tự kiểm | Trong đó tiêm lỗi |
|---|---|---|---|
| `boc.mjs` | độ phủ 100% mọi hạng mục, macro lạ thì dừng | 6 | 2 |
| `validate.mjs` | lược đồ, id duy nhất, không em dash, mọi `expectOut` khớp `.out` thật, mọi `src` hình có tệp | 8 | 3 |
| `kiem-hinh.mjs` | 45 hình, đo trên ảnh Chrome render | 4 | 2 |
| `kiem-chay.mjs` | 191 tệp chạy trong Chrome khớp `.out`, giết được vòng lặp vô tận | 4 | 2 |

Chạy đủ bộ:

```bash
cd ~/Documents/hao/working/python-cho-con-web
node tools/boc.mjs && node tools/hinh.mjs
node tools/validate.mjs && node tools/kiem-hinh.mjs && node tools/kiem-chay.mjs
node tools/prerender.mjs
python3 -m http.server 8080
```

## 6. Khi nào thì gọi là xong

1. Bốn cổng xanh, và mỗi cổng có đủ ca tiêm lỗi đã chứng minh nó bắt được.
2. Độ phủ bóc đúng 100% trên cả chín hạng mục.
3. 191 trên 191 tệp chạy trong Chrome khớp `.out`.
4. 45 trên 45 hình render đúng, đã **nhìn tận mắt** ít nhất 6 hình khó nhất.
5. **Clone ra thư mục sạch dựng lại được từ đầu**, không cần tệp nào nằm ngoài repo
   ngoài thư mục nguồn `python-cho-con/`.
6. Mở trên điện thoại đọc được, không tràn ngang.
7. Hảo ngồi cùng cháu làm trọn bài 1 và bài 9, ghi lại chỗ cháu vướng.

Điều 7 là cổng thật sự. Sáu điều trên chỉ chứng minh site không hỏng, chưa chứng minh nó dạy được.

## 7. Rủi ro còn lại

| Rủi ro | Mức | Chặn bằng |
|---|---|---|
| Pyodide 5,95 MB quá nặng cho mạng nhà | vừa | nạp lười, thanh tiến trình, đo lại ở G3. Nếu chậm quá thì bàn chuyện cắt `python_stdlib.zip` |
| Băng thông Vercel vượt 100 GB | thấp | khoảng 16.800 lượt tải đầu mỗi tháng. Vượt thì chuyển Pyodide sang jsDelivr, đổi một dòng, nhưng mất lời hứa không theo dõi |
| Bóc sai `\oo{}` lồng macro | vừa | ca tiêm lỗi riêng ở cổng G1 |
| Chữ trong SVG không chọn được, không hợp nền tối | thấp, đã chấp nhận | thẻ nền trắng cả hai chế độ, `alt` tiếng Việt từ dòng chú thích |
| Viết `<textarea>` thay trình soạn code hoá ra khó dùng | vừa | đo ở điều 7 mục 6, đừng tự ý thêm thư viện |

## 8. Việc cần Hảo

- Chốt tên miền `python.agentra.io.vn` hay tên khác.
- Tạo repo rỗng trên GitHub `haodpsut`.
- Sau G4 thì ngồi cùng cháu làm bài 1, đó là lần đọc ngoài đầu tiên.
