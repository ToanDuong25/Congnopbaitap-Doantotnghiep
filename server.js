const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
require('dotenv').config();

const { initDatabase } = require('./src/config/initDb');

// Import routes
const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const assignmentRoutes = require('./src/routes/assignmentRoutes');
const submissionRoutes = require('./src/routes/submissionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL);

// 1. Cấu hình View Engine (EJS) - Hỗ trợ cả môi trường Local và Vercel Serverless
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'src/views'),
  path.join(process.cwd(), 'src/views'),
]);

// 2. Static files & Uploads
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(__dirname, 'src/public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
if (isVercel) {
  app.use('/uploads', express.static('/tmp/uploads'));
}

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
      secure: false, // Để false để session hoạt động mượt mà trên serverless proxy
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

// 8. Error handling middleware tập trung để ngăn chặn 500 FUNCTION_INVOCATION_FAILED
app.use((err, req, res, next) => {
  console.error('🔥 Lỗi hệ thống:', err);
  res.status(500).render('dashboard/error', {
    title: '500 - Lỗi máy chủ',
    user: req.session ? req.session.user : null,
    error_msg: 'Đã xảy ra lỗi trong quá trình xử lý: ' + (err.message || 'Lỗi không xác định'),
  });
});

// 9. Khởi chạy Server
if (!isVercel) {
  initDatabase()
    .then(() => {
      console.log('✅ Cơ sở dữ liệu SQL Server đã sẵn sàng!');
    })
    .catch((err) => {
      console.warn('⚠️ CẢNH BÁO: Chưa thể kết nối SQL Server:', err.message);
      console.warn('👉 Kiểm tra lại file .env và chạy: npm run init-db');
    });

  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🎉 Ứng dụng Nộp Bài Tập & Đồ Án Tốt Nghiệp đã chạy thành công!`);
    console.log(`🌐 Truy cập hệ thống tại: http://localhost:${PORT}`);
    console.log(`👨‍🏫 Giảng viên mẫu: giangvien@school.edu.vn / password123`);
    console.log(`👩‍🎓 Sinh viên mẫu:  sinhvien@school.edu.vn  / password123`);
    console.log(`=============================================================\n`);
  });
}

// Export cho Vercel Serverless Function
module.exports = app;
