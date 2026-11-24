const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeAtomically } = require('../db/atomicWrite');

function withTempDb(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wardrobe-atomic-'));
  const filename = path.join(dir, 'wardrobe.db');
  fs.writeFileSync(filename, Buffer.from('prior-version'));
  try { fn(filename, dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('replaces database image and synchronizes its contents', () => {
  withTempDb((filename, dir) => {
    let synced = false;
    const io = { ...fs, fsyncSync(fd) { synced = true; fs.fsyncSync(fd); } };
    writeAtomically(filename, Buffer.from('new-version'), io);
    assert.equal(fs.readFileSync(filename, 'utf8'), 'new-version');
    assert.equal(synced, true);
    assert.deepEqual(fs.readdirSync(dir), ['wardrobe.db']);
  });
});

test('preserves the previous database if writing the temp file fails', () => {
  withTempDb((filename, dir) => {
    const io = { ...fs, writeFileSync(fd, data) {
      fs.writeSync(fd, data.subarray(0, 3));
      throw new Error('simulated write failure');
    } };
    assert.throws(() => writeAtomically(filename, Buffer.from('new-version'), io), /simulated write failure/);
    assert.equal(fs.readFileSync(filename, 'utf8'), 'prior-version');
    assert.deepEqual(fs.readdirSync(dir), ['wardrobe.db']);
  });
});

test('preserves the previous database if renaming the temp file fails', () => {
  withTempDb((filename, dir) => {
    const io = { ...fs, renameSync() { throw new Error('simulated rename failure'); } };
    assert.throws(() => writeAtomically(filename, Buffer.from('new-version'), io), /simulated rename failure/);
    assert.equal(fs.readFileSync(filename, 'utf8'), 'prior-version');
    assert.deepEqual(fs.readdirSync(dir), ['wardrobe.db']);
  });
});

test('creates a new database file if none exists yet', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wardrobe-atomic-empty-'));
  try {
    const filename = path.join(dir, 'wardrobe.db');
    writeAtomically(filename, Buffer.from('first-version'));
    assert.equal(fs.readFileSync(filename, 'utf8'), 'first-version');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
