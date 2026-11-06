# Bằng chứng kiểm thử cục bộ — 2026-11-05

- Bản nguồn: `87f77130b851c3e2dff8d063a098ffad47cda624`.
- `npm test`: 11 passed, 0 failed trên bản nền.
- `npm run check`: kiểm tra cú pháp JavaScript và compile EJS đạt.
- `git diff --check`: đạt.
- Hai review độc lập Standards và Spec: không còn finding chặn. Finding nhỏ về
  mất bộ lọc `mine=true` khi tìm kiếm đã sửa và thêm HTTP regression.

| Patch riêng | Phép thử nhận ra hành vi lỗi |
| --- | --- |
| CWE-89 | SQL UNION tạo được kết quả đăng nhập giả: Location từ `/auth/login` thành `/dashboard` |
| CWE-79 | Phản hồi chứa nguyên thẻ HTML từ query, assertion escape thất bại |
| CWE-22 | Nội dung file tải từ `STUDENT-ONE-PRIVATE` thành `SYNTHETIC-TRAVERSAL-CANARY` ngoài thư mục submissions |
| CWE-639 | Tài khoản khác tải được bài nộp: từ HTTP 403 thành 200 |
| CWE-798 | Cookie được ký bằng khóa gán cứng thay vì khóa môi trường; kiểm tra chữ ký bằng khóa cấu hình thất bại |

Sau mỗi thử lỗi, công cụ phục hồi byte gốc. Toàn bộ tests bản nền đạt lại sau khi
thử năm patch. Các log và kết quả JSON nằm trong `.acvis-lab/evidence/`, được Git ignore.

SQLi được thực thi qua SQLite fixture thay cho provider MSSQL, không phải SQL Server
thật. HTTP/routes/session/bcrypt/EJS/multipart/filesystem đều chạy thật. Không dùng
DB hoặc upload của người dùng. Không khẳng định exact rule match, browser script
execution, webhook delivery, remote CI, deployment hay production verification.

Known warnings: SQLite tích hợp Node 22 là experimental; dependency hiện tại còn
cảnh báo deprecation `util.isArray`. Không có lỗi kiểm thử từ các cảnh báo đó.

Không commit, push hoặc tạo PR theo yêu cầu người dùng.
