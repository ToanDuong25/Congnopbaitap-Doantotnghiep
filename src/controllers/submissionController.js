const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { sql, getPool } = require('../config/db');

// Sinh viên nộp bài / nộp lại bài
exports.submitAssignment = async (req, res) => {
  const assignmentId = parseInt(req.params.id, 10);
  const user = req.session.user;
  const { note } = req.body;

  if (!req.file) {
    req.flash('error_msg', 'Vui lòng đính kèm file bài làm để nộp.');
    return res.redirect(`/assignments/${assignmentId}`);
  }

  try {
    const pool = await getPool();

    // 1. Kiểm tra bài tập tồn tại và lấy hạn nộp
    const assignRes = await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`SELECT id, title, due_date FROM Assignments WHERE id = @id`);

    if (assignRes.recordset.length === 0) {
      req.flash('error_msg', 'Bài tập không tồn tại.');
      return res.redirect('/assignments');
    }

    const assignment = assignRes.recordset[0];
    const now = new Date();
    const isLate = now > new Date(assignment.due_date);

    const filePath = '/uploads/submissions/' + req.file.filename;
    const originalFilename = req.file.originalname;
    const fileSize = req.file.size;

    // 2. Kiểm tra xem sinh viên đã nộp bài này trước đó chưa
    const existingSubRes = await pool.request()
      .input('assignmentId', sql.Int, assignmentId)
      .input('studentId', sql.Int, user.id)
      .query(`
        SELECT id, file_path FROM Submissions 
        WHERE assignment_id = @assignmentId AND student_id = @studentId
      `);

    if (existingSubRes.recordset.length > 0) {
      // Cập nhật lại bài nộp (Re-submission)
      const oldSub = existingSubRes.recordset[0];

      // Xóa file cũ trên đĩa nếu tồn tại
      const oldDiskPath = path.join(__dirname, '../../', oldSub.file_path);
      if (fs.existsSync(oldDiskPath)) {
        try { fs.unlinkSync(oldDiskPath); } catch (e) { /* ignore */ }
      }

      await pool.request()
        .input('id', sql.Int, oldSub.id)
        .input('file_path', sql.NVarChar, filePath)
        .input('original_filename', sql.NVarChar, originalFilename)
        .input('file_size', sql.BigInt, fileSize)
        .input('note', sql.NVarChar, note ? note.trim() : '')
        .input('is_late', sql.Bit, isLate ? 1 : 0)
        .input('submitted_at', sql.DateTime, now)
        .query(`
          UPDATE Submissions 
          SET file_path = @file_path,
              original_filename = @original_filename,
              file_size = @file_size,
              note = @note,
              is_late = @is_late,
              submitted_at = @submitted_at,
              status = 'submitted'
          WHERE id = @id
        `);

      req.flash('success_msg', isLate 
        ? 'Bạn đã nộp lại bài thành công (Lưu ý: Đã quá hạn nộp bài).' 
        : 'Cập nhật nộp lại bài tập thành công!');
    } else {
      // Nộp bài mới lần đầu
      await pool.request()
        .input('assignment_id', sql.Int, assignmentId)
        .input('student_id', sql.Int, user.id)
        .input('file_path', sql.NVarChar, filePath)
        .input('original_filename', sql.NVarChar, originalFilename)
        .input('file_size', sql.BigInt, fileSize)
        .input('note', sql.NVarChar, note ? note.trim() : '')
        .input('is_late', sql.Bit, isLate ? 1 : 0)
        .input('submitted_at', sql.DateTime, now)
        .query(`
          INSERT INTO Submissions (assignment_id, student_id, file_path, original_filename, file_size, note, is_late, submitted_at, status)
          VALUES (@assignment_id, @student_id, @file_path, @original_filename, @file_size, @note, @is_late, @submitted_at, 'submitted')
        `);

      req.flash('success_msg', isLate 
        ? 'Nộp bài thành công (Lưu ý: Hệ thống ghi nhận bạn đã nộp trễ hạn).' 
        : 'Nộp bài tập thành công!');
    }

    return res.redirect(`/assignments/${assignmentId}`);
  } catch (err) {
    console.error('Lỗi nộp bài:', err);
    req.flash('error_msg', 'Không thể nộp bài do lỗi máy chủ.');
    return res.redirect(`/assignments/${assignmentId}`);
  }
};

// Giảng viên chấm điểm bài nộp
exports.gradeSubmission = async (req, res) => {
  const submissionId = parseInt(req.params.id, 10);
  const { score, feedback, assignment_id } = req.body;
  const user = req.session.user;

  if (score === undefined || score === null || score === '') {
    req.flash('error_msg', 'Vui lòng nhập điểm số.');
    return res.redirect(assignment_id ? `/assignments/${assignment_id}` : '/dashboard');
  }

  const numericScore = parseFloat(score);
  if (isNaN(numericScore) || numericScore < 0 || numericScore > 10) {
    req.flash('error_msg', 'Điểm số phải nằm trong khoảng từ 0 đến 10.');
    return res.redirect(assignment_id ? `/assignments/${assignment_id}` : '/dashboard');
  }

  try {
    const pool = await getPool();

    await pool.request()
      .input('id', sql.Int, submissionId)
      .input('score', sql.Float, numericScore)
      .input('feedback', sql.NVarChar, feedback ? feedback.trim() : '')
      .query(`
        UPDATE Submissions 
        SET score = @score,
            feedback = @feedback,
            graded_at = GETDATE(),
            status = 'graded'
        WHERE id = @id
      `);

    req.flash('success_msg', 'Đã lưu điểm và nhận xét thành công!');
    return res.redirect(assignment_id ? `/assignments/${assignment_id}` : '/dashboard');
  } catch (err) {
    console.error('Lỗi chấm điểm:', err);
    req.flash('error_msg', 'Không thể lưu điểm.');
    return res.redirect(assignment_id ? `/assignments/${assignment_id}` : '/dashboard');
  }
};

// Sinh viên xem lịch sử các bài đã nộp của mình
exports.mySubmissions = async (req, res) => {
  const user = req.session.user;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('studentId', sql.Int, user.id)
      .query(`
        SELECT 
          s.*,
          a.title AS assignment_title,
          a.type AS assignment_type,
          a.due_date AS assignment_due_date,
          a.max_score AS assignment_max_score,
          u.full_name AS teacher_name
        FROM Submissions s
        JOIN Assignments a ON s.assignment_id = a.id
        JOIN Users u ON a.teacher_id = u.id
        WHERE s.student_id = @studentId
        ORDER BY s.submitted_at DESC
      `);

    res.render('submissions/my-submissions', {
      title: 'Các bài tập & đồ án đã nộp',
      submissions: result.recordset,
      moment,
      user,
    });
  } catch (err) {
    console.error('Lỗi tải bài đã nộp:', err);
    req.flash('error_msg', 'Không thể tải lịch sử nộp bài.');
    res.redirect('/dashboard');
  }
};

// Tải file bài nộp của sinh viên
exports.downloadFile = async (req, res) => {
  const submissionId = parseInt(req.params.id, 10);
  const user = req.session.user;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, submissionId)
      .query(`
        SELECT s.*, a.teacher_id 
        FROM Submissions s
        JOIN Assignments a ON s.assignment_id = a.id
        WHERE s.id = @id
      `);

    if (result.recordset.length === 0) {
      req.flash('error_msg', 'Không tìm thấy file.');
      return res.redirect('/dashboard');
    }

    const sub = result.recordset[0];

    // Chỉ cho phép sinh viên nộp bài đó, hoặc giảng viên tạo đề bài, hoặc admin tải file
    if (user.role === 'student' && sub.student_id !== user.id) {
      req.flash('error_msg', 'Bạn không có quyền tải file của sinh viên khác.');
      return res.redirect('/dashboard');
    }

    const fullDiskPath = path.join(__dirname, '../../', sub.file_path);
    if (!fs.existsSync(fullDiskPath)) {
      req.flash('error_msg', 'File không còn tồn tại trên hệ thống lưu trữ.');
      return res.redirect('back');
    }

    return res.download(fullDiskPath, sub.original_filename);
  } catch (err) {
    console.error('Lỗi tải file:', err);
    req.flash('error_msg', 'Lỗi khi tải file.');
    return res.redirect('back');
  }
};
