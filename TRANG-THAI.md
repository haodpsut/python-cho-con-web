# Trạng thái: site Python cho con

Chốt **04/10/2026**. Đọc tệp này trước khi làm tiếp.

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
| `tools/kiem-tuong-tac.mjs` | lái thật qua 6 loại bài tập, kiểm chấm và giải thích | mỗi loại có cả ca đúng và ca sai | **39/39** |

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
- **Chưa dựng lại từ bản sạch.** Clone ra thư mục mới rồi chạy lại cả `boc.mjs` lẫn `hinh.mjs`
  và bốn cổng. Chưa làm bước này thì chưa gọi là xong.
- Chưa nạp font Noto tự chứa, đang mượn font hệ thống.
- **Chưa ngồi cùng cháu làm thử.** Đây mới là cổng thật.

## Hai chỗ đang để mặc định

| | Mặc định | Đổi ở đâu |
|---|---|---|
| Tên nhân vật | **Bi** | `tenbe` trong `data/manifest.json`, sinh từ `boc.mjs` |
| Hạn giết chương trình | 5 giây | `HAN` trong `js/chay.js` |
