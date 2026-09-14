const path = require('path');
const fs = require('fs');
const moment = require('moment');
const { sql, getPool } = require('../config/db');

// Danh sách bài tập / đồ án
exports.listAssignments = async (req, res) => {
  try {
    const pool = await getPool();
    const typeFilter = req.query.type || 'all'; // all, assignment, graduation_thesis
    const user = req.session.user;

    let query = `
      SELECT 
        a.id, 
        a.title, 
        a.description, 
        a.type, 
        a.due_date, 
        a.max_score, 
        a.created_at,
        u.full_name AS teacher_name,
        u.department AS teacher_department,
        (SELECT COUNT(*) FROM Submissions s WHERE s.assignment_id = a.id) AS total_submissions
    `;

    // Nếu là sinh viên, lấy thêm thông tin bài nộp của chính sinh viên đó
    if (user.role === 'student') {
      query += `,
        (SELECT TOP 1 s.id FROM Submissions s WHERE s.assignment_id = a.id AND s.student_id = ${user.id}) AS my_submission_id,
        (SELECT TOP 1 s.score FROM Submissions s WHERE s.assignment_id = a.id AND s.student_id = ${user.id}) AS my_score,
        (SELECT TOP 1 s.is_late FROM Submissions s WHERE s.assignment_id = a.id AND s.student_id = ${user.id}) AS my_is_late,
        (SELECT TOP 1 s.status FROM Submissions s WHERE s.assignment_id = a.id AND s.student_id = ${user.id}) AS my_status
      `;
    }

    query += `
      FROM Assignments a
      JOIN Users u ON a.teacher_id = u.id
    `;

    const request = pool.request();

    if (typeFilter !== 'all') {
      query += ` WHERE a.type = @typeFilter `;
      request.input('typeFilter', sql.NVarChar, typeFilter);
    }

    // Nếu là giảng viên xem trang của riêng mình hoặc xem tất cả
    if (user.role === 'teacher' && req.query.mine === 'true') {
      query += (typeFilter !== 'all' ? ` AND ` : ` WHERE `) + ` a.teacher_id = @teacherId `;
      request.input('teacherId', sql.Int, user.id);
    }

    query += ` ORDER BY a.due_date DESC`;

    const result = await request.query(query);

    res.render('assignments/list', {
      title: 'Danh sách Bài tập & Đồ án',
      assignments: result.recordset,
      typeFilter,
      moment,
      user,
    });
  } catch (err) {
    console.error('Lỗi lấy danh sách bài tập:', err);
    req.flash('error_msg', 'Không thể tải danh sách bài tập.');
    res.redirect('/dashboard');
  }
};

// Hiển thị form tạo mới bài tập / đồ án (Chỉ dành cho Giảng viên)
exports.showCreateForm = (req, res) => {
  res.render('assignments/create', {
    title: 'Tạo Bài tập / Đề tài Đồ án mới',
    defaultType: req.query.type || 'assignment',
  });
};

// Xử lý tạo mới bài tập / đồ án
exports.createAssignment = async (req, res) => {
  const { title, description, type, due_date, max_score } = req.body;
  const user = req.session.user;

  if (!title || !due_date) {
    req.flash('error_msg', 'Vui lòng điền tiêu đề và thời hạn nộp.');
    return res.redirect('/assignments/create');
  }

  let attachmentPath = null;
  let attachmentName = null;

  if (req.file) {
    attachmentPath = '/uploads/assignments/' + req.file.filename;
    attachmentName = req.file.originalname;
  }

  try {
    const pool = await getPool();
    await pool.request()
      .input('title', sql.NVarChar, title.trim())
      .input('description', sql.NVarChar, description ? description.trim() : '')
      .input('type', sql.NVarChar, type || 'assignment')
      .input('due_date', sql.DateTime, new Date(due_date))
      .input('teacher_id', sql.Int, user.id)
      .input('attachment_path', sql.NVarChar, attachmentPath)
      .input('attachment_name', sql.NVarChar, attachmentName)
      .input('max_score', sql.Float, max_score ? parseFloat(max_score) : 10.0)
      .query(`
        INSERT INTO Assignments (title, description, type, due_date, teacher_id, attachment_path, attachment_name, max_score)
        VALUES (@title, @description, @type, @due_date, @teacher_id, @attachment_path, @attachment_name, @max_score)
      `);

    req.flash('success_msg', 'Đã tạo bài tập / đề tài đồ án mới thành công!');
    res.redirect('/assignments');
  } catch (err) {
    console.error('Lỗi tạo bài tập:', err);
    req.flash('error_msg', 'Đã xảy ra lỗi khi tạo bài tập.');
    res.redirect('/assignments/create');
  }
};

// Chi tiết bài tập / đồ án
exports.showDetail = async (req, res) => {
  const assignmentId = parseInt(req.params.id, 10);
  const user = req.session.user;

  try {
    const pool = await getPool();

    // 1. Lấy thông tin bài tập
    const assignmentRes = await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`
        SELECT a.*, u.full_name AS teacher_name, u.email AS teacher_email, u.department AS teacher_department
        FROM Assignments a
        JOIN Users u ON a.teacher_id = u.id
        WHERE a.id = @id
      `);

    if (assignmentRes.recordset.length === 0) {
      req.flash('error_msg', 'Không tìm thấy bài tập hoặc đồ án này.');
      return res.redirect('/assignments');
    }

    const assignment = assignmentRes.recordset[0];
    let mySubmission = null;
    let submissions = [];

    // 2. Nếu là Sinh viên -> lấy bài nộp của bản thân
    if (user.role === 'student') {
      const subRes = await pool.request()
        .input('assignmentId', sql.Int, assignmentId)
        .input('studentId', sql.Int, user.id)
        .query(`
          SELECT * FROM Submissions 
          WHERE assignment_id = @assignmentId AND student_id = @studentId
        `);
      if (subRes.recordset.length > 0) {
        mySubmission = subRes.recordset[0];
      }
    }

    // 3. Nếu là Giảng viên -> lấy toàn bộ danh sách sinh viên đã nộp
    if (user.role === 'teacher' || user.role === 'admin') {
      const allSubRes = await pool.request()
        .input('assignmentId', sql.Int, assignmentId)
        .query(`
          SELECT s.*, u.user_code AS student_code, u.full_name AS student_name, u.email AS student_email, u.department AS student_class
          FROM Submissions s
          JOIN Users u ON s.student_id = u.id
          WHERE s.assignment_id = @assignmentId
          ORDER BY s.submitted_at DESC
        `);
      submissions = allSubRes.recordset;
    }

    const isExpired = new Date(assignment.due_date) < new Date();

    res.render('assignments/detail', {
      title: assignment.title,
      assignment,
      mySubmission,
      submissions,
      isExpired,
      moment,
      user,
    });
  } catch (err) {
    console.error('Lỗi xem chi tiết bài tập:', err);
    req.flash('error_msg', 'Đã xảy ra lỗi khi tải thông tin bài tập.');
    res.redirect('/assignments');
  }
};

// Hiển thị form chỉnh sửa bài tập
exports.showEditForm = async (req, res) => {
  const assignmentId = parseInt(req.params.id, 10);
  const user = req.session.user;

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`SELECT * FROM Assignments WHERE id = @id`);

    if (result.recordset.length === 0) {
      req.flash('error_msg', 'Không tìm thấy bài tập.');
      return res.redirect('/assignments');
    }

    const assignment = result.recordset[0];
    if (assignment.teacher_id !== user.id && user.role !== 'admin') {
      req.flash('error_msg', 'Bạn không có quyền chỉnh sửa bài tập này.');
      return res.redirect('/assignments');
    }

    res.render('assignments/edit', {
      title: 'Chỉnh sửa: ' + assignment.title,
      assignment,
      moment,
    });
  } catch (err) {
    console.error('Lỗi tải form sửa bài tập:', err);
    req.flash('error_msg', 'Đã xảy ra lỗi.');
    res.redirect('/assignments');
  }
};

// Cập nhật bài tập
exports.updateAssignment = async (req, res) => {
  const assignmentId = parseInt(req.params.id, 10);
  const user = req.session.user;
  const { title, description, type, due_date, max_score } = req.body;

  try {
    const pool = await getPool();
    const checkRes = await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`SELECT * FROM Assignments WHERE id = @id`);

    if (checkRes.recordset.length === 0) {
      req.flash('error_msg', 'Không tìm thấy bài tập.');
      return res.redirect('/assignments');
    }

    const assignment = checkRes.recordset[0];
    if (assignment.teacher_id !== user.id && user.role !== 'admin') {
      req.flash('error_msg', 'Bạn không có quyền chỉnh sửa bài tập này.');
      return res.redirect('/assignments');
    }

    let attachmentPath = assignment.attachment_path;
    let attachmentName = assignment.attachment_name;

    if (req.file) {
      attachmentPath = '/uploads/assignments/' + req.file.filename;
      attachmentName = req.file.originalname;
    }

    await pool.request()
      .input('id', sql.Int, assignmentId)
      .input('title', sql.NVarChar, title.trim())
      .input('description', sql.NVarChar, description ? description.trim() : '')
      .input('type', sql.NVarChar, type || assignment.type)
      .input('due_date', sql.DateTime, new Date(due_date))
      .input('attachment_path', sql.NVarChar, attachmentPath)
      .input('attachment_name', sql.NVarChar, attachmentName)
      .input('max_score', sql.Float, max_score ? parseFloat(max_score) : 10.0)
      .query(`
        UPDATE Assignments 
        SET title = @title,
            description = @description,
            type = @type,
            due_date = @due_date,
            attachment_path = @attachment_path,
            attachment_name = @attachment_name,
            max_score = @max_score,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    req.flash('success_msg', 'Cập nhật bài tập thành công!');
    res.redirect(`/assignments/${assignmentId}`);
  } catch (err) {
    console.error('Lỗi cập nhật bài tập:', err);
    req.flash('error_msg', 'Không thể cập nhật bài tập.');
    res.redirect(`/assignments/${assignmentId}/edit`);
  }
};

// Xóa bài tập
exports.deleteAssignment = async (req, res) => {
  const assignmentId = parseInt(req.params.id, 10);
  const user = req.session.user;

  try {
    const pool = await getPool();
    const checkRes = await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`SELECT * FROM Assignments WHERE id = @id`);

    if (checkRes.recordset.length === 0) {
      req.flash('error_msg', 'Không tìm thấy bài tập.');
      return res.redirect('/assignments');
    }

    const assignment = checkRes.recordset[0];
    if (assignment.teacher_id !== user.id && user.role !== 'admin') {
      req.flash('error_msg', 'Bạn không có quyền xóa bài tập này.');
      return res.redirect('/assignments');
    }

    await pool.request()
      .input('id', sql.Int, assignmentId)
      .query(`DELETE FROM Assignments WHERE id = @id`);

    req.flash('success_msg', 'Đã xóa bài tập thành công!');
    res.redirect('/assignments');
  } catch (err) {
    console.error('Lỗi xóa bài tập:', err);
    req.flash('error_msg', 'Không thể xóa bài tập này.');
    res.redirect('/assignments');
  }
};
