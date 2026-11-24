const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { applySavedOutfit } = require('../utils/applySavedOutfit');

async function createFixture() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  sqlite.exec(`
    CREATE TABLE clothing(id INTEGER PRIMARY KEY, status TEXT, worn_count INTEGER, wash_count INTEGER);
    CREATE TABLE outfits(id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT UNIQUE, note TEXT DEFAULT '');
    CREATE TABLE outfit_items(outfit_id INTEGER, clothing_id INTEGER, UNIQUE(outfit_id, clothing_id));
    CREATE TABLE saved_outfits(id INTEGER PRIMARY KEY, note TEXT);
    CREATE TABLE saved_outfit_items(saved_outfit_id INTEGER, clothing_id INTEGER);
    INSERT INTO clothing VALUES (1,'active',0,0),(2,'active',0,0),(3,'idle',0,0);
    INSERT INTO saved_outfits VALUES (10,'喜欢的搭配'),(11,'另一套');
    INSERT INTO saved_outfit_items VALUES (10,1),(10,2),(11,2);
  `);
  const db = {
    prepare(sql) {
      return {
        all(...args) {
          const stmt = sqlite.prepare(sql);
          try {
            stmt.bind(args);
            const rows = [];
            while (stmt.step()) rows.push(stmt.getAsObject());
            return rows;
          } finally { stmt.free(); }
        },
        get(...args) {
          const stmt = sqlite.prepare(sql);
          try {
            stmt.bind(args);
            return stmt.step() ? stmt.getAsObject() : undefined;
          } finally { stmt.free(); }
        },
        run(...args) {
          sqlite.run(sql, args);
          return { lastInsertRowid: sqlite.exec('SELECT last_insert_rowid()')[0].values[0][0] };
        }
      };
    },
    exec(sql) { sqlite.exec(sql); }
  };
  return { sqlite, db };
}
const rows = (raw, sql) => raw.exec(sql)[0]?.values || [];

test('reapplying the same saved outfit is idempotent for wear counters', async () => {
  const { sqlite, db } = await createFixture();
  try {
    applySavedOutfit(db, 10, '2026-11-24');
    applySavedOutfit(db, 10, '2026-11-24');
    assert.deepEqual(rows(sqlite, 'SELECT worn_count, wash_count FROM clothing WHERE id <= 2 ORDER BY id'), [[1,1],[1,1]]);
    assert.equal(rows(sqlite, 'SELECT count(*) FROM outfit_items')[0][0], 2);
  } finally { sqlite.close(); }
});
test('replacing today outfit reverts old counters before applying new ones', async () => {
  const { sqlite, db } = await createFixture();
  try {
    applySavedOutfit(db, 10, '2026-11-24');
    applySavedOutfit(db, 11, '2026-11-24');
    assert.deepEqual(rows(sqlite, 'SELECT worn_count, wash_count FROM clothing WHERE id <= 2 ORDER BY id'), [[0,0],[1,1]]);
    assert.deepEqual(rows(sqlite, 'SELECT clothing_id FROM outfit_items'), [[2]]);
  } finally { sqlite.close(); }
});
test('a failed insert rolls back counters and existing outfit links', async () => {
  const { sqlite, db } = await createFixture();
  try {
    applySavedOutfit(db, 10, '2026-11-24');
    const originalPrepare = db.prepare;
    db.prepare = sql => {
      if (sql.startsWith('INSERT INTO outfit_items')) {
        return { run() { throw new Error('simulated failure'); } };
      }
      return originalPrepare.call(db, sql);
    };
    assert.throws(() => applySavedOutfit(db, 11, '2026-11-24'), /simulated failure/);
    assert.deepEqual(rows(sqlite, 'SELECT worn_count FROM clothing WHERE id <= 2 ORDER BY id'), [[1],[1]]);
    assert.deepEqual(rows(sqlite, 'SELECT clothing_id FROM outfit_items ORDER BY clothing_id'), [[1],[2]]);
  } finally { sqlite.close(); }
});
test('invalid saved clothing is rejected before modifying existing data', async () => {
  const { sqlite, db } = await createFixture();
  try {
    sqlite.exec('INSERT INTO saved_outfit_items VALUES (11,3)');
    assert.equal(applySavedOutfit(db, 11, '2026-11-24').error, 'invalid_clothing');
    assert.deepEqual(rows(sqlite, 'SELECT count(*) FROM outfits'), [[0]]);
  } finally { sqlite.close(); }
});
