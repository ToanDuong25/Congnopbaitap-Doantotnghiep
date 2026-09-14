# Hệ Thống Nộp Bài Tập & Đồ Án Tốt Nghiệp Cho Sinh Viên

Dự án website hỗ trợ quản lý việc giao, nộp và chấm điểm bài tập môn học cũng như đề tài đồ án tốt nghiệp dành cho sinh viên và giảng viên, được xây dựng hoàn toàn bằng **JavaScript (Node.js, Express, EJS)** và **Microsoft SQL Server (MSSQL)**.

---

## 🌟 Tính Năng Chính

### 1. Phân hệ Xác thực & Người dùng
- **Đăng ký tài khoản**: Lựa chọn vai trò **Sinh viên** (nhập MSSV, Lớp) hoặc **Giảng viên** (nhập Mã GV, Khoa).
- **Mã hóa mật khẩu**: Sử dụng `bcryptjs` với độ bảo mật cao trước khi lưu vào CSDL.
- **Đăng nhập**: Cho phép đăng nhập linh hoạt bằng **Email** hoặc **Mã số (MSSV/Mã GV)**.
- **Phân quyền chặt chẽ (Role-Based Access Control)**:
  - Sinh viên chỉ được nộp bài, xem bài tập và xem kết quả chấm của bản thân.
  - Giảng viên được tạo bài tập, tải file bài làm và thực hiện chấm điểm.

### 2. Phân hệ Giảng viên (Teacher)
- **Tạo & Quản lý bài tập / Đồ án**:
  - Phân loại rõ ràng: **Bài tập môn học** hoặc **Đề tài đồ án tốt nghiệp**.
  - Đặt thời hạn chót (Deadline), thang điểm tối đa (thang 10).
  - Tải lên tài liệu đề bài đính kèm (PDF, DOCX, ZIP...).
  - Chỉnh sửa, xóa bài tập/đề tài.
- **Theo dõi & Chấm điểm**:
  - Danh sách sinh viên đã nộp bài kèm thời gian chi tiết.
  - Tự động gắn cờ **Đúng hạn** hoặc **Nộp trễ (Late)** nếu nộp sau Deadline.
  - Tải về file bài làm của sinh viên.
  - Chấm điểm số và gửi nhận xét/góp ý chi tiết cho từng sinh viên.

### 3. Phân hệ Sinh viên (Student)
- **Tra cứu bài tập / Đồ án**:
  - Xem danh sách bài tập đang mở, sắp đến hạn, lọc theo loại hình.
  - Tải file đề bài hướng dẫn của giảng viên.
- **Nộp bài tập**:
  - Giao diện kéo thả / chọn file nộp bài (hỗ trợ .zip, .rar, .pdf, .docx dung lượng lên đến 100MB).
  - Nhập lời nhắn/ghi chú gửi giảng viên.
  - Cho phép **nộp lại (cập nhật bài làm)** trước khi hết hạn.
- **Theo dõi kết quả**:
  - Xem điểm số và lời nhận xét của giảng viên ngay khi bài được chấm.
  - Bảng điều khiển (Dashboard) thống kê số bài đã nộp, bài đã có điểm.

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: Node.js, Express.js.
- **Cơ sở dữ liệu**: Microsoft SQL Server (MSSQL) với thư viện `mssql` (Tedious driver).
- **Giao diện (Frontend)**: Template engine EJS, Bootstrap 5, Bootstrap Icons.
- **Upload File**: Multer.
- **Bảo mật & Session**: bcryptjs, express-session, connect-flash.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### Bước 1: Cài đặt các thư viện (Dependencies)
Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
```bash
npm install
```

### Bước 2: Cấu hình kết nối SQL Server trong `.env`
Mở file `.env` và điều chỉnh các thông số kết nối phù hợp với máy tính của bạn:
```ini
PORT=3000
SESSION_SECRET=super_secret_assignment_key_2026

# Thông tin đăng nhập SQL Server của bạn
DB_USER=sa
DB_PASSWORD=YourPasswordHere
DB_SERVER=localhost
# Nếu bạn dùng SQL Server Express dạng Named Instance, hãy bật dòng dưới:
# DB_INSTANCE=SQLEXPRESS
DB_PORT=1433
DB_DATABASE=StudentAssignmentDB
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

> **Cách tạo CSDL thủ công (Tùy chọn)**:
> Bạn có thể mở công cụ **SQL Server Management Studio (SSMS)** hoặc **Azure Data Studio**, mở file [database.sql](database.sql) và nhấn **Execute** để tạo Database và các bảng.

### Bước 3: Khởi tạo CSDL tự động (Seed dữ liệu)
Chạy lệnh sau để tự động tạo Database, các bảng và chèn tài khoản thử nghiệm:
```bash
npm run init-db
```

### Bước 4: Khởi chạy Website
- Chế độ thông thường:
  ```bash
  npm start
  ```
- Chế độ tự động reload khi sửa code:
  ```bash
  npm run dev
  ```

Truy cập website trên trình duyệt: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Tài Khoản Thử Nghiệm Mặc Định

Sau khi chạy lệnh khởi tạo CSDL, bạn có thể đăng nhập ngay bằng 2 tài khoản mẫu:

| Vai trò | Email | Mã số | Mật khẩu |
| :--- | :--- | :--- | :--- |
| **👨‍🏫 Giảng viên** | `giangvien@school.edu.vn` | `GV001` | `password123` |
| **👩‍🎓 Sinh viên** | `sinhvien@school.edu.vn` | `B21DCCN001` | `password123` |

*(Bạn cũng có thể tự bấm **Đăng ký** trên giao diện để tạo tài khoản mới với vai trò tùy ý).*

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
Congnopbaitap-Doantotnghiep/
├── src/
│   ├── config/
│   │   ├── db.js                 # Kết nối SQL Server Pool
│   │   └── initDb.js             # Tự động tạo bảng & chèn dữ liệu mẫu
│   ├── controllers/
│   │   ├── authController.js     # Đăng ký, đăng nhập, đăng xuất
│   │   ├── assignmentController.js # CRUD bài tập, đề tài đồ án
│   │   ├── submissionController.js # Nộp bài, chấm điểm, tải file
│   │   └── dashboardController.js  # Thống kê bảng điều khiển
│   ├── middlewares/
│   │   ├── authMiddleware.js     # Kiểm tra đăng nhập
│   │   ├── roleMiddleware.js     # Phân quyền Teacher / Student
│   │   └── uploadMiddleware.js   # Multer xử lý upload file
│   ├── routes/                   # Định tuyến URL
│   ├── views/                    # Giao diện EJS Templates
│   │   ├── layouts/              # Header, Navbar, Footer, Alerts
│   │   ├── auth/                 # Form đăng nhập, đăng ký
│   │   ├── dashboard/            # Bảng điều khiển GV & SV
│   │   ├── assignments/          # Danh sách, chi tiết, thêm/sửa bài tập
│   │   └── submissions/          # Lịch sử nộp bài của sinh viên
│   └── public/                   # CSS, JS client, assets
├── uploads/                      # Nơi lưu trữ file bài nộp & đề bài
├── database.sql                  # Script tạo bảng SQL Server thủ công
├── CONTEXT.md                    # Tài liệu kiến trúc & nghiệp vụ (ask-matt)
├── .env                          # Cấu hình môi trường
├── package.json
└── server.js                     # Điểm khởi chạy ứng dụng Express
```