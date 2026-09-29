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
  saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.error('[DB] 保存失败:', err.message);
    }
  }, 300);
}

function saveNow() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error('[DB] 立即保存失败:', err.message);
  }
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('[DB] 已从文件加载数据库');
  } else {
    db = new SQL.Database();
    console.log('[DB] 已创建新数据库');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS clothing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '上衣',
      season TEXT NOT NULL DEFAULT '四季',
      color TEXT DEFAULT '',
      price REAL DEFAULT 0,
      brand TEXT DEFAULT '',
      material TEXT DEFAULT '',
      purchase_date TEXT DEFAULT '',
      note TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      worn_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      weather TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(date)
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS outfit_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      outfit_id INTEGER NOT NULL,
      clothing_id INTEGER NOT NULL,
      UNIQUE(outfit_id, clothing_id)
    );
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_clothing_category ON clothing(category);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_clothing_season ON clothing(season);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_outfits_date ON outfits(date);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_outfit_items_clothing ON outfit_items(clothing_id);`);

  // v1.0.1 迁移：添加 tags 字段（兼容旧数据库）
  try {
    var colResult = db.exec("PRAGMA table_info(clothing)");
    if (colResult.length > 0) {
      var hasTags = colResult[0].values.some(function(c) { return c[1] === 'tags'; });
      if (!hasTags) {
        db.run("ALTER TABLE clothing ADD COLUMN tags TEXT DEFAULT ''");
        console.log('[DB] v1.0.1 迁移：添加 tags 字段');
      }
    }
  } catch (e) { console.log('[DB] 迁移检查跳过'); }

  saveNow();
  console.log('[DB] 初始化完成');
  return db;
}

const wrapper = {
  prepare(sql) {
    return {
      all(...params) {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
      get(...params) {
        const rows = this.all(...params);
        return rows.length > 0 ? rows[0] : undefined;
      },
      run(...params) {
        db.run(sql, params);
        save();
        const changes = db.getRowsModified();
        const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
        return { changes, lastInsertRowid: lastId };
      }
    };
  },
  exec(sql) { db.exec(sql); save(); },
  pragma() {},
  export() { return db.export(); },
  saveNow,
  close() { saveNow(); db.close(); }
};

module.exports = { initDatabase, db: wrapper };
