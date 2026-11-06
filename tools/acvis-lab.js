const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const lab = path.join(root, '.acvis-lab');
const marker = path.join(lab, 'active.json');
const snapshotPath = path.join(lab, 'baseline.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function saveJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
function target(file) {
  const absolute = path.resolve(root, file);
  if (!absolute.startsWith(root + path.sep)) throw new Error('Target must remain inside this project.');
  return absolute;
}
function caseFor(id) {
  const cases = readJson(path.join(lab, 'cases.json'));
  if (!Object.hasOwn(cases, id)) throw new Error('Choose one CWE: 89, 79, 22, 639, 798.');
  return cases[id];
}
function changedSource(bytes, item) {
  const source = bytes.toString('utf8').replace(/\r\n/g, '\n');
  if (source.split(item.old).length !== 2) throw new Error('Expected baseline fragment must appear exactly once.');
  return Buffer.from(source.replace(item.old, item.new));
}
function prepare() {
  if (fs.existsSync(marker)) throw new Error('Restore the active mutation before preparing again.');
  const cases = readJson(path.join(lab, 'cases.json'));
  const previous = fs.existsSync(snapshotPath) ? readJson(snapshotPath) : null;
  const snapshots = {};
  for (const [id, item] of Object.entries(cases)) {
    const bytes = fs.readFileSync(target(item.file));
    if (previous?.[item.file] && hash(bytes) !== previous[item.file].hash) {
      throw new Error('Baseline file changed. Review and deliberately refresh local lab snapshots rather than overwriting them.');
    }
    const mutated = changedSource(bytes, item);
    snapshots[item.file] = { hash: hash(bytes), base64: bytes.toString('base64') };
    const lines = value => value.toString('utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
    const before = lines(bytes), after = lines(mutated);
    const patch = `--- a/${item.file}\n+++ b/${item.file}\n@@ -1,${before.length} +1,${after.length} @@\n`
      + before.map(line => '-' + line).join('\n') + '\n' + after.map(line => '+' + line).join('\n') + '\n';
    fs.writeFileSync(path.join(lab, `cwe-${id}.patch`), patch);
  }
  saveJson(snapshotPath, snapshots);
  console.log('Prepared five local-only patches. No source mutations, commits or pushes.');
}
function apply(id) {
  if (fs.existsSync(marker)) throw new Error('A mutation is already active. Restore it first.');
  const item = caseFor(id);
  const snapshot = readJson(snapshotPath)[item.file];
  const bytes = fs.readFileSync(target(item.file));
  if (!snapshot || hash(bytes) !== snapshot.hash) throw new Error('Source differs from the verified baseline; no file changed.');
  const mutated = changedSource(bytes, item);
  // Write the recovery record first, so interruption does not lose original bytes.
  saveJson(marker, { id, file: item.file, before: bytes.toString('base64'), afterHash: hash(mutated) });
  fs.writeFileSync(target(item.file), mutated);
  console.log(`Applied CWE-${id} locally. No commit or push performed.`);
}
function restore() {
  if (!fs.existsSync(marker)) { console.log('No active mutation.'); return; }
  const active = readJson(marker);
  const original = Buffer.from(active.before, 'base64');
  const current = fs.readFileSync(target(active.file));
  if (hash(current) !== active.afterHash && hash(current) !== hash(original)) {
    throw new Error('Source was edited after mutation; refusing to overwrite your changes. Recovery bytes remain in active.json.');
  }
  fs.writeFileSync(target(active.file), original);
  fs.unlinkSync(marker);
  console.log(`Restored the safe baseline for CWE-${active.id}.`);
}
function tests(pattern) {
  const args = ['--test', '--test-concurrency=1'];
  if (pattern) args.push('--test-name-pattern=' + pattern);
  args.push('tests/security.test.js');
  return spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', timeout: 60000 });
}
function verify() {
  if (fs.existsSync(marker)) throw new Error('Restore the active mutation before verifying.');
  const evidence = path.join(lab, 'evidence');
  fs.mkdirSync(evidence, { recursive: true });
  const baseline = tests();
  fs.writeFileSync(path.join(evidence, 'baseline.log'), (baseline.stdout || '') + (baseline.stderr || ''));
  if (baseline.status !== 0) throw new Error('Safe baseline tests failed. See local evidence/baseline.log.');
  const outcomes = [];
  for (const id of Object.keys(readJson(path.join(lab, 'cases.json')))) {
    try {
      apply(id);
      const result = tests(`^CWE-${id} `);
      const output = (result.stdout || '') + (result.stderr || '');
      fs.writeFileSync(path.join(evidence, `cwe-${id}.log`), output);
      const observed = result.status === 1 && output.includes(`not ok 1 - CWE-${id} `) && output.includes('AssertionError');
      outcomes.push({ cwe: `CWE-${id}`, protectionDetectedMutation: observed });
      if (!observed) throw new Error(`CWE-${id}: expected behavior assertion failure was not observed.`);
    } finally { restore(); }
  }
  if (tests().status !== 0) throw new Error('Restored baseline tests failed.');
  saveJson(path.join(evidence, 'results.json'), outcomes);
  console.log('All five real behavior mutations were detected. Safe baseline restored. No commits or pushes.');
}

try {
  const [command, id] = process.argv.slice(2);
  if (command === 'prepare') prepare();
  else if (command === 'apply') apply(id);
  else if (command === 'restore') restore();
  else if (command === 'verify') verify();
  else throw new Error('Usage: node tools/acvis-lab.js prepare|verify|apply <CWE>|restore');
} catch (error) { console.error(error.message); process.exitCode = 1; }
