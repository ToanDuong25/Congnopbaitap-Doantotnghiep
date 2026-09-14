-- =========================================================================
-- HỆ THỐNG QUẢN LÝ NỘP BÀI TẬP VÀ ĐỒ ÁN TỐT NGHIỆP CHO SINH VIÊN
-- File: database.sql
-- Hệ quản trị CSDL: Microsoft SQL Server (MSSQL)
-- =========================================================================

-- 1. Tạo Database nếu chưa tồn tại
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'StudentAssignmentDB')
BEGIN
    CREATE DATABASE StudentAssignmentDB;
END
GO

USE StudentAssignmentDB;
GO

-- 2. Bảng Người dùng (Users): Giảng viên & Sinh viên
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        user_code NVARCHAR(50) NOT NULL UNIQUE,          -- MSSV hoặc Mã GV (VD: B21DCCN001, GV01)
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

-- 3. Bảng Bài tập & Đồ án tốt nghiệp (Assignments)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Assignments')
BEGIN
    CREATE TABLE Assignments (
        id INT IDENTITY(1,1) PRIMARY KEY,
        title NVARCHAR(255) NOT NULL,                    -- Tiêu đề bài tập / đồ án
        description NVARCHAR(MAX) NULL,                  -- Mô tả chi tiết yêu cầu
        type NVARCHAR(50) NOT NULL DEFAULT 'assignment', -- 'assignment' (Bài tập môn học) hoặc 'graduation_thesis' (Đồ án tốt nghiệp)
        due_date DATETIME NOT NULL,                      -- Hạn chót nộp bài
        teacher_id INT NOT NULL,                         -- Giảng viên phụ trách (Khóa ngoại)
        attachment_path NVARCHAR(500) NULL,              -- Đường dẫn file tài liệu đề bài (PDF, DOCX, ZIP)
        attachment_name NVARCHAR(255) NULL,              -- Tên gốc của file đề bài
        max_score FLOAT DEFAULT 10.0,                    -- Thang điểm tối đa
        created_at DATETIME DEFAULT GETDATE(),
        updated_at DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Assignments_Teachers FOREIGN KEY (teacher_id) REFERENCES Users(id) ON DELETE NO ACTION
    );
END
GO

-- 4. Bảng Bài nộp của Sinh viên (Submissions)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Submissions')
BEGIN
    CREATE TABLE Submissions (
        id INT IDENTITY(1,1) PRIMARY KEY,
        assignment_id INT NOT NULL,                      -- Mã bài tập / đồ án
        student_id INT NOT NULL,                         -- Mã sinh viên nộp bài
        file_path NVARCHAR(500) NOT NULL,                -- Đường dẫn lưu file nộp bài trên server
        original_filename NVARCHAR(255) NOT NULL,        -- Tên file ban đầu của sinh viên
        file_size BIGINT NULL,                           -- Dung lượng file (bytes)
        note NVARCHAR(MAX) NULL,                         -- Ghi chú của sinh viên
        submitted_at DATETIME DEFAULT GETDATE(),         -- Thời gian nộp bài
        is_late BIT DEFAULT 0,                           -- 0: Đúng hạn, 1: Nộp muộn (sau deadline)
        score FLOAT NULL,                                -- Điểm số do GV chấm (0 - 10)
        feedback NVARCHAR(MAX) NULL,                     -- Nhận xét chi tiết của GV
        graded_at DATETIME NULL,                         -- Thời điểm chấm điểm
        status NVARCHAR(50) DEFAULT 'submitted',         -- 'submitted' (đã nộp), 'graded' (đã chấm)
        CONSTRAINT FK_Submissions_Assignments FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE,
        CONSTRAINT FK_Submissions_Students FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE NO ACTION
    );
END
GO

-- 5. Tạo Indexes giúp tăng tốc độ truy vấn
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_Role')
    CREATE INDEX IX_Users_Role ON Users(role);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Assignments_DueDate')
    CREATE INDEX IX_Assignments_DueDate ON Assignments(due_date);
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Submissions_Assignment_Student')
    CREATE INDEX IX_Submissions_Assignment_Student ON Submissions(assignment_id, student_id);
GO
