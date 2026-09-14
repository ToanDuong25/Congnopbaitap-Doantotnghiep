const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const { isTeacher } = require('../middlewares/roleMiddleware');
const { uploadAssignmentAttachment } = require('../middlewares/uploadMiddleware');

// Danh sách bài tập / đồ án (cho cả Sinh viên & Giảng viên)
router.get('/', isAuthenticated, assignmentController.listAssignments);

// Form tạo bài tập (Chỉ Giảng viên)
router.get('/create', isAuthenticated, isTeacher, assignmentController.showCreateForm);
router.post('/', isAuthenticated, isTeacher, uploadAssignmentAttachment.single('attachment'), assignmentController.createAssignment);

// Xem chi tiết
router.get('/:id', isAuthenticated, assignmentController.showDetail);

// Sửa bài tập (Chỉ Giảng viên)
router.get('/:id/edit', isAuthenticated, isTeacher, assignmentController.showEditForm);
router.post('/:id/edit', isAuthenticated, isTeacher, uploadAssignmentAttachment.single('attachment'), assignmentController.updateAssignment);

// Xóa bài tập (Chỉ Giảng viên)
router.post('/:id/delete', isAuthenticated, isTeacher, assignmentController.deleteAssignment);

module.exports = router;
