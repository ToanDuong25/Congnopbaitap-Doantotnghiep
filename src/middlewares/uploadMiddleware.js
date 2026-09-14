const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục lưu trữ tồn tại
const assignmentDir = path.join(__dirname, '../../uploads/assignments');
const submissionDir = path.join(__dirname, '../../uploads/submissions');

if (!fs.existsSync(assignmentDir)) {
  fs.mkdirSync(assignmentDir, { recursive: true });
}
if (!fs.existsSync(submissionDir)) {
  fs.mkdirSync(submissionDir, { recursive: true });
}

// Cấu hình lưu trữ cho tài liệu đề bài của Giảng viên
const assignmentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, assignmentDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `assignment_${Date.now()}_${sanitizedBase}${ext}`);
  },
});

// Cấu hình lưu trữ cho bài nộp của Sinh viên
const submissionStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, submissionDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const studentCode = req.session.user ? req.session.user.user_code : 'anonymous';
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `sub_${studentCode}_${Date.now()}_${sanitizedBase}${ext}`);
  },
});

// Kiểm tra định dạng file nộp bài cho phép
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Định dạng file không được hỗ trợ (${ext}). Vui lòng tải lên file: .zip, .rar, .7z, .pdf, .docx, .doc, v.v.`));
  }
};

const uploadAssignmentAttachment = multer({
  storage: assignmentStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // Tối đa 50MB
  fileFilter: fileFilter,
});

const uploadSubmission = multer({
  storage: submissionStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Tối đa 100MB cho đồ án / bài tập
  fileFilter: fileFilter,
});

module.exports = {
  uploadAssignmentAttachment,
  uploadSubmission,
};
