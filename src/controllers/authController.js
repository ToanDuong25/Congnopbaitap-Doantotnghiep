const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../config/db');

// Hiển thị form đăng nhập
exports.showLogin = (req, res) => {
  res.render('auth/login', {
    title: 'Đăng nhập - Hệ thống Nộp Bài Tập & Đồ Án',
  });
};


exports.login = async (req, res) => {
  const { account, password } = req.body;

  if (!account || !password) {
    req.flash('error_msg', 'Vui lòng nhập đầy đủ tài khoản/email và mật khẩu.');
    return res.redirect('/auth/login');
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('account', sql.NVarChar, account.trim())
      .query(`
        SELECT * FROM Users 
        WHERE email = @account OR user_code = @account
      `);

    if (result.recordset.length === 0) {
      req.flash('error_msg', 'Tài khoản hoặc mật khẩu không chính xác.');
      return res.redirect('/auth/login');
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      req.flash('error_msg', 'Tài khoản hoặc mật khẩu không chính xác.');
      return res.redirect('/auth/login');
    }

    // Lưu thông tin người dùng vào session (loại bỏ trường password)
    req.session.user = {
      id: user.id,
      user_code: user.user_code,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    req.flash('success_msg', `Xin chào, ${user.full_name}! Đăng nhập thành công.`);

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    return res.redirect(returnTo);
  } catch (err) {
    console.error('Lỗi đăng nhập:', err);
    req.flash('error_msg', 'Lỗi kết nối CSDL: ' + err.message);
    return res.redirect('/auth/login');
  }
};

// Hiển thị form đăng ký
exports.showRegister = (req, res) => {
  res.render('auth/register', {
    title: 'Đăng ký tài khoản mới',
  });
};

// Xử lý đăng ký
exports.register = async (req, res) => {
  const { user_code, full_name, email, password, confirm_password, role, department } = req.body;

  if (!user_code || !full_name || !email || !password || !confirm_password || !role) {
    req.flash('error_msg', 'Vui lòng điền đầy đủ các thông tin bắt buộc.');
    return res.redirect('/auth/register');
  }

  if (password !== confirm_password) {
    req.flash('error_msg', 'Mật khẩu xác nhận không khớp.');
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.flash('error_msg', 'Mật khẩu phải có ít nhất 6 ký tự.');
    return res.redirect('/auth/register');
  }

  const validRoles = ['student', 'teacher'];
  if (!validRoles.includes(role)) {
    req.flash('error_msg', 'Vai trò không hợp lệ.');
    return res.redirect('/auth/register');
  }

  try {
    const pool = await getPool();

    // Kiểm tra xem user_code hoặc email đã được sử dụng chưa
    const checkUser = await pool.request()
      .input('user_code', sql.NVarChar, user_code.trim())
      .input('email', sql.NVarChar, email.trim())
      .query(`
        SELECT id, user_code, email FROM Users 
        WHERE user_code = @user_code OR email = @email
      `);

    if (checkUser.recordset.length > 0) {
      const existing = checkUser.recordset[0];
      if (existing.user_code.toLowerCase() === user_code.trim().toLowerCase()) {
        req.flash('error_msg', `Mã số "${user_code}" đã tồn tại trên hệ thống.`);
      } else {
        req.flash('error_msg', `Email "${email}" đã được đăng ký tài khoản.`);
      }
      return res.redirect('/auth/register');
    }

    // Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Chèn vào CSDL SQL Server
    await pool.request()
      .input('user_code', sql.NVarChar, user_code.trim().toUpperCase())
      .input('full_name', sql.NVarChar, full_name.trim())
      .input('email', sql.NVarChar, email.trim().toLowerCase())
      .input('password', sql.NVarChar, hashedPassword)
      .input('role', sql.NVarChar, role)
      .input('department', sql.NVarChar, department ? department.trim() : null)
      .query(`
        INSERT INTO Users (user_code, full_name, email, password, role, department)
        VALUES (@user_code, @full_name, @email, @password, @role, @department)
      `);

    req.flash('success_msg', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.');
    return res.redirect('/auth/login');
  } catch (err) {
    console.error('Lỗi đăng ký:', err);
    req.flash('error_msg', 'Lỗi CSDL khi tạo tài khoản: ' + err.message);
    return res.redirect('/auth/register');
  }
};

// Đăng xuất
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Lỗi đăng xuất:', err);
    }
    res.redirect('/auth/login');
  });
};
