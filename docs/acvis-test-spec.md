# Phạm vi đã thống nhất: kiểm thử ACVIS trên chức năng thật

Người dùng chọn dùng cổng nộp bài hiện có, chuẩn bị bản nền an toàn trước và
năm lỗi thật có thể áp dụng riêng. Không commit, push, tạo PR hay deploy.

Mốc nguồn: `87f77130b851c3e2dff8d063a098ffad47cda624` của repo
`ToanDuong25/Congnopbaitap-Doantotnghiep`. Bản chuẩn bị nằm trong workspace ACVIS
để kiểm chứng và review trước khi chép các file thay đổi vào thư mục nguồn.

## Tiêu chí

- Giữ Express/EJS, MSSQL, giao diện và nghiệp vụ Student/Teacher; không thêm app lab khác.
- Bản nền tham số hóa truy vấn đăng nhập/đăng ký/nộp bài; khóa session từ môi trường.
- Tìm kiếm bài tập theo tiêu đề là chức năng thật, phản hồi HTML phải escape dữ liệu.
- Download bài nộp yêu cầu đúng sinh viên, giảng viên phụ trách, hoặc admin.
- Giảng viên khác không đọc danh sách bài nộp hoặc chấm bài của lớp không phụ trách.
- File upload không có đường public để bỏ qua xác thực. Tải đề bài đi qua route xác thực.
- Mỗi patch riêng phải làm hỏng đúng phép thử bảo vệ CWE tương ứng, có bằng chứng
  hành vi SQL/HTTP/file/chữ ký cookie; không dùng comment giả để làm scanner báo lỗi.
- Dữ liệu giả và file canary trong thư mục tạm; không thay đổi DB hay uploads của người dùng.
- Lưu các patch trong `.acvis-lab/`, được Git ignore. Khôi phục byte bản nền sau kiểm thử.
- Giữ bảng MongoDB ID kỳ vọng, phân biệt CWE match và exact record match.

Đây là bản nền an toàn tại các chức năng trong phạm vi này, không phải chứng nhận
toàn bộ repo hết mọi lỗ hổng. File thử PHP cũ `test2.php` có SQL injection, không
được Express chạy và không nằm trong phạm vi sửa; cần loại khỏi scope ACVIS khi đo
bản nền. MSSQL thật, session store dùng chung và deployment Vercel chưa được xác minh.
