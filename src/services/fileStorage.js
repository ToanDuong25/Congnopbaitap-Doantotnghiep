const fs = require('fs');
const path = require('path');
const { uploadRoot } = require('../config/storage');

function resolveUploadFile(storedPath, folder) {
  if (!['submissions', 'assignments'].includes(folder) || typeof storedPath !== 'string') return null;
  const prefix = `/uploads/${folder}/`;
  if (!storedPath.startsWith(prefix)) return null;
  const filename = storedPath.slice(prefix.length);
  if (!filename || /[/\\:\x00]/.test(filename) || filename === '.' || filename === '..') return null;
  const root = path.join(uploadRoot, folder);
  const candidate = path.join(root, filename);
  if (!fs.existsSync(candidate)) return null;
  const realRoot = fs.realpathSync(root);
  const realFile = fs.realpathSync(candidate);
  const relative = path.relative(realRoot, realFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(realFile).isFile()) return null;
  return realFile;
}

module.exports = { resolveUploadFile };
