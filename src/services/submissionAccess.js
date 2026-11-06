function canAccessSubmission(user, submission) {
  return Boolean(user && submission && (
    user.role === 'admin' ||
    (user.role === 'student' && submission.student_id === user.id) ||
    (user.role === 'teacher' && submission.teacher_id === user.id)
  ));
}

module.exports = { canAccessSubmission };
