function isTeacher(req, res, next) {
  if (req.session.user && (req.session.user.role === 'teacher' || req.session.user.role === 'admin')) {
    return next();
  }
  req.flash('error_msg', 'Bạn không có quyền thực hiện hành động này. Chỉ dành cho Giảng viên.');
  return res.redirect('/dashboard');
}

function isStudent(req, res, next) {
  if (req.session.user && req.session.user.role === 'student') {
    return next();
  }
  req.flash('error_msg', 'Chức năng này chỉ dành cho Sinh viên.');
  return res.redirect('/dashboard');
}

module.exports = {
  isTeacher,
  isStudent,
};
