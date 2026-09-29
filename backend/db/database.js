const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'wardrobe.db');
let db = null;
let saveTimer = null;
function save() {
  if (!db) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function() {
    try { fs.writeFileSync(dbPath, Buffer.from(db.export())); } catch(e) { console.error('[DB] save fail:', e.message); }
  }, 300);
}
function saveNow() { if (!db) return; try { fs.writeFileSync(dbPath, Buffer.from(db.export())); } catch(e) {} }
async function initDatabase() {
  const SQL = await initSqlJs();
  db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run('CREATE TABLE IF NOT EXISTS clothing (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT DEFAULT "上衣", season TEXT DEFAULT "四季", color TEXT DEFAULT "", price REAL DEFAULT 0, brand TEXT DEFAULT "", material TEXT DEFAULT "", purchase_date TEXT DEFAULT "", note TEXT DEFAULT "", image_path TEXT DEFAULT "", worn_count INTEGER DEFAULT 0, status TEXT DEFAULT "active", created_at TEXT DEFAULT (datetime("now","localtime")), updated_at TEXT DEFAULT (datetime("now","localtime")))');
  db.run('CREATE TABLE IF NOT EXISTS outfits (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL, note TEXT DEFAULT "", weather TEXT DEFAULT "", created_at TEXT DEFAULT (datetime("now","localtime")), UNIQUE(date))');
  db.run('CREATE TABLE IF NOT EXISTS outfit_items (id INTEGER PRIMARY KEY AUTOINCREMENT, outfit_id INTEGER NOT NULL, clothing_id INTEGER NOT NULL, UNIQUE(outfit_id, clothing_id))');
  db.run('CREATE INDEX IF NOT EXISTS idx_clothing_category ON clothing(category)');
  db.run('CREATE INDEX IF NOT EXISTS idx_outfits_date ON outfits(date)');
  saveNow();
  console.log('[DB] init done');
  return db;
}
const wrapper = {
  prepare: function(sql) {
    return {
      all: function() {
        var params = Array.prototype.slice.call(arguments);
        var stmt = db.prepare(sql); stmt.bind(params);
        var rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free(); return rows;
      },
      get: function() { var rows = this.all.apply(this, arguments); return rows.length > 0 ? rows[0] : undefined; },
      run: function() {
        var params = Array.prototype.slice.call(arguments);
        db.run(sql, params); save();
        return { changes: db.getRowsModified(), lastInsertRowid: db.exec('SELECT last_insert_rowid() as id')[0].values[0][0] };
      }
    };
  },
  exec: function(sql) { db.exec(sql); save(); },
  pragma: function() {}, saveNow: saveNow,
  close: function() { saveNow(); db.close(); }
};
module.exports = { initDatabase: initDatabase, db: wrapper };