const sql = require('mssql');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const baseConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  connectionTimeout: 15000,
};

if (process.env.DB_INSTANCE) {
  baseConfig.options.instanceName = process.env.DB_INSTANCE;
} else if (process.env.DB_PORT) {
  baseConfig.port = parseInt(process.env.DB_PORT, 10);
}

const dbName = process.env.DB_DATABASE || 'StudentAssignmentDB';

async function initDatabase() {
  console.log('🔄 Bắt đầu kiểm tra và khởi tạo CSDL SQL Server...');
  let masterPool = null;

  try {
    // Nếu là server localhost và tài khoản sa, kiểm tra tạo database nếu cần
    if ((baseConfig.server === 'localhost' || baseConfig.server === '127.0.0.1') && baseConfig.user.toLowerCase() === 'sa') {
      console.log(`📡 Đang kiểm tra database trên localhost SQL: ${baseConfig.server}...`);
      masterPool = await new sql.ConnectionPool({
        ...baseConfig,
        database: 'master',
      }).connect();

      const checkDbResult = await masterPool.request().query(
        `SELECT database_id FROM sys.databases WHERE name = '${dbName}'`
      );

      if (checkDbResult.recordset.length === 0) {
        console.log(`📦 Database [${dbName}] chưa tồn tại. Đang tiến hành tạo mới...`);
        await masterPool.request().query(`CREATE DATABASE [${dbName}]`);
        console.log(`✅ Đã tạo mới database [${dbName}] thành công!`);
      }
    }
  } catch (err) {
    console.warn(`⚠️ Bỏ qua bước master (kết nối trực tiếp vào [${dbName}]):`, err.message);
  } finally {
    if (masterPool) {
      await masterPool.close();
    }
  }

  // 2. Kết nối vào đúng Database dự án để tạo bảng
  let targetPool = null;
  try {
    targetPool = await new sql.ConnectionPool({
      ...baseConfig,
      database: dbName,
    }).connect();

    console.log(`🔗 Đã kết nối vào Database [${dbName}]. Bắt đầu tạo bảng...`);

    // Tạo bảng Users
    await targetPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
          CREATE TABLE Users (
              id INT IDENTITY(1,1) PRIMARY KEY,
              user_code NVARCHAR(50) NOT NULL UNIQUE,
              full_name NVARCHAR(100) NOT NULL,
              email NVARCHAR(100) NOT NULL UNIQUE,
              password NVARCHAR(255) NOT NULL,
              role NVARCHAR(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
              department NVARCHAR(100) NULL,
              avatar NVARCHAR(255) NULL,
              created_at DATETIME DEFAULT GETDATE()
          );
          PRINT 'Đã tạo bảng Users';
      END
    `);

    // Tạo bảng Assignments
    await targetPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Assignments')
      BEGIN
          CREATE TABLE Assignments (
              id INT IDENTITY(1,1) PRIMARY KEY,
              title NVARCHAR(255) NOT NULL,
              description NVARCHAR(MAX) NULL,
              type NVARCHAR(50) NOT NULL DEFAULT 'assignment',
              due_date DATETIME NOT NULL,
              teacher_id INT NOT NULL,
              attachment_path NVARCHAR(500) NULL,
              attachment_name NVARCHAR(255) NULL,
              max_score FLOAT DEFAULT 10.0,
              created_at DATETIME DEFAULT GETDATE(),
              updated_at DATETIME DEFAULT GETDATE(),
              CONSTRAINT FK_Assignments_Teachers FOREIGN KEY (teacher_id) REFERENCES Users(id)
          );
          PRINT 'Đã tạo bảng Assignments';
      END
    `);

    // Tạo bảng Submissions
    await targetPool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Submissions')
      BEGIN
          CREATE TABLE Submissions (
              id INT IDENTITY(1,1) PRIMARY KEY,
              assignment_id INT NOT NULL,
              student_id INT NOT NULL,
              file_path NVARCHAR(500) NOT NULL,
              original_filename NVARCHAR(255) NOT NULL,
              file_size BIGINT NULL,
              note NVARCHAR(MAX) NULL,
              submitted_at DATETIME DEFAULT GETDATE(),
              is_late BIT DEFAULT 0,
              score FLOAT NULL,
              feedback NVARCHAR(MAX) NULL,
              graded_at DATETIME NULL,
              status NVARCHAR(50) DEFAULT 'submitted',
              CONSTRAINT FK_Submissions_Assignments FOREIGN KEY (assignment_id) REFERENCES Assignments(id) ON DELETE CASCADE,
              CONSTRAINT FK_Submissions_Students FOREIGN KEY (student_id) REFERENCES Users(id)
          );
          PRINT 'Đã tạo bảng Submissions';
      END
    `);

    // 3. Chèn dữ liệu mẫu nếu chưa có
    const usersCount = await targetPool.request().query(`SELECT COUNT(*) AS count FROM Users`);
    if (usersCount.recordset[0].count === 0) {
      console.log('🌱 Đang chèn dữ liệu mẫu (Giảng viên & Sinh viên)...');
      const salt = await bcrypt.genSalt(10);
      const defaultPassword = await bcrypt.hash('password123', salt);

      // Thêm Giảng viên mẫu
      const teacherRes = await targetPool.request()
        .input('user_code', sql.NVarChar, 'GV001')
        .input('full_name', sql.NVarChar, 'TS. Nguyễn Văn Hùng')
        .input('email', sql.NVarChar, 'giangvien@school.edu.vn')
        .input('password', sql.NVarChar, defaultPassword)
        .input('role', sql.NVarChar, 'teacher')
        .input('department', sql.NVarChar, 'Khoa Công Nghệ Thông Tin')
        .query(`
          INSERT INTO Users (user_code, full_name, email, password, role, department)
          OUTPUT INSERTED.id
          VALUES (@user_code, @full_name, @email, @password, @role, @department)
        `);
      const teacherId = teacherRes.recordset[0].id;

      // Thêm Sinh viên mẫu
      await targetPool.request()
        .input('user_code', sql.NVarChar, 'B21DCCN001')
        .input('full_name', sql.NVarChar, 'Trần Thị Mai')
        .input('email', sql.NVarChar, 'sinhvien@school.edu.vn')
        .input('password', sql.NVarChar, defaultPassword)
        .input('role', sql.NVarChar, 'student')
        .input('department', sql.NVarChar, 'D21CQCN01-B')
        .query(`
          INSERT INTO Users (user_code, full_name, email, password, role, department)
          VALUES (@user_code, @full_name, @email, @password, @role, @department)
        `);

      // Thêm bài tập mẫu & đồ án mẫu
      const now = new Date();
      const assignmentDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 ngày sau
      const thesisDeadline = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);    // 60 ngày sau

      await targetPool.request()
        .input('title', sql.NVarChar, 'Bài tập thực hành số 1: Xây dựng ứng dụng Node.js & Express')
        .input('description', sql.NVarChar, 'Sinh viên hoàn thiện các route CRUD và kết nối cơ sở dữ liệu. Nén toàn bộ mã nguồn dạng file .ZIP và nộp trước thời hạn.')
        .input('type', sql.NVarChar, 'assignment')
        .input('due_date', sql.DateTime, assignmentDeadline)
        .input('teacher_id', sql.Int, teacherId)
        .input('max_score', sql.Float, 10.0)
        .query(`
          INSERT INTO Assignments (title, description, type, due_date, teacher_id, max_score)
          VALUES (@title, @description, @type, @due_date, @teacher_id, @max_score)
        `);

      await targetPool.request()
        .input('title', sql.NVarChar, 'Đồ án tốt nghiệp: Nghiên cứu & Phát triển Hệ thống Web Quản lý Học tập')
        .input('description', sql.NVarChar, 'Yêu cầu: Nộp báo cáo chuyên đề (file PDF theo mẫu chuẩn của khoa) và mã nguồn hoàn chỉnh có hướng dẫn cài đặt.')
        .input('type', sql.NVarChar, 'graduation_thesis')
        .input('due_date', sql.DateTime, thesisDeadline)
        .input('teacher_id', sql.Int, teacherId)
        .input('max_score', sql.Float, 10.0)
        .query(`
          INSERT INTO Assignments (title, description, type, due_date, teacher_id, max_score)
          VALUES (@title, @description, @type, @due_date, @teacher_id, @max_score)
        `);

      console.log('✅ Đã tạo tài khoản mẫu thành công:');
      console.log('   👨‍🏫 Giảng viên: giangvien@school.edu.vn / password123 (Mã: GV001)');
      console.log('   👩‍🎓 Sinh viên:  sinhvien@school.edu.vn  / password123 (Mã: B21DCCN001)');
    } else {
      console.log('ℹ️ Bảng Users đã có dữ liệu.');
    }

    console.log('🎉 Khởi tạo cơ sở dữ liệu thành công hoàn tất!');
    return true;
  } catch (err) {
    console.error('❌ Lỗi trong quá trình khởi tạo CSDL:', err.message);
    throw err;
  } finally {
    if (targetPool) {
      await targetPool.close();
    }
  }
}

// Chạy trực tiếp nếu file này được gọi qua node src/config/initDb.js
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Hoàn thành.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Thất bại:', err);
      process.exit(1);
    });
}

module.exports = { initDatabase };
