# CONTEXT.md - Cổng Nộp Bài Tập & Đồ Án Tốt Nghiệp

## 1. Domain Vocabulary (Ngữ cảnh nghiệp vụ)
- **User (Người dùng)**: Cá nhân tham gia hệ thống, gồm 2 vai trò chính:
  - **Student (Sinh viên)**: Người thực hiện bài tập hoặc đồ án, nộp file bài làm, theo dõi hạn chót và xem điểm.
  - **Teacher (Giảng viên)**: Người tạo bài tập/đồ án, quy định hạn nộp, tải bài nộp của sinh viên về xem và thực hiện chấm điểm, phản hồi.
- **Assignment (Bài tập / Đồ án)**:
  - `assignment`: Bài tập môn học thông thường (ngắn hạn, nộp theo tuần/chương).
  - `graduation_thesis`: Đồ án tốt nghiệp / Khóa luận tốt nghiệp (dài hạn, yêu cầu nộp file báo cáo, mã nguồn, tài liệu).
- **Submission (Bài nộp)**: Bản ghi nộp bài của sinh viên kèm file đính kèm (`.zip`, `.pdf`, `.docx`, ...), ghi chú, thời điểm nộp (`submitted_at`), cờ nộp muộn (`is_late`), điểm số (`score`), và nhận xét (`feedback`).

---

## 2. Architectural Decisions (ADR)
- **ADR-001: Runtime & Server**: Sử dụng **Node.js** và **Express.js** với mô hình Monolith MVC.
  - *Lý do*: Đơn giản, thống nhất toàn bộ bằng JavaScript, không phát sinh vấn đề CORS, dễ dàng đóng gói và khởi chạy trên một cổng duy nhất (`PORT=3000`).
- **ADR-002: Database Engine**: Sử dụng **Microsoft SQL Server (MSSQL)** thông qua thư viện `mssql` (dựa trên Tedious).
  - *Lý do*: Phù hợp yêu cầu của người dùng và các tiêu chuẩn học tập/đồ án trong trường đại học.
  - *Cơ chế dự phòng*: Hệ thống có script khởi tạo tự động (`initDb.js`) và file `database.sql` để người dùng có thể tạo bảng thủ công hoặc tự động.
- **ADR-003: Authentication & Security**:
  - Mã hóa mật khẩu: `bcryptjs` với salt rounds = 10.
  - Quản lý phiên: `express-session` lưu trạng thái đăng nhập phía server.
  - Phân quyền: Middlewares `isAuthenticated`, `isTeacher`, `isStudent`.
- **ADR-004: File Handling**:
  - Dùng `multer` để upload file bài nộp vào thư mục `uploads/submissions/` và tài liệu đề bài vào `uploads/assignments/`.
  - Tên file được hash kèm timestamp để tránh xung đột tên tiếng Việt và ghi đè file.
- **ADR-005: View Layer**:
  - Template Engine: **EJS** kết hợp **Bootstrap 5**, **Bootstrap Icons**, giao diện tiếng Việt hiện đại, thân thiện và responsive.

---

## 3. Database Schema Overview
- **Table `Users`**: `id`, `user_code`, `full_name`, `email`, `password`, `role`, `department`, `created_at`.
- **Table `Assignments`**: `id`, `title`, `description`, `type`, `due_date`, `teacher_id`, `attachment_path`, `attachment_name`, `max_score`, `created_at`, `updated_at`.
- **Table `Submissions`**: `id`, `assignment_id`, `student_id`, `file_path`, `original_filename`, `file_size`, `note`, `submitted_at`, `is_late`, `score`, `feedback`, `graded_at`, `status`.
