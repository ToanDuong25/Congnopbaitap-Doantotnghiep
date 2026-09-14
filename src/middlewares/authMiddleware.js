function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Vui lòng đăng nhập để tiếp tục.');
  req.session.returnTo = req.originalUrl;
  return res.redirect('/auth/login');
}

function isNotAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
};
