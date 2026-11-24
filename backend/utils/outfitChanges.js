function transaction(db, action) {
  let active = false;
  try {
    db.exec('BEGIN');
    active = true;
    const result = action();
    db.exec('COMMIT');
    active = false;
    return result;
  } catch (error) {
    if (active) {
      try { db.exec('ROLLBACK'); }
      catch (rollbackError) { console.error('[Outfit] rollback failed:', rollbackError); }
    }
    throw error;
  }
}

function validateItems(db, items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const ids = items.map(id => Number(id));
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) return null;
  if (new Set(ids).size !== ids.length) return null;
  const placeholders = ids.map(() => '?').join(',');
  const valid = db.prepare("SELECT id FROM clothing WHERE status = 'active' AND id IN (" + placeholders + ")").all(...ids);
  return valid.length === ids.length ? ids : null;
}

function replaceOutfit(db, { date, items, note = '', weather = '' }) {
  const ids = validateItems(db, items);
  if (!ids) return { error: 'invalid_items' };
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(new Date(date + 'T00:00:00').getTime())) {
    return { error: 'invalid_date' };
  }
  return transaction(db, () => {
    const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(date);
    let outfitId;
    if (existing) {
      outfitId = existing.id;
      const old = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(outfitId);
      for (const item of old) {
        db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1), wash_count = MAX(0, wash_count - 1) WHERE id = ?').run(item.clothing_id);
      }
      db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(outfitId);
      db.prepare("UPDATE outfits SET note=?, weather=?, created_at=datetime('now','localtime') WHERE id=?")
        .run(note || '', weather || '', outfitId);
    } else {
      outfitId = db.prepare('INSERT INTO outfits (date, note, weather) VALUES (?, ?, ?)')
        .run(date, note || '', weather || '').lastInsertRowid;
    }
    for (const id of ids) {
      db.prepare('INSERT INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)').run(outfitId, id);
      db.prepare('UPDATE clothing SET worn_count = worn_count + 1, wash_count = wash_count + 1 WHERE id = ?').run(id);
    }
    const saved = db.prepare('SELECT * FROM outfits WHERE id = ?').get(outfitId);
    const linked = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(outfitId);
    return { data: { ...saved, items: linked } };
  });
}

function removeOutfit(db, id) {
  const existing = db.prepare('SELECT id FROM outfits WHERE id = ?').get(id);
  if (!existing) return { error: 'not_found' };
  return transaction(db, () => {
    const linked = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(existing.id);
    for (const item of linked) {
      db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1), wash_count = MAX(0, wash_count - 1) WHERE id = ?').run(item.clothing_id);
    }
    db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(existing.id);
    db.prepare('DELETE FROM outfits WHERE id = ?').run(existing.id);
    return { success: true };
  });
}
module.exports = { replaceOutfit, removeOutfit };
