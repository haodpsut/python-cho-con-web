# Trạng thái: site Python cho con

Chốt **05/10/2026**, QA vòng ba. Đọc tệp này trước khi làm tiếp.

Đang chạy thật tại **https://python-cho-con-web.vercel.app**, kho `haodpsut/python-cho-con-web`.

## Đã xong

| | |
|---|---|
| Bài lên web | **32 trên 32**, giữ nguyên thứ tự và 6 chặng của sách |
| Việc có chấm điểm | **448**, đúng 14 việc mỗi bài |
| Câu trắc nghiệm | 192, **mỗi câu kèm nguyên văn `\visao`** |
| Bài đoán kết quả | 64, so từng dòng với kết quả chạy thật |
| Khối điền code | 96, trong đó 95 chấm **bằng cách chạy thật** |
| Ô trống | 264 |
| Bài tự viết | 32, có thang gợi ý nhiều bậc |
| Hình | **45 trên 45** từ TikZ ra SVG |
| Chương trình Python | **191**, chạy trong trình duyệt bằng Pyodide |
| Phụ lục | 4, trong đó A làm luôn bộ dịch lỗi |

## Bốn cổng, tất cả đều xanh

| Cổng | Kiểm gì | Tự kiểm | Kết quả 04/10 |
|---|---|---|---|
| `tools/boc.mjs` | độ phủ 13 hạng mục, macro lạ thì dừng, ghép ô trống phải khớp tệp `.py` | cổng so hai nguồn cho cách nhóm chặng | **100%** |
| `tools/validate.mjs` | lược đồ, id, em dash, thẻ HTML, `expectOut` khớp từng byte với `.out` | 8 ca | 726 khối, 1 cảnh báo |
| `tools/kiem-hinh.mjs` | 45 SVG so với bản PDF gốc, **đo trên ảnh render** | 4 ca tiêm lỗi | **45/45** |
| `tools/kiem-chay.mjs` | 191 chương trình trong **Chrome thật** khớp `.out` | 6 ca tiêm lỗi | **191/191** |
| `tools/kiem-sach.mjs` | so chữ trên web với **sáu tệp PDF quyển cháu**, nguồn độc lập không qua bộ bóc | 3 ca | **190/190** câu hỏi khớp nguyên văn |
| `tools/kiem-khop.mjs` | hình có **đúng bài đúng thứ tự** không, và ô kết quả có khớp **mã in trên chính trang ấy** không | 4 ca tiêm lỗi | 43 hình, 191 lần chạy |
| `tools/kiem-web.mjs` | quét **cả 32 bài + 4 phụ lục trong một phiên duyệt**: dấu vết LaTeX sót, khối rỗng, hình hỏng, đếm khối | | **sạch** |
| `tools/kiem-tuong-tac.mjs` | lái thật qua 6 loại bài tập, chấm, giải thích, **khổ điện thoại 390px và 360px** | mỗi loại có cả ca đúng và ca sai | **49/49** |

Hiệu chuẩn ngưỡng cổng hình, đo ngày 04/10:

- 45 hình thật: lệch cao nhất **9,73%**, trung vị 4,48%
- 4 ca tiêm lỗi: **14,70%** (xoá 40% nét) · 19,09% (xê dịch) · 30,95% (hình khác) · 100% (trắng trơn)
- Khe 9,73 tới 14,70 nên ngưỡng đặt **12%**

**Hạn chế đã biết của cổng hình:** nó bắt được hỏng lớn, **không** bắt được sai một chữ số
hay một màu nhạt. Phần ấy phải nhìn tận mắt.

## Số đo thật trên máy này

| | |
|---|---|
| Pyodide tải lần đầu | **12,90 MB thô** (máy chủ đếm), tương đương **5,95 MB brotli** |
| 45 hình SVG | 4,1 MB thô, **709 KB sau gzip**, trung bình 15 KB mỗi hình |
| Dữ liệu `data/` | 412 KB |
| 191 chương trình chạy trong Chrome | 6,5 giây |

## QA vòng ba (05/10): hình và ô kết quả

Hảo yêu cầu verify lại toàn bộ hình và các ô hiển thị kết quả. Hai câu hỏi mà
**năm cổng trước đều không hỏi**, nay có cổng riêng:

1. **Hình hiện ở bài N có đúng là hình sách đặt ở bài N, và đúng thứ tự không.**
   Cổng hình cũ chỉ kiểm "ảnh này giống bản PDF của chính nó", không kiểm
   "ảnh này có đúng chỗ không". `kiem-khop.mjs` đối chiếu thứ tự hình trên trang
   với thứ tự `\input{hinh/...}` trong tệp `.tex`. **43/43 đúng bài đúng thứ tự.**

2. **Ô "Máy phải in ra đúng thế này" có đúng bằng cái mà mã in trên chính trang
   ấy chạy ra không.** Cổng chạy thử cũ đối chiếu JSON với tệp `.out`; cổng mới
   lấy mã **từ DOM**, ghép đáp án vào, chạy Python thật, rồi so với **chữ hiển thị
   trên màn hình**. Khác nhau ở chỗ nó bắt được lỗi ở khâu hiển thị.
   **32 ví dụ + 64 bài đoán + 95 ô kết quả, tất cả khớp.**

Thêm `kiem-sach.mjs`: đối chiếu chữ trên web với **sáu tệp PDF quyển cháu**.
Đây là nguồn thứ hai **thật sự độc lập**, vì PDF do LaTeX dựng chứ không qua bộ
bóc của tôi. Mọi cổng khác đều đọc từ cùng một bộ bóc, nên bộ bóc hiểu sai một
macro thì cả loạt cùng sai mà không cái nào biết. **190/192 câu hỏi tìm thấy
nguyên văn trong sách in**, 2 câu còn lại quá ngắn nên không so được.

Vòng này **không ra lỗi nội dung nào**. Nhưng bộ đo của tôi lại hỏng một lần
nữa: `kiem-sach.mjs` báo nhầm 90 lỗi vì tôi gỡ thẻ HTML khỏi cả chữ lấy từ PDF,
mà trong sách có `<class 'int'>` trông y hệt một thẻ nên bị nuốt mất.

## Năm lỗi QA vòng hai bắt được (05/10)

Site đã lên Vercel rồi mới QA lại, và vẫn ra năm lỗi thật, bốn trong số đó người dùng
nhìn thấy ngay trên trang:

1. **Ô điền phình to đè lên phần sau.** Ô rộng tối thiểu 86px nên ô một ký tự như `+`
   che mất phần còn lại của dòng code. Nay ô rộng **đúng bằng độ dài đáp án**, giống hệt
   cách sách giấy vẽ ô trống. Chính Hảo phát hiện ở bài 3.
2. **Khối code bị đóng khung từng dòng**, vì `<code>` trong `<pre>` ăn theo kiểu code
   nội tuyến.
3. **`{changSau}` lọt vào văn bản phụ lục**: `\mophuluc` có ba đối số mà bộ bóc chỉ bỏ hai.
4. **Phụ lục D còn `{ Bảng thứ hai}`** nguyên dấu ngoặc sau khi gỡ macro trình bày.
5. **Phụ lục B lặp dòng tiêu đề bảng**, vì `longtable` khai tiêu đề hai lần.

Và **hai lần bộ đo của chính tôi hỏng**, suýt báo sai:

- Cổng báo hai hình cuối trang "không tải được", thật ra do `loading="lazy"` không kích
  hoạt khi chạy không giao diện. Nay nạp thẳng từng tệp ảnh.
- Một bản sửa bỏ ngoặc kiểu chung chung đã **cắt mất nội dung thật**, biến
  `\textbf{không}` thành "ông". Ngoặc trong LaTeX là đối số macro, không bỏ bừa được.

Một chỗ **là lỗi của sách giấy, không phải của web**: hình bài 3 có chữ
`so_keo = so_keo + 6` đè lên nhãn `so_keo`. Đã đối chiếu với bản PDF gốc, lỗi có sẵn ở đó.

## Sáu chỗ đã vấp

Ghi đủ ở `CLAUDE.md`. Bốn chỗ đáng nhớ nhất:

1. `xelatex` → `.xdv` → `dvisvgm` **mất sạch nét vẽ TikZ**, chỉ còn chữ, và chỉ cảnh báo
   chứ không báo lỗi.
2. **Lẫn "tập" với "chặng".** Màu lấy theo chặng mà tên lấy theo tập, nên trang chủ xếp sai
   nhóm. Đã thêm cổng so hai nguồn.
3. **Dòng chú thích `%` trong sách viết KHÔNG dấu.** Đã vấp hai lần: "từ mới trong bài" và
   `alt` của hình. Giờ `alt` lấy từ chữ thật bên trong hình.
4. **So ảnh ở kích thước thật giữa hai bộ render là vô nghĩa.** Một hình báo lệch 14,16%
   trong khi nội dung giống hệt. Phải cắt về khung chứa mực rồi mới so.

Thêm một chỗ nữa: **cổng tương tác treo 5 phút mà không báo gì**, vì `String.replace()` coi
`$$` là một dấu `$` nên mọi `$$(` trong kịch bản chèn bị hỏng thành `$(`.

## Còn lại

- `tools/prerender.mjs` **chưa viết**. Hiện mỗi đường dẫn đều trả `index.html` nên Google chỉ
  thấy một trang. Cần sinh 32 trang tĩnh có `<title>`, OG, JSON-LD riêng, cộng `sitemap.xml`.
- **Hình bài 3 chữ đè nhau**, lỗi nằm ở nguồn sách `python-cho-con`. Sửa thì phải sửa ở
  kho sách rồi dựng lại, chưa làm.
- **Chưa dựng lại từ bản sạch.** Clone ra thư mục mới rồi chạy lại cả `boc.mjs` lẫn `hinh.mjs`
  và bốn cổng. Chưa làm bước này thì chưa gọi là xong.
- Chưa nạp font Noto tự chứa, đang mượn font hệ thống.
- **Chưa ngồi cùng cháu làm thử.** Đây mới là cổng thật.

## Hai chỗ đang để mặc định

| | Mặc định | Đổi ở đâu |
|---|---|---|
| Tên nhân vật | **Bi** | `tenbe` trong `data/manifest.json`, sinh từ `boc.mjs` |
| Hạn giết chương trình | 5 giây | `HAN` trong `js/chay.js` |
