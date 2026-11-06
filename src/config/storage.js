const path = require('path');

const isVercel = Boolean(process.env.VERCEL);
const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || (isVercel ? '/tmp/uploads' : path.join(__dirname, '../../uploads')));

module.exports = {
  isVercel,
  uploadRoot,
  assignmentDir: path.join(uploadRoot, 'assignments'),
  submissionDir: path.join(uploadRoot, 'submissions'),
};
