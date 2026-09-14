const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { initDatabase } = require('../config/initDb');

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/auth/login');
});

router.get('/dashboard', isAuthenticated, dashboardController.index);

// Route thực thi Migration CSDL trực tiếp từ trình duyệt (tiện lợi trên Vercel hoặc Local)
router.get('/migrate', async (req, res) => {
  try {
    console.log('🔄 Bắt đầu chạy Migration CSDL từ web request...');
    await initDatabase();
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Database Migration - Thành Công</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
        </head>
        <body class="bg-light d-flex align-items-center justify-content-center min-vh-100">
          <div class="card p-4 shadow text-center" style="max-width: 520px; border-radius: 16px;">
            <div class="text-success mb-2" style="font-size: 3.5rem;">🎉</div>
            <h4 class="fw-bold text-success">Migration Cơ Sở Dữ Liệu Thành Công!</h4>
            <p class="text-muted mt-2">
              Các bảng <strong>Users</strong>, <strong>Assignments</strong>, <strong>Submissions</strong> và chỉ mục đã được khởi tạo hoàn tất.
            </p>
            <div class="p-3 bg-light border rounded text-start small mb-3">
              <div>👨‍🏫 <strong>Giảng viên:</strong> <code>giangvien@school.edu.vn / password123</code></div>
              <div>👩‍🎓 <strong>Sinh viên:</strong> <code>sinhvien@school.edu.vn / password123</code></div>
            </div>
            <a href="/auth/login" class="btn btn-primary py-2 fw-semibold">Đến Trang Đăng Nhập &rarr;</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Lỗi chạy migration qua web:', err);
    res.status(500).send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Database Migration - Thất Bại</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
        </head>
        <body class="bg-light d-flex align-items-center justify-content-center min-vh-100">
          <div class="card p-4 shadow text-center" style="max-width: 600px; border-radius: 16px;">
            <div class="text-danger mb-2" style="font-size: 3.5rem;">⚠️</div>
            <h4 class="fw-bold text-danger">Migration Chưa Thành Công</h4>
            <p class="text-muted mt-2">Máy chủ không thể kết nối tới cơ sở dữ liệu SQL Server:</p>
            <div class="alert alert-danger text-start font-monospace small my-3" style="word-break: break-all;">
              ${err.message}
            </div>
            <div class="small text-muted text-start mb-3">
              <strong>Gợi ý kiểm tra:</strong>
              <ul class="mb-0 ps-3">
                <li>Đảm bảo các biến môi trường <code>DB_SERVER</code>, <code>DB_USER</code>, <code>DB_PASSWORD</code>, <code>DB_DATABASE</code> đã được thêm trên Vercel Settings.</li>
                <li>Nếu dùng hosting DatabaseASP.NET, hãy chắc chắn địa chỉ máy chủ có thể truy cập được từ bên ngoài hoặc chạy script <code>database.sql</code> trong công cụ quản lý web của hosting.</li>
              </ul>
            </div>
            <div class="d-flex justify-content-center gap-2">
              <a href="/migrate" class="btn btn-outline-danger">Thử lại &rarr;</a>
              <a href="/auth/login" class="btn btn-light">Về trang chủ</a>
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

module.exports = router;
