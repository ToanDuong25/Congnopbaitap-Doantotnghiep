-- =========================================================================
-- HỆ THỐNG QUẢN LÝ NỘP BÀI TẬP VÀ ĐỒ ÁN TỐT NGHIỆP CHO SINH VIÊN
-- File: database.sql
-- Hệ quản trị CSDL: Microsoft SQL Server (MSSQL)
-- Chạy script này trực tiếp trên Database (Ví dụ: db68274 hoặc StudentAssignmentDB)
-- =========================================================================

-- 1. Bảng Người dùng (Users): Giảng viên & Sinh viên
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_code NVARCHAR(50) NOT NULL UNIQUE,          -- MSSV hoặc Mã GV (VD: B21DCCN001, GV001)
        full_name NVARCHAR(100) NOT NULL,                -- Họ và tên
        email NVARCHAR(100) NOT NULL UNIQUE,             -- Email
        password NVARCHAR(255) NOT NULL,                 -- Mật khẩu mã hóa bcrypt
        role NVARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
        department NVARCHAR(100) NULL,                   -- Lớp / Khoa (VD: D21CQCN01, CNTT)
        avatar NVARCHAR(255) NULL,                       -- Đường dẫn ảnh đại diện (nếu có)
        created_at DATETIME DEFAULT GETDATE()
    );
END
GO

-- 2. Bảng Bài tập & Đồ án tốt nghiệp (Assignments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Assignments')
BEGIN
    CREATE TABLE Assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,                    -- Tiêu đề bài tập / đồ án
        description NVARCHAR(MAX) NULL,                  -- Mô tả chi tiết yêu cầu
        type NVARCHAR(50) NOT NULL DEFAULT 'assignment', -- 'assignment' hoặc 'graduation_thesis'
        due_date DATETIME NOT NULL,                      -- Hạn chót nộp bài
        teacher_id INT NOT NULL,                         -- Giảng viên phụ trách (Khóa ngoại)
        attachment_path NVARCHAR(500) NULL,              -- File đề bài đính kèm
        attachment_name NVARCHAR(255) NULL,
        max_score FLOAT DEFAULT 10.0,                    -- Thang điểm tối đa
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Assignments_Teachers FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE NO ACTION
    );
END
GO

-- 3. Bảng Bài nộp của Sinh viên (Submissions)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Submissions')
BEGIN
    CREATE TABLE Submissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,                      -- Mã bài tập / đồ án
        student_id INT NOT NULL,                         -- Mã sinh viên nộp bài
        file_path NVARCHAR(500) NOT NULL,                -- Đường dẫn lưu file
        original_filename NVARCHAR(255) NOT NULL,        -- Tên file ban đầu
        file_size BIGINT NULL,                           -- Dung lượng file (bytes)
        note NVARCHAR(MAX) NULL,                         -- Ghi chú của sinh viên
        submitted_at DATETIME DEFAULT GETDATE(),         -- Thời gian nộp bài
        is_late BIT DEFAULT 0,                           -- 0: Đúng hạn, 1: Nộp muộn
        score FLOAT NULL,                                -- Điểm số do GV chấm (0 - 10)
        feedback NVARCHAR(MAX) NULL,                     -- Nhận xét chi tiết
        graded_at DATETIME NULL,                         -- Thời điểm chấm điểm
        status NVARCHAR(50) DEFAULT 'submitted',         -- 'submitted', 'graded'
        CONSTRAINT FK_Submissions_Assignments FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE,
        CONSTRAINT FK_Submissions_Students FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE NO ACTION
    );
END
GO

-- 4. Tạo Indexes tối ưu truy vấn
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Role')
    CREATE INDEX IX_Users_Role ON Users(role);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Assignments_DueDate')
    CREATE INDEX IX_Assignments_DueDate ON Assignments(due_date);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Submissions_Assignment_Student')
    CREATE INDEX IX_Submissions_Assignment_Student ON Submissions(assignment_id, student_id);
GO

-- 5. Chèn dữ liệu mẫu (Mật khẩu mặc định: password123)
IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'giangvien@school.edu.vn')
BEGIN
    INSERT INTO Users (user_code, full_name, email, password, role, department)
    VALUES ('GV001', N'TS. Nguyễn Văn Hùng', 'giangvien@school.edu.vn', '$2a$10$c.r1.NmE55gxUKZuKMNGBOMhbBDX5cRJwNANJPGJtBTpG3ciTkKK.', 'teacher', N'Khoa Công Nghệ Thông Tin');
END
GO

IF NOT EXISTS (SELECT 1 FROM Users WHERE email = 'sinhvien@school.edu.vn')
BEGIN
    INSERT INTO Users (user_code, full_name, email, password, role, department)
    VALUES ('B21DCCN001', N'Trần Thị Mai', 'sinhvien@school.edu.vn', '$2a$10$c.r1.NmE55gxUKZuKMNGBOMhbBDX5cRJwNANJPGJtBTpG3ciTkKK.', 'student', N'D21CQCN01-B');
END
GO

-- Chèn bài tập mẫu
IF NOT EXISTS (SELECT 1 FROM Assignments WHERE title LIKE N'%Bài tập thực hành số 1%')
BEGIN
    DECLARE @TeacherId INT;
    SELECT TOP 1 @TeacherId = id FROM Users WHERE role = 'teacher';

    IF @TeacherId IS NOT NULL
    BEGIN
        INSERT INTO Assignments (title, description, type, due_date, teacher_id, max_score)
        VALUES (
            N'Bài tập thực hành số 1: Xây dựng ứng dụng Node.js & Express',
            N'Sinh viên hoàn thiện các route CRUD và kết nối cơ sở dữ liệu. Nén toàn bộ mã nguồn dạng file .ZIP và nộp trước thời hạn.',
            'assignment',
            DATEADD(DAY, 7, GETDATE()),
            @TeacherId,
            10.0
        );

        INSERT INTO Assignments (title, description, type, due_date, teacher_id, max_score)
        VALUES (
            N'Đồ án tốt nghiệp: Nghiên cứu & Phát triển Hệ thống Web Quản lý Học tập',
            N'Yêu cầu: Nộp báo cáo chuyên đề (file PDF theo mẫu chuẩn của khoa) và mã nguồn hoàn chỉnh có hướng dẫn cài đặt.',
            'graduation_thesis',
            DATEADD(DAY, 60, GETDATE()),
            @TeacherId,
            10.0
        );
    END
END
GO
