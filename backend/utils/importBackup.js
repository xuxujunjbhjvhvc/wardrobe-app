// Keep imported outfit references tied to the source backup, never to a
// coincidentally matching ID already present in the destination database.
const isId = value => Number.isSafeInteger(value) && value > 0;
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function validateBackup(input) {
  if (!isObject(input)) return '导入数据必须是对象';
  const { wardrobe = [], outfits = [], mode = 'merge' } = input;
  if (!Array.isArray(wardrobe) || !Array.isArray(outfits)) return 'wardrobe 和 outfits 必须都是数组';
  if (mode !== 'merge' && mode !== 'replace') return '导入模式必须是 merge 或 replace';
  const ids = new Set();
  for (const item of wardrobe) {
    if (!isObject(item) || !isId(item.id) || typeof item.name !== 'string' || !item.name.trim() || ids.has(item.id))
      return '衣物缺少有效编号、名称或编号重复';
    ids.add(item.id);
  }
  const dates = new Set();
  for (const outfit of outfits) {
    if (!isObject(outfit) || !isDate(outfit.date) || dates.has(outfit.date) || !Array.isArray(outfit.items))
      return '穿搭日期或 items 格式错误，或同一日期重复';
    dates.add(outfit.date);
    const linked = new Set();
    for (const item of outfit.items) {
      if (!isObject(item) || !isId(item.id) || !ids.has(item.id) || linked.has(item.id))
        return '穿搭引用了备份中不存在的衣物或重复的衣物编号';
      linked.add(item.id);
    }
  }
  return null;
}

function importBackup(db, input) {
  const problem = validateBackup(input);
  if (problem) return { error: problem };
  const { wardrobe = [], outfits = [], mode = 'merge' } = input;
  // Existing backups contain clothing and outfits, but not saved favorites.
  // Do not silently destroy favorites whose clothing IDs would be replaced.
  if (mode === 'replace') {
    const favorites = db.prepare('SELECT count(*) AS count FROM saved_outfits').get();
    const favoriteLinks = db.prepare('SELECT count(*) AS count FROM saved_outfit_items').get();
    if (Number(favorites?.count || 0) > 0 || Number(favoriteLinks?.count || 0) > 0) {
      return { error: '覆盖导入已取消：现有收藏搭配不在备份内，请先备份并处理收藏搭配，或使用合并导入' };
    }
  }
  const idMap = new Map();
  let started = false;
  try {
    db.exec('BEGIN');
    started = true;
    if (mode === 'replace') {
      db.prepare('DELETE FROM outfit_items').run();
      db.prepare('DELETE FROM outfits').run();
      db.prepare('DELETE FROM clothing').run();
    }
    let importedClothing = 0, importedOutfits = 0, skipped = 0;
    for (const item of wardrobe) {
      if (mode === 'merge') {
        const old = db.prepare("SELECT id FROM clothing WHERE name = ? AND category = ? AND status = 'active'").get(item.name, item.category || '上衣');
        if (old) { idMap.set(item.id, old.id); skipped++; continue; }
      }
      const inserted = db.prepare(`INSERT INTO clothing
        (name,category,season,color,price,brand,material,purchase_date,note,image_path,tags,worn_count,wash_count,wash_threshold,last_wash_date)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        item.name, item.category || '上衣', item.season || '四季', item.color || '',
        item.price ?? 0, item.brand || '', item.material || '', item.purchase_date || '',
        item.note || '', item.image_path || '', item.tags || '',
        item.worn_count ?? 0, item.wash_count ?? 0, item.wash_threshold ?? 3, item.last_wash_date || ''
      );
      idMap.set(item.id, inserted.lastInsertRowid);
      importedClothing++;
    }
    for (const outfit of outfits) {
      if (mode === 'merge' && db.prepare('SELECT id FROM outfits WHERE date = ?').get(outfit.date)) {
        skipped++;
        continue;
      }
      const inserted = db.prepare('INSERT INTO outfits (date,note,weather) VALUES (?,?,?)')
        .run(outfit.date, outfit.note || '', outfit.weather || '');
      for (const item of outfit.items) {
        const mappedId = idMap.get(item.id);
        if (!isId(mappedId)) throw new Error('Missing mapped clothing ID during import');
        db.prepare('INSERT INTO outfit_items (outfit_id, clothing_id) VALUES (?,?)')
          .run(inserted.lastInsertRowid, mappedId);
      }
      importedOutfits++;
    }
    db.exec('COMMIT');
    started = false;
    return { importedClothing, importedOutfits, skipped, mode };
  } catch (err) {
    if (started) {
      try { db.exec('ROLLBACK'); }
      catch (rollbackError) { console.error('[Import] rollback failed:', rollbackError); }
    }
    throw err;
  }
}

module.exports = { validateBackup, importBackup };
