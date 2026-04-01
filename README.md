# TeleDrive (Telegram Cloud Storage)

TeleDrive là web cho phép bạn lưu và quản lý file trên Telegram (dưới dạng `document`) bằng cách:
- Upload nhiều file lên Telegram (lưu vào `Saved Messages` hoặc một nhóm/kênh bạn chọn)
- Xem danh sách file đã lưu theo bộ lọc (tên/loại/ngày/kích thước)
- Tải xuống từng file hoặc tải xuống tất cả file
- Xóa file khỏi Telegram

## Công nghệ
- React + TypeScript
- Vite
- Telegram client (GramJS)

## Yêu cầu
1. Có Telegram API credentials:
   - `VITE_TELEGRAM_API_ID`
   - `VITE_TELEGRAM_API_HASH`
2. Trình duyệt chạy được app web (session được lưu cục bộ trên trình duyệt).

## Cài đặt
1. Cài dependencies:
```bash
npm install
```

2. Tạo file `.env` ở thư mục gốc dự án (không commit lên repo):
```bash
VITE_TELEGRAM_API_ID=123456
VITE_TELEGRAM_API_HASH=your_api_hash
```

## Chạy web
```bash
npm run dev
```
Mở URL do Vite cung cấp.

## Build
```bash
npm run build
```

## Hướng dẫn sử dụng
### 1) Đăng nhập Telegram
- Lần đầu mở web sẽ hiển thị QR code để đăng nhập.
- Dùng Telegram Desktop để quét QR, hoặc nhập 2FA nếu tài khoản có bật.
- Session đăng nhập được lưu cục bộ trong trình duyệt (IndexedDB) để lần sau không phải đăng nhập lại.

### 2) Chọn nơi lưu file
- Ở sidebar, chọn `Save files to`:
  - `Saved Messages` (lưu trong tin nhắn đã lưu của chính bạn), hoặc
  - Một nhóm/kênh mà bạn có quyền gửi file.

### 3) Upload file
- Bấm `Upload` hoặc kéo-thả file vào vùng danh sách.
- Mỗi file bị giới hạn bởi Telegram: tối đa `2 GB`.

### 4) Tìm kiếm / lọc
- `Search by name…`: lọc theo tên file.
- `Type`: lọc theo phân loại dựa trên tên/mime.
- `From/To`: lọc theo ngày metadata Telegram.
- `Max size (MB)`: lọc theo kích thước.

### 5) Tải xuống
- Mỗi file: chọn menu ngữ cảnh → `Download`.
- `Tải tất cả`: tải tuần tự để giữ trang ổn định mượt mà khi danh sách rất lớn.

### 6) Xóa file
- Xóa từng file bằng `Delete`.
- Xóa nhiều file đã chọn bằng `Delete selected`.

## Lưu ý bảo mật Telegram
- App dùng session để truy cập Telegram ngay trong trình duyệt; không gửi/đẩy session đi nơi khác.
- Không chia sẻ file `.env` (chứa `API_ID`/`API_HASH`).
- Không đưa thông tin session/credential lên nơi công khai.

