const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isStudent, isTeacher } = require('../middlewares/roleMiddleware');
const { uploadSubmission } = require('../middlewares/uploadMiddleware');

// Sinh viên nộp bài
router.post('/assignment/:id', isAuthenticated, isStudent, uploadSubmission.single('submission_file'), submissionController.submitAssignment);

// Giảng viên chấm điểm
router.post('/:id/grade', isAuthenticated, isTeacher, submissionController.gradeSubmission);

// Sinh viên xem các bài đã nộp của mình
router.get('/my', isAuthenticated, isStudent, submissionController.mySubmissions);

// Tải file bài nộp
router.get('/:id/download', isAuthenticated, submissionController.downloadFile);

module.exports = router;
