const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();

const { getPool } = require('./src/config/db');
const { initDatabase } = require('./src/config/initDb');

// Import routes
const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Cấu hình View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// 2. Static files & Uploads
app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 3. Middlewares phân tích Request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// 4. Session & Flash messages
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret_assignment_portal_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
      httpOnly: true,
    },
  })
);
app.use(flash());

// 5. Global variables cho Views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.session.user || null;
  res.locals.currentPath = req.path;
  next();
});

// 6. Đăng ký các Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/submissions', submissionRoutes);

// 7. Xử lý trang 404
app.use((req, res) => {
  res.status(404).render('dashboard/error', {
    title: '404 - Không tìm thấy trang',
    user: req.session.user || null,
  });
});

// 8. Khởi chạy Server và kiểm tra CSDL
async function startServer() {
  try {
    console.log('🚀 Đang kiểm tra kết nối Microsoft SQL Server...');
    await initDatabase();
    console.log('✅ Cơ sở dữ liệu SQL Server đã sẵn sàng!');
  } catch (err) {
    console.warn('⚠️ CẢNH BÁO: Chưa thể kết nối hoặc khởi tạo CSDL SQL Server.');
    console.warn('   Lỗi:', err.message);
    console.warn('👉 Hãy đảm bảo dịch vụ SQL Server đang chạy và thông tin trong file .env là chính xác.');
    console.warn('   Sau khi cấu hình .env, bạn có thể chạy lại: npm run init-db');
  }

  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🎉 Ứng dụng Nộp Bài Tập & Đồ Án Tốt Nghiệp đã khởi chạy thành công!`);
    console.log(`🌐 Truy cập hệ thống tại: http://localhost:${PORT}`);
    console.log(`👨‍🏫 Giảng viên mẫu: giangvien@school.edu.vn / password123`);
    console.log(`👩‍🎓 Sinh viên mẫu:  sinhvien@school.edu.vn  / password123`);
    console.log(`=============================================================\n`);
  });
}

startServer();
