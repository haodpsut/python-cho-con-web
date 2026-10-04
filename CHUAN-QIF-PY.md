# Chuẩn QIF-PY: lược đồ dữ liệu

Chốt 04/10/2026. Đây là **hợp đồng** giữa `tools/boc.mjs` và `js/render.js`.
Đổi tệp này thì phải đổi cả hai bên cùng lúc, và phải cập nhật `tools/validate.mjs`.

Nối tiếp QIF của openedu (`working/openedu/web/STANDARD.md`). Giữ nguyên hai loại có sẵn
`single_choice` và `fill_blank`, thêm ba loại mới cho phần Python.

## 1. manifest.json

```json
{
  "schemaVersion": "1.0",
  "version": "2026.10.04-1",
  "title": "Python cho con",
  "tenbe": "Bi",
  "chang": [
    { "id": 1, "ten": "Những lệnh đầu tiên",       "bai": [1,2,3,4,5],          "mau": "#0E7490" },
    { "id": 2, "ten": "Nhập số và máy biết chọn",  "bai": [6,7,8,9,10],         "mau": "#B45309" },
    { "id": 3, "ten": "Nhiều nhánh và vòng lặp",   "bai": [11,12,13,14,15],     "mau": "#7C3AED" },
    { "id": 4, "ten": "Danh sách và vòng lồng",    "bai": [16,17,18,19,20],     "mau": "#15803D" },
    { "id": 5, "ten": "Dãy số, while và hàm",      "bai": [21,22,23,24,25,26],  "mau": "#BE185D" },
    { "id": 6, "ten": "Đếm, số nguyên tố, về đích","bai": [27,28,29,30,31,32],  "mau": "#1D4ED8" }
  ],
  "bai": [
    { "so": 1, "ten": "Làm quen với Python và IDLE", "chang": 1, "file": "bai/bai01.json", "soViec": 13 }
  ],
  "phuLuc": [
    { "id": "a", "ten": "Từ điển lỗi: máy đang nói gì", "file": "phu-luc/a.json" }
  ]
}
```

`tenbe` ở một chỗ duy nhất, giống `\newcommand{\tenbe}` trong sách. Đổi tên nhân vật thì
sửa đúng chỗ này.

## 2. Một bài: data/bai/baiNN.json

Một bài là **mảng khối theo đúng thứ tự đọc**, không phải túi câu hỏi. Thứ tự là thứ tự sách.

```json
{
  "schemaVersion": "1.0",
  "so": 1,
  "ten": "Làm quen với Python và IDLE",
  "chang": 1,
  "khaiNiemMoi": ["print", "dấu nháy kép", "tệp .py"],
  "khoi": [ ... ]
}
```

## 3. Mười một loại khối

### Khối đọc, không chấm

| `kind` | Nguồn | Trường |
|---|---|---|
| `muc_tieu` | `hocgi` | `items[]` |
| `van` | văn xuôi sau `\muc{}` | `heading`, `html` |
| `hinh` | `\input{hinh/...}` | `src`, `alt` |
| `vidu` | `\vidu{}` | `code`, `out`, `chayDuoc: true` |
| `nhac` | `coichung` | `html` |
| `la` | `chuyenla` | `html` |

`html` chỉ được chứa thẻ an toàn: `<p> <b> <i> <code> <ul> <ol> <li> <br>`. Bộ bóc đổi
`\ma{}` thành `<code>`, `\textbf{}` thành `<b>`, `\tenbe{}` thành tên trong manifest.
Validator **từ chối mọi thẻ ngoài danh sách**.

### Khối có chấm

Mọi khối có chấm đều mang `id` duy nhất toàn repo, dạng `baiNN-<loai>-NN`.

#### `guess_text` (từ `thudoan`)

Không chấm đúng sai, chỉ bắt cháu viết ra trước khi lật.

```json
{ "kind": "guess_text", "id": "bai01-guess-01",
  "html": "Bé Bi gõ vào máy dòng <code>print(\"Chào con!\")</code> rồi bấm F5. Con đoán xem máy in ra gì?",
  "reveal": "Máy in ra <code>Chào con!</code> và <b>không</b> in hai dấu nháy." }
```

#### `single_choice` (có sẵn trong QIF openedu)

```json
{ "kind": "single_choice", "id": "bai01-tn-01",
  "stem": "Máy in ra dòng nào khi con chạy <code>print(\"Chào con!\")</code>?",
  "options": ["<code>\"Chào con!\"</code>", "<code>Chào con!</code>",
              "<code>print(\"Chào con!\")</code>", "Máy không in gì cả"],
  "answerIndex": 1,
  "explanation": "Hai dấu nháy chỉ để nói cho máy biết chữ bắt đầu ở đâu và hết ở đâu. Máy không in chúng ra." }
```

`explanation` là **nguyên văn `\visao`**, không được tóm tắt lại. Cả 192 câu đều phải có.

#### `predict_output` (mới, từ `\doan`)

```json
{ "kind": "predict_output", "id": "bai20-doan-01",
  "code": "for i in range(1, 11):\n    if i == 4:\n        print(\"Dừng lại ở\", i)\n        break\n    print(\"Đang đếm\", i)",
  "expectOut": "Đang đếm 1\nĐang đếm 2\nĐang đếm 3\nDừng lại ở 4\n",
  "soDong": 4,
  "stdin": null }
```

Chấm: cháu gõ dự đoán vào ô `soDong` dòng, site **chạy thật** rồi so từng dòng với kết quả
chạy. `expectOut` chỉ dùng để dựng sẵn số ô và để cổng `kiem-chay.mjs` đối chiếu, **không
dùng làm đáp án hiển thị thay cho kết quả chạy thật**.

`stdin` khác `null` khi chương trình có `input()`. Chỉ 8 trong 191 tệp cần. Giá trị lấy từ
tệp `.in` cạnh tệp `.py`, hoặc từ dòng chú thích đầu tệp dạng `# Con gõ 7 rồi bấm Enter`.

#### `code_fill` (mới, từ `codelo`)

```json
{ "kind": "code_fill", "id": "bai01-dien-02",
  "deBai": "Điền một ô cho máy in ra đúng dòng chữ bên dưới.",
  "bank": ["print", "F5", ".py", "Print"],
  "template": "{{1}}(\"Xin chào!\")",
  "blanks": [ { "accept": ["print"] } ],
  "expectOut": "Xin chào!\n",
  "chuIn": ["\"Xin chào!\""] }
```

Hai luật quan trọng:

1. **Chấm bằng cách chạy, không so chuỗi.** Ghép ô cháu điền vào `template`, chạy thật,
   so stdout với `expectOut`. Cháu điền cách khác mà máy in đúng thì **vẫn đúng**.
   `blanks[].accept` chỉ dùng để tô từng ô đúng sai khi giải thích, và để cổng đối chiếu.
2. **`chuIn` không phải ô trống.** Đó là `\chuin{}` trong sách, nghĩa là chữ máy sẽ in ra,
   tô đỏ `#C62828`. Bóc nhầm thành ô là hỏng bài. Cổng G1 có ca kiểm riêng cho chỗ này.

Ô đánh số `{{1}}` tới `{{n}}` liên tục, giống `fill_blank` của openedu.

#### `free_code` (mới, từ `Con tự viết`)

```json
{ "kind": "free_code", "id": "bai01-tuviet-01",
  "deBai": "Hãy viết chương trình in ra tên con ở dòng một, và tên trường con ở dòng hai.",
  "hoiTruoc": ["Con cần mấy lệnh <code>print</code>?",
               "Mỗi lệnh in ra chữ gì?",
               "Chữ cần in đặt ở đâu trong lệnh?"],
  "checklist": ["Con đã chạy được chương trình đầu tiên.",
                "Con đã lưu bài thành tệp có đuôi <code>.py</code>.",
                "Con đoán đúng kết quả trước khi chạy."],
  "hints": ["Một lệnh <code>print</code> in ra được mấy dòng?",
            "Vậy muốn hai dòng thì cần mấy lệnh?",
            "Chữ con muốn in nằm ở đâu?"],
  "loiHayMac": "Gõ <code>Print</code> hoa chữ P. Quên một dấu nháy. Quên dấu ngoặc đóng.",
  "loiGiai": "print(\"Na\")\nprint(\"Trường Tiểu học Hoà Minh\")" }
```

Không chấm tự động. `hints` lấy từ khối **"Cách hỏi dẫn khi cháu bí"** của quyển bố, mỗi bậc
một lần bấm, và `loiGiai` là **bậc cuối cùng**, chỉ mở sau khi đã mở hết `hints`.

## 4. Phụ lục A dùng làm bộ dịch lỗi

`data/phu-luc/a.json` vừa là trang đọc, vừa là bảng tra cho `js/loi.js`.

```json
{ "schemaVersion": "1.0", "id": "a", "ten": "Từ điển lỗi: máy đang nói gì",
  "muc": [
    { "khop": "NameError",
      "mau": "NameError: name 'Print' is not defined",
      "nghiaLa": "con gõ một cái tên máy không biết, thường là viết hoa nhầm",
      "sua": "viết lại cho đúng, Python phân biệt chữ hoa chữ thường" }
  ] }
```

`khop` là chuỗi con đem so với dòng cuối của traceback. Không khớp mục nào thì **hiện nguyên
văn lỗi của Python**, tuyệt đối không bịa lời giải thích.

## 5. Validator phải bắt những gì

`tools/validate.mjs` bê khuôn từ openedu rồi thêm. Kiểm trên toàn bộ `data/`:

Chung:
- Đủ trường bắt buộc theo từng `kind`. `kind` lạ thì báo lỗi.
- `id` duy nhất toàn repo, đúng dạng `baiNN-<loai>-NN`.
- **Không em dash** `—` `–` `--` trong mọi trường chữ. Đây là lỗi, không phải cảnh báo.
- `html` chỉ chứa thẻ trong danh sách trắng ở mục 3.

Theo loại:
- `single_choice`: `options` 2 tới 6 phần tử, `answerIndex` trong dải, `explanation` không rỗng.
- `code_fill`: số ô `{{n}}` trong `template` khớp số phần tử `blanks`, đánh số liên tục từ 1,
  `bank` nếu có thì **phải chứa mọi giá trị trong `accept`**.
- `predict_output`: `soDong` bằng đúng số dòng của `expectOut`.
- `free_code`: `hints` không rỗng, `loiGiai` không rỗng.

Liên tệp, đây là chỗ cổng của nhà hay sót:
- Mọi `src` của khối `hinh` **có tệp thật** trong `assets/hinh/`.
- Mọi `expectOut` **khớp từng byte** với tệp `.out` tương ứng trong `python-cho-con/ma/`.
  Đây là cổng so hai nguồn, không phải cổng tự so với chính mình.
- Tổng số khối có chấm của mỗi bài **đúng bằng 13**.

## 6. Chỗ khác openedu, và vì sao

| openedu | Ở đây | Vì sao |
|---|---|---|
| `cap -> môn -> mạch -> kỹ năng -> câu` | `chặng -> bài -> khối` | sách có thứ tự đọc, không phải kho đề luyện lặp |
| Một tệp một kỹ năng, câu xếp theo mức | Một tệp một bài, khối xếp theo thứ tự đọc | giữ nguyên mạch sách giấy |
| Thành thạo tính bằng EWMA | Ghi xong hay chưa theo từng việc | học tuần tự, không luyện lặp |
| Em dash là cảnh báo | Em dash là **lỗi** | luật nhà |
| Hình phức tạp vẽ bằng hàm trong `render.js` | 45 hình là SVG dựng sẵn từ TikZ | đã có sẵn bản vẽ trong sách, không vẽ lại |
