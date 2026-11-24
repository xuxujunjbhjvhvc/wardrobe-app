const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { replaceOutfit, removeOutfit } = require('../utils/outfitChanges');

async function fixture() {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.exec([
    'CREATE TABLE clothing (id INTEGER PRIMARY KEY, status TEXT, worn_count INTEGER, wash_count INTEGER);',
    'CREATE TABLE outfits (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE, note TEXT, weather TEXT, created_at TEXT);',
    'CREATE TABLE outfit_items (outfit_id INTEGER, clothing_id INTEGER, UNIQUE(outfit_id, clothing_id));',
    "INSERT INTO clothing VALUES (1,'active',0,0),(2,'active',0,0),(3,'idle',0,0);"
  ].join('\n'));
  const db = {
    prepare(sql) {
      return {
        all(...params) {
          const stmt = raw.prepare(sql);
          try { stmt.bind(params); const rows = []; while (stmt.step()) rows.push(stmt.getAsObject()); return rows; }
          finally { stmt.free(); }
        },
        get(...params) {
          const stmt = raw.prepare(sql);
          try { stmt.bind(params); return stmt.step() ? stmt.getAsObject() : undefined; }
          finally { stmt.free(); }
        },
        run(...params) {
          raw.run(sql, params);
          return { lastInsertRowid: raw.exec('SELECT last_insert_rowid()')[0].values[0][0] };
        }
      };
    },
    exec(sql) { raw.exec(sql); }
  };
  return { raw, db };
}
const rows = (raw, sql) => raw.exec(sql)[0]?.values || [];
const date = '2026-11-24';

test('new outfit records links and wear counters', async () => {
  const { raw, db } = await fixture();
  try {
    const out = replaceOutfit(db, { date, items: [1, 2] });
    assert.equal(out.data.items.length, 2);
    assert.deepEqual(rows(raw, 'SELECT worn_count, wash_count FROM clothing WHERE id <= 2 ORDER BY id'), [[1,1],[1,1]]);
  } finally { raw.close(); }
});
test('bad, duplicated or inactive item IDs are rejected before any writes', async () => {
  const { raw, db } = await fixture();
  try {
    assert.equal(replaceOutfit(db, { date, items: [1,1] }).error, 'invalid_items');
    assert.equal(replaceOutfit(db, { date, items: [3] }).error, 'invalid_items');
    assert.equal(replaceOutfit(db, { date: 'invalid', items: [1] }).error, 'invalid_date');
    assert.deepEqual(rows(raw, 'SELECT count(*) FROM outfits'), [[0]]);
  } finally { raw.close(); }
});
test('replacing an outfit repeatedly does not inflate counters', async () => {
  const { raw, db } = await fixture();
  try {
    replaceOutfit(db, { date, items: [1,2] });
    replaceOutfit(db, { date, items: [2] });
    replaceOutfit(db, { date, items: [2] });
    assert.deepEqual(rows(raw, 'SELECT worn_count FROM clothing WHERE id <= 2 ORDER BY id'), [[0],[1]]);
    assert.deepEqual(rows(raw, 'SELECT clothing_id FROM outfit_items'), [[2]]);
  } finally { raw.close(); }
});
test('failed replacement rolls back links and counters', async () => {
  const { raw, db } = await fixture();
  try {
    replaceOutfit(db, { date, items: [1,2] });
    const prepare = db.prepare;
    db.prepare = sql => sql.startsWith('INSERT INTO outfit_items')
      ? { run() { throw new Error('simulated insert failure'); } }
      : prepare.call(db, sql);
    assert.throws(() => replaceOutfit(db, { date, items: [2] }), /simulated insert failure/);
    assert.deepEqual(rows(raw, 'SELECT worn_count FROM clothing WHERE id <= 2 ORDER BY id'), [[1],[1]]);
    assert.deepEqual(rows(raw, 'SELECT clothing_id FROM outfit_items ORDER BY clothing_id'), [[1],[2]]);
  } finally { raw.close(); }
});
test('deleting an outfit removes links and reverts counters', async () => {
  const { raw, db } = await fixture();
  try {
    const out = replaceOutfit(db, { date, items: [1,2] });
    assert.equal(removeOutfit(db, out.data.id).success, true);
    assert.deepEqual(rows(raw, 'SELECT count(*) FROM outfit_items'), [[0]]);
    assert.deepEqual(rows(raw, 'SELECT count(*) FROM outfits'), [[0]]);
    assert.deepEqual(rows(raw, 'SELECT worn_count FROM clothing WHERE id <= 2 ORDER BY id'), [[0],[0]]);
  } finally { raw.close(); }
});
test('failed deletion rolls back all data', async () => {
  const { raw, db } = await fixture();
  try {
    const out = replaceOutfit(db, { date, items: [1] });
    const prepare = db.prepare;
    db.prepare = sql => sql.startsWith('DELETE FROM outfits')
      ? { run() { throw new Error('simulated delete failure'); } }
      : prepare.call(db, sql);
    assert.throws(() => removeOutfit(db, out.data.id), /simulated delete failure/);
    assert.deepEqual(rows(raw, 'SELECT count(*) FROM outfit_items'), [[1]]);
    assert.deepEqual(rows(raw, 'SELECT count(*) FROM outfits'), [[1]]);
    assert.deepEqual(rows(raw, 'SELECT worn_count FROM clothing WHERE id = 1'), [[1]]);
  } finally { raw.close(); }
});
