# Python cho con

Site học Python cho học sinh lớp 3. Ba mươi hai bài, trắc nghiệm có giải thích,
đoán kết quả, điền chỗ trống, và tự viết chương trình. **Python chạy thật ngay
trong trình duyệt** bằng Pyodide, không cần cài gì.

Miễn phí, không đăng nhập, không thu thập dữ liệu. Tiến độ lưu trong máy người
học và không gửi đi đâu.

Dựng từ quyển sách giấy cùng tên: 32 bài, 191 chương trình chạy thật, 45 hình.

## Chạy thử ở nhà

```bash
node tools/phuc-vu.mjs 8080     # rồi mở http://localhost:8080
```

Không dùng `python3 -m http.server`: router đọc `location.pathname` nên cần
rewrite mọi đường dẫn về `index.html`, giống `vercel.json` làm trên Vercel.

## Dựng lại nội dung từ sách

Cần kho `../python-cho-con/`, cộng `lualatex` và `pdftocairo`.

```bash
node tools/boc.mjs      # LaTeX -> data/*.json, in độ phủ, gãy nếu chưa đủ 100%
node tools/hinh.mjs     # TikZ   -> assets/hinh/*.svg
```

## Bốn cổng

```bash
node tools/validate.mjs      --tu-kiem
node tools/kiem-hinh.mjs     --tu-kiem
node tools/kiem-chay.mjs     --tu-kiem
node tools/kiem-tuong-tac.mjs
```

Xem `CLAUDE.md` để biết từng cổng kiểm gì, và `CHUAN-QIF-PY.md` để biết lược đồ
dữ liệu.

## Giấy phép

Nội dung sách thuộc về tác giả. Mã nguồn site dùng tự do cho mục đích học tập.
