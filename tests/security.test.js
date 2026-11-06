const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

// Only the MSSQL provider boundary is replaced. Routes, sessions, bcrypt,
// templates, multipart handling, filesystem and HTTP are the real application.
const db = new DatabaseSync(':memory:');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-acvis-'));
const uploadRoot = path.join(temporaryRoot, 'uploads');
process.env.UPLOAD_ROOT = uploadRoot;
process.env.SESSION_SECRET = randomBytes(48).toString('base64url');
const password = randomBytes(24).toString('base64url');
const knownHash = bcrypt.hashSync(password, 4);
db.exec(`CREATE TABLE Users (id INTEGER PRIMARY KEY, user_code TEXT, full_name TEXT, email TEXT, password TEXT, role TEXT, department TEXT);
CREATE TABLE Assignments (id INTEGER PRIMARY KEY, title TEXT, description TEXT, type TEXT, due_date TEXT, teacher_id INTEGER, max_score REAL, attachment_path TEXT, attachment_name TEXT, created_at TEXT);
CREATE TABLE Submissions (id INTEGER PRIMARY KEY, assignment_id INTEGER, student_id INTEGER, file_path TEXT, original_filename TEXT, file_size INTEGER, note TEXT, is_late INTEGER, submitted_at TEXT, score REAL, feedback TEXT, graded_at TEXT, status TEXT);`);
for (const [id, role] of [[1, 'student'], [2, 'student'], [3, 'teacher'], [4, 'teacher']]) {
  db.prepare('INSERT INTO Users VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, `U${id}`, `User ${id}`, `user${id}@example.invalid`, knownHash, role, 'Demo');
}
db.prepare('INSERT INTO Assignments VALUES (1, ?, ?, ?, ?, 3, 10, ?, ?, ?)').run('Demo assignment', 'Synthetic description', 'assignment', '2099-01-01', '/uploads/assignments/brief.txt', 'brief.txt', '2026-01-01');
for (const id of [1, 2]) db.prepare('INSERT INTO Submissions VALUES (?, 1, ?, ?, ?, 20, ?, 0, ?, NULL, NULL, NULL, ?)').run(id, id, `/uploads/submissions/student-${id}.txt`, `student-${id}.txt`, 'Synthetic note', '2026-01-01', 'submitted');
fs.mkdirSync(path.join(uploadRoot, 'submissions'), { recursive: true });
fs.mkdirSync(path.join(uploadRoot, 'assignments'), { recursive: true });
fs.writeFileSync(path.join(uploadRoot, 'submissions/student-1.txt'), 'STUDENT-ONE-PRIVATE');
fs.writeFileSync(path.join(uploadRoot, 'submissions/student-2.txt'), 'STUDENT-TWO-PRIVATE');
fs.writeFileSync(path.join(uploadRoot, 'assignments/brief.txt'), 'ASSIGNMENT-BRIEF');
fs.writeFileSync(path.join(uploadRoot, 'canary.txt'), 'SYNTHETIC-TRAVERSAL-CANARY');
const calls = [];
const fakePool = {
  request() {
    const parameters = {};
    return {
      input(name, _type, value) { parameters[name] = value; return this; },
      async query(sqlText) {
        calls.push({ sqlText, parameters: { ...parameters } });
        const statement = db.prepare(sqlText.replace(/SELECT TOP 1 /gi, 'SELECT ').replace(/GETDATE\(\)/gi, "'2026-01-01'"));
        const selected = {};
        for (const [key, value] of Object.entries(parameters)) if (sqlText.includes('@' + key)) selected[key] = value instanceof Date ? value.toISOString() : value;
        if (/^\s*(SELECT|WITH)/i.test(sqlText)) return { recordset: statement.all(selected) };
        statement.run(selected);
        return { recordset: [] };
      }
    };
  }
};
const originalDbModule = require.resolve('../src/config/db');
const type = Symbol('MSSQL parameter type');
require.cache[originalDbModule] = { id: originalDbModule, filename: originalDbModule, loaded: true,
  exports: { getPool: async () => fakePool, sql: { Int: type, NVarChar: type, BigInt: type, Bit: type, Float: type, DateTime: type } } };

let server, base;
before(async () => {
  const app = require('../server');
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  db.close();
  // The target is the exact temporary directory returned by mkdtemp, never user uploads.
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  delete process.env.UPLOAD_ROOT;
});
async function login(account = 'U1', suppliedPassword = password) {
  return fetch(base + '/auth/login', { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ account, password: suppliedPassword }) });
}
async function cookieFor(account) {
  const response = await login(account);
  assert.equal(response.headers.get('location'), '/dashboard');
  return response.headers.get('set-cookie').split(';')[0];
}

test('CWE-89 login treats injected SQL as account text while normal login works', async () => {
  assert.equal((await login()).headers.get('location'), '/dashboard');
  const payload = `' UNION SELECT 99, 'FORGED', 'Injected user', 'injected@example.invalid', '${knownHash}', 'teacher', 'Demo' --`;
  const response = await login(payload);
  assert.equal(response.headers.get('location'), '/auth/login');
  const call = calls.findLast(item => /FROM Users/.test(item.sqlText));
  assert.ok(!call.sqlText.includes(knownHash));
});

test('registration and first submission preserve apostrophes as literal data', async () => {
  const registration = await fetch(base + '/auth/register', { method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ user_code: 'SNEW', full_name: "O'Connor", email: 'new@example.invalid', password, confirm_password: password, role: 'student', department: "Dean's class" }) });
  assert.equal(registration.headers.get('location'), '/auth/login');
  const cookie = await cookieFor('SNEW');
  const form = new FormData();
  form.set('note', "It's a synthetic submission");
  form.set('submission_file', new Blob(['SYNTHETIC-STUDENT-FILE'], { type: 'text/plain' }), 'answer.txt');
  await fetch(base + '/submissions/assignment/1', { method: 'POST', redirect: 'manual', headers: { cookie }, body: form });
  const history = await fetch(base + '/assignments/1', { headers: { cookie } });
  const html = await history.text();
  assert.ok(html.includes('answer.txt'), 'Submitted file must appear through the assignment detail route');
});

test('CWE-79 assignment search reflects escaped text rather than executable HTML', async () => {
  const cookie = await cookieFor('U1');
  const payload = '<img src=x onerror=alert(1)>';
  const response = await fetch(base + '/assignments?q=' + encodeURIComponent(payload), { headers: { cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes(payload));
});

test('CWE-639 submission downloads enforce student and assigned-teacher ownership', async () => {
  const ownCookie = await cookieFor('U1');
  const otherStudent = await cookieFor('U2');
  const assignedTeacher = await cookieFor('U3');
  const otherTeacher = await cookieFor('U4');
  const own = await fetch(base + '/submissions/1/download', { headers: { cookie: ownCookie } });
  assert.equal(own.status, 200);
  assert.equal(await own.text(), 'STUDENT-ONE-PRIVATE');
  for (const cookie of [otherStudent, otherTeacher]) {
    const response = await fetch(base + '/submissions/1/download', { headers: { cookie }, redirect: 'manual' });
    assert.equal(response.status, 403);
    assert.ok(!(await response.text()).includes('STUDENT-ONE-PRIVATE'));
  }
  assert.equal((await fetch(base + '/submissions/1/download', { headers: { cookie: assignedTeacher } })).status, 200);
});

test('CWE-22 download cannot be redirected outside the submission storage directory', async () => {
  const cookie = await cookieFor('U1');
  const response = await fetch(base + '/submissions/1/download?file=..%2Fcanary.txt', { headers: { cookie } });
  assert.equal(response.status, 200);
  const contents = await response.text();
  assert.equal(contents, 'STUDENT-ONE-PRIVATE');
  assert.ok(!contents.includes('SYNTHETIC-TRAVERSAL-CANARY'));
});

test('CWE-798 session cookies are signed with the configured environment key', async () => {
  const signature = require('cookie-signature');
  const cookie = await cookieFor('U1');
  const signedValue = decodeURIComponent(cookie.split('=').slice(1).join('='));
  assert.ok(signedValue.startsWith('s:'));
  assert.notEqual(signature.unsign(signedValue.slice(2), process.env.SESSION_SECRET), false);
  assert.equal(signature.unsign(signedValue.slice(2), randomBytes(48).toString('base64url')), false);
});

test('an unrelated teacher cannot read or grade another teacher submission', async () => {
  const cookie = await cookieFor('U4');
  assert.equal((await fetch(base + '/assignments/1', { headers: { cookie }, redirect: 'manual' })).status, 403);
  const grade = await fetch(base + '/submissions/1/grade', { method: 'POST', redirect: 'manual',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ score: '7.25', feedback: 'Synthetic grading attempt', assignment_id: '1' }) });
  assert.equal(grade.status, 403);
});

test('private files have no public static shortcut and assignment attachment still downloads', async () => {
  assert.equal((await fetch(base + '/uploads/submissions/student-1.txt', { redirect: 'manual' })).status, 404);
  assert.equal((await fetch(base + '/assignments/1/attachment', { redirect: 'manual' })).headers.get('location'), '/auth/login');
  const cookie = await cookieFor('U1');
  const attachment = await fetch(base + '/assignments/1/attachment', { headers: { cookie } });
  assert.equal(attachment.status, 200);
  assert.equal(await attachment.text(), 'ASSIGNMENT-BRIEF');
});

test('assigned teacher can grade and student can read the resulting score', async () => {
  const teacher = await cookieFor('U3');
  const response = await fetch(base + '/submissions/1/grade', { method: 'POST', redirect: 'manual',
    headers: { cookie: teacher, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ score: '8.5', feedback: 'Graded synthetic submission', assignment_id: '999' }) });
  assert.equal(response.headers.get('location'), '/assignments/1');
  const student = await cookieFor('U1');
  const html = await (await fetch(base + '/assignments/1', { headers: { cookie: student } })).text();
  assert.ok(html.includes('Graded synthetic submission'));
});

test('missing environment signing key fails before starting the application', () => {
  const { spawnSync } = require('node:child_process');
  const result = spawnSync(process.execPath, ['-e', "require('./server')"], {
    cwd: path.join(__dirname, '..'), encoding: 'utf8', env: { ...process.env, SESSION_SECRET: '', VERCEL: '1' }
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SESSION_SECRET must contain at least 32 bytes/);
});

test('teacher title search keeps the existing own-assignment filter', async () => {
  const cookie = await cookieFor('U3');
  const response = await fetch(base + '/assignments?mine=true&type=assignment&q=Demo', { headers: { cookie } });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('name="mine" value="true"'));
  assert.ok(html.includes('Demo assignment'));
});
