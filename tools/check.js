const { readdirSync, readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const ejs = require('ejs');

function check(file) {
  if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  } else if (file.endsWith('.ejs')) {
    ejs.compile(readFileSync(file, 'utf8'), { filename: path.resolve(file) });
  }
}
function walk(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) walk(file); else check(file);
  }
}
for (const directory of ['src', 'api', 'tests', 'tools']) walk(directory);
check('server.js');
console.log('JavaScript syntax and EJS compilation passed.');
