const test = require('node:test');
const assert = require('node:assert/strict');
const initSqlJs = require('sql.js');
const { importBackup } = require('../utils/importBackup');

async function fixture() {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  raw.exec(`
    CREATE TABLE clothing (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT,category TEXT,season TEXT,color TEXT,price REAL,brand TEXT,material TEXT,purchase_date TEXT,note TEXT,image_path TEXT,tags TEXT,worn_count INTEGER,wash_count INTEGER,wash_threshold INTEGER,last_wash_date TEXT,status TEXT DEFAULT 'active');
    CREATE TABLE outfits (id INTEGER PRIMARY KEY AUTOINCREMENT,date TEXT UNIQUE,note TEXT,weather TEXT);
    CREATE TABLE outfit_items (outfit_id INTEGER,clothing_id INTEGER,UNIQUE(outfit_id,clothing_id));
    CREATE TABLE saved_outfits (id INTEGER PRIMARY KEY,name TEXT);
    CREATE TABLE saved_outfit_items (saved_outfit_id INTEGER,clothing_id INTEGER);
    INSERT INTO clothing (id,name,category) VALUES (9,'existing','上衣');
    INSERT INTO saved_outfits VALUES (1,'old');
    INSERT INTO saved_outfit_items VALUES (1,9);
  `);
  const db = {
    prepare(sql) {
      return {
        get(...args) {
          const st=raw.prepare(sql);
          try { st.bind(args);return st.step()?st.getAsObject():undefined; } finally { st.free(); }
        },
        run(...args) {
          raw.run(sql,args);
          return { lastInsertRowid: raw.exec('SELECT last_insert_rowid()')[0].values[0][0] };
        }
      };
    },
    exec(sql) { raw.exec(sql); }
  };
  return { raw, db };
}
const rows=(raw,sql)=>raw.exec(sql)[0]?.values||[];
const item=(id,name)=>({ id,name,category:'上衣' });

test('merge maps source IDs rather than colliding existing destination IDs', async () => {
  const { raw, db }=await fixture();
  try {
    const result=importBackup(db,{wardrobe:[item(9,'new')],outfits:[{date:'2026-11-24',items:[{id:9}]}]});
    assert.equal(result.importedClothing,1);
    const linked=rows(raw,"SELECT c.name FROM outfit_items oi JOIN clothing c ON c.id=oi.clothing_id");
    assert.deepEqual(linked,[['new']]);
  } finally { raw.close(); }
});
test('replace removes stale favorites and maps links to newly inserted rows', async () => {
  const { raw, db }=await fixture();
  try {
    const result=importBackup(db,{wardrobe:[item(3,'restored')],outfits:[{date:'2026-11-24',items:[{id:3}]}],mode:'replace'});
    assert.equal(result.importedClothing,1);
    assert.deepEqual(rows(raw,'SELECT count(*) FROM saved_outfits'),[[0]]);
    assert.deepEqual(rows(raw,'SELECT count(*) FROM saved_outfit_items'),[[0]]);
    assert.deepEqual(rows(raw,"SELECT c.name FROM outfit_items oi JOIN clothing c ON c.id=oi.clothing_id"),[['restored']]);
  } finally { raw.close(); }
});
test('unknown and repeated clothing references reject before destructive replace', async () => {
  const { raw, db }=await fixture();
  try {
    for (const ids of [[9,9],[100]]) {
      const output=importBackup(db,{wardrobe:[item(9,'new')],outfits:[{date:'2026-11-24',items:ids.map(id=>({id}))}],mode:'replace'});
      assert.ok(output.error);
    }
    assert.deepEqual(rows(raw,'SELECT id,name FROM clothing'),[[9,'existing']]);
    assert.deepEqual(rows(raw,'SELECT count(*) FROM saved_outfits'),[[1]]);
  } finally { raw.close(); }
});
test('duplicate source IDs and dates reject without modification', async () => {
  const { raw, db }=await fixture();
  try {
    assert.ok(importBackup(db,{wardrobe:[item(1,'a'),item(1,'b')],mode:'replace'}).error);
    assert.ok(importBackup(db,{wardrobe:[item(1,'a')],outfits:[{date:'2026-11-24',items:[]},{date:'2026-11-24',items:[]}],mode:'replace'}).error);
    assert.deepEqual(rows(raw,'SELECT count(*) FROM clothing'),[[1]]);
  } finally { raw.close(); }
});
test('database failure rolls back destructive replacement and all linked records', async () => {
  const { raw, db }=await fixture();
  try {
    const original=db.prepare;
    db.prepare=sql=>sql.includes('INSERT INTO clothing')?{run(){throw new Error('simulated failure');}}:original.call(db,sql);
    assert.throws(()=>importBackup(db,{wardrobe:[item(1,'new')],outfits:[],mode:'replace'}),/simulated failure/);
    assert.deepEqual(rows(raw,'SELECT id,name FROM clothing'),[[9,'existing']]);
    assert.deepEqual(rows(raw,'SELECT count(*) FROM saved_outfit_items'),[[1]]);
  } finally { raw.close(); }
});
