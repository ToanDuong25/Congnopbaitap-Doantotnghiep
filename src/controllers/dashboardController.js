const moment = require('moment');
const { sql, getPool } = require('../config/db');

exports.index = async (req, res) => {
  const user = req.session.user;

  try {
    const pool = await getPool();

    if (user.role === 'teacher' || user.role === 'admin') {
      // 1. Thống kê dành cho Giảng viên
      const statsRes = await pool.request()
        .input('teacherId', sql.Int, user.id)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM Assignments WHERE teacher_id = @teacherId) AS total_assignments,
            (SELECT COUNT(*) FROM Assignments WHERE teacher_id = @teacherId AND type = 'graduation_thesis') AS total_theses,
            (SELECT COUNT(*) FROM Submissions s JOIN Assignments a ON s.assignment_id = a.id WHERE a.teacher_id = @teacherId) AS total_submissions,
            (SELECT COUNT(*) FROM Submissions s JOIN Assignments a ON s.assignment_id = a.id WHERE a.teacher_id = @teacherId AND s.status = 'submitted') AS pending_grading
        `);

      const recentAssignmentsRes = await pool.request()
        .input('teacherId', sql.Int, user.id)
        .query(`
          SELECT TOP 5 a.*,
            (SELECT COUNT(*) FROM Submissions s WHERE s.assignment_id = a.id) AS submission_count
          FROM Assignments a
          WHERE a.teacher_id = @teacherId
          ORDER BY a.created_at DESC
        `);

      const recentSubmissionsRes = await pool.request()
        .input('teacherId', sql.Int, user.id)
        .query(`
          SELECT TOP 8 
            s.*,
            a.title AS assignment_title,
            a.type AS assignment_type,
            u.user_code AS student_code,
            u.full_name AS student_name
          FROM Submissions s
          JOIN Assignments a ON s.assignment_id = a.id
          JOIN Users u ON s.student_id = u.id
          WHERE a.teacher_id = @teacherId
          ORDER BY s.submitted_at DESC
        `);

      return res.render('dashboard/teacher', {
        title: 'Bảng Điều Khiển - Giảng Viên',
        stats: statsRes.recordset[0],
        recentAssignments: recentAssignmentsRes.recordset,
        recentSubmissions: recentSubmissionsRes.recordset,
        moment,
        user,
      });
    } else {
      // 2. Thống kê dành cho Sinh viên
      const studentStatsRes = await pool.request()
        .input('studentId', sql.Int, user.id)
        .query(`
          SELECT 
            (SELECT COUNT(*) FROM Assignments) AS total_assignments,
            (SELECT COUNT(*) FROM Submissions WHERE student_id = @studentId) AS submitted_count,
            (SELECT COUNT(*) FROM Submissions WHERE student_id = @studentId AND status = 'graded') AS graded_count
        `);

      // Các bài tập sắp đến hạn (chưa nộp hoặc chưa hết hạn)
      const upcomingAssignmentsRes = await pool.request()
        .input('studentId', sql.Int, user.id)
        .query(`
          SELECT TOP 5 
            a.*,
            u.full_name AS teacher_name,
            s.id AS submission_id,
            s.score,
            s.status AS submission_status
          FROM Assignments a
          JOIN Users u ON a.teacher_id = u.id
          LEFT JOIN Submissions s ON s.assignment_id = a.id AND s.student_id = @studentId
          WHERE a.due_date >= GETDATE()
          ORDER BY a.due_date ASC
        `);

      // Các bài tập vừa được chấm điểm
      const recentGradedRes = await pool.request()
        .input('studentId', sql.Int, user.id)
        .query(`
          SELECT TOP 5
            s.*,
            a.title AS assignment_title,
            a.type AS assignment_type,
            u.full_name AS teacher_name
          FROM Submissions s
          JOIN Assignments a ON s.assignment_id = a.id
          JOIN Users u ON a.teacher_id = u.id
          WHERE s.student_id = @studentId AND s.status = 'graded'
          ORDER BY s.graded_at DESC
        `);

      return res.render('dashboard/student', {
        title: 'Bảng Điều Khiển - Sinh Viên',
        stats: studentStatsRes.recordset[0],
        upcomingAssignments: upcomingAssignmentsRes.recordset,
        recentGraded: recentGradedRes.recordset,
        moment,
        user,
      });
    }
  } catch (err) {
    console.error('Lỗi dashboard:', err);
    req.flash('error_msg', 'Không thể tải bảng điều khiển.');
    return res.render('dashboard/error', {
      title: 'Lỗi',
      user,
    });
  }
};
