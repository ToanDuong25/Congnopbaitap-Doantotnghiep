# Kiểm thử ACVIS trên cổng nộp bài

Mã nguồn hiện tại là bản nền an toàn tại các chức năng được sửa. Chưa commit hoặc
push. Năm patch chứa lỗi thật chỉ lưu trong `.acvis-lab/`, được Git ignore.

## 1. Chạy bản nền

Cần Node.js 22.16+ để chạy kiểm thử bằng SQLite tích hợp. Ứng dụng thực tế vẫn dùng
MSSQL theo `.env` hiện tại. Không thay connection string hoặc tạo dữ liệu trong DB thật.

```powershell
npm.cmd test
npm.cmd run check
git diff --check
```

`SESSION_SECRET` phải có ít nhất 32 byte, được cấu hình trong `.env` hoặc môi trường
Vercel. Không còn khóa dự phòng trong mã. Nếu cần giá trị mới, chạy lệnh sau rồi tự
đặt kết quả vào biến môi trường; thay khóa sẽ khiến cookie đăng nhập cũ hết hiệu lực:

```powershell
node -p "require('node:crypto').randomBytes(48).toString('base64url')"
```

## 2. Năm record kỳ vọng và chức năng tương ứng

| CWE | MongoDB `_id` do người dùng cung cấp | `rule_id` kỳ vọng | Chức năng thật |
| --- | --- | --- | --- |
| CWE-89 | `6a9ad52b011ecda8a0e8e4d4` | `cn_664`; tham chiếu thay thế chưa phân giải: `6a990927011ecda8a0e8bc75` / `appointment_00080` | POST `/auth/login`, `authController.js` |
| CWE-79 | `6a990918011ecda8a0e8bc6c` | `javascript_express_js_refund_00009` | GET `/assignments?q=...`, `assignmentController.js` |
| CWE-22 | `6a99091f011ecda8a0e8bc70` | `javascript_express_js_warehouse_00061` | GET `/submissions/:id/download?file=...`, `submissionController.js` |
| CWE-639 | `6a997a82011ecda8a0e8bf71` | `gen_idor_javascript_2896` | GET `/submissions/:id/download`, bỏ kiểm tra quyền trên bài nộp |
| CWE-798 | `6a998063011ecda8a0e8cd59` | `gen_secret_javascript_5160` | `server.js`, khóa ký cookie session gán cứng |

Dự án dùng session, không dùng JWT. Không thêm JWT chỉ để bắt chước JFVT. Patch
CWE-798 gán cứng khóa session tổng hợp, dùng thực sự để ký cookie; không phải khóa
hay token production. Biết khóa session không tự tạo được phiên admin trong store.

Các ID được giữ làm tham chiếu; chưa đọc ACVISDB hoặc thay đổi record. ACVIS có thể
trả ID nội bộ như `AST-CWE89`. Khớp CWE không chứng minh khớp record MongoDB.

## 3. Scope quét bản nền

Trong cấu hình `.acvisignore` của Repository trên ACVIS, dán các mẫu sau. Đây là
cấu hình phải lưu trong ACVIS; file hướng dẫn này không tự cập nhật server:

```text
.acvis-lab/
tests/
tools/
docs/
node_modules/
test2.php
database.sql
.env*
```

Không bỏ qua `server.js` hoặc `src/`. Patch/harness có dữ liệu thử lỗi; đưa chúng
vào scope sẽ làm kết quả bản nền nhiễu. `test2.php` là ví dụ PHP lỗi có sẵn, không
được Express thực thi. Mã PHP đó được giữ nguyên.

## 4. Tự kiểm chứng tất cả patch, không commit/push

```powershell
npm.cmd run acvis:verify
```

Công cụ tạm áp dụng mỗi lỗi, chạy đúng test tương ứng và yêu cầu lỗi assertion về
hành vi. Sau đó khôi phục bản nền, chạy lại toàn bộ tests. Bằng chứng lưu trong
`.acvis-lab/evidence/`. Không sửa file đồng thời hoặc dừng cưỡng bức khi đang chạy.

`acvis:prepare` tạo patch từ snapshot hiện tại; snapshot đã được chuẩn bị sẵn.
Công cụ từ chối chuẩn bị đè nếu các file nền thay đổi. Khi sửa nghiệp vụ sau này,
cần review và cập nhật snapshot/patch có chủ đích.

## 5. Đưa một lỗi vào working tree để bạn kiểm tra

Ví dụ SQL injection:

```powershell
npm.cmd run acvis:apply -- 89
git diff -- src/controllers/authController.js
node --test --test-name-pattern="^CWE-89 " tests/security.test.js
# Test bảo vệ phải FAIL. Đó là bằng chứng lỗi đã được đưa vào.
```

Chọn một trong `89`, `79`, `22`, `639`, `798`. Mỗi lần chỉ một patch. Khôi phục:

```powershell
npm.cmd run acvis:restore
npm.cmd test
```

Restore khôi phục đúng byte snapshot, không dùng `git reset` và không làm mất các
sửa chữa bản nền đang chưa commit. Nếu bạn sửa file sau khi apply, công cụ từ chối
ghi đè; byte phục hồi vẫn nằm trong `.acvis-lab/active.json` để bạn so sánh thủ công.

Khi bạn quyết định commit/push sau này, trước tiên cần lưu bản nền an toàn thành
mốc riêng; sau đó mới một commit gây lỗi để ACVIS có diff thật. Không gộp bản nền
và patch lỗi vào cùng commit. Ghi SHA, delivery ID, Scan Job ID, CWE, rule_id thực
tế và trạng thái xác minh; so sánh với bảng trên. Hiện tại công cụ không chạy Git
commit/push, không thay config webhook và không gọi API của ACVIS.

## 6. Giới hạn bằng chứng

Tests gọi HTTP thật qua server/routes/middlewares, session/bcrypt/EJS/multer thật,
file giả và database SQLite trong bộ nhớ. Adapter MSSQL được thay ở biên provider;
một số cú pháp SELECT TOP/GETDATE được chuẩn hóa cho fixture. Không khẳng định đã
thử native driver, typing/locking/collation hay SQL Server thật. XSS được chứng
minh bằng HTML phản chiếu chưa escape, chưa xác minh trình duyệt chạy script.

Vercel hiện dùng session MemoryStore và file `/tmp`: phiên/file có thể mất hoặc
không chia sẻ giữa instance. Chưa triển khai session store/file storage bền vững,
deploy, gửi webhook thật, hoặc xác minh dynamic exploit. Những việc đó cần được
kiểm tra riêng trước khi dùng deployment làm mục tiêu cho ACVIS.
