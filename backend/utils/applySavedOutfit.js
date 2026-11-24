// Keep a day's outfit links and wear/wash counters consistent.
// All writes are synchronous within a single sql.js transaction.
function applySavedOutfit(db, savedId, date) {
  const saved = db.prepare('SELECT id, note FROM saved_outfits WHERE id = ?').get(savedId);
  if (!saved) return { error: 'not_found' };

  const linked = db.prepare('SELECT clothing_id FROM saved_outfit_items WHERE saved_outfit_id = ?').all(saved.id);
  const clothingIds = [...new Set(linked.map(row => Number(row.clothing_id)))];
  if (!clothingIds.length || clothingIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    return { error: 'empty' };
  }

  const placeholders = clothingIds.map(() => '?').join(',');
  const active = db.prepare(`SELECT id FROM clothing WHERE status = 'active' AND id IN (${placeholders})`).all(...clothingIds);
  if (active.length !== clothingIds.length) return { error: 'invalid_clothing' };

  let started = false;
  try {
    db.exec('BEGIN');
    started = true;
    const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(date);
    let outfitId;

    if (existing) {
      outfitId = existing.id;
      const old = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(outfitId);
      for (const item of old) {
        db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1), wash_count = MAX(0, wash_count - 1) WHERE id = ?').run(item.clothing_id);
      }
      db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(outfitId);
      db.prepare('UPDATE outfits SET note = ? WHERE id = ?').run(saved.note || '', outfitId);
    } else {
      outfitId = db.prepare('INSERT INTO outfits (date, note) VALUES (?, ?)').run(date, saved.note || '').lastInsertRowid;
    }

    for (const id of clothingIds) {
      db.prepare('INSERT INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)').run(outfitId, id);
      db.prepare('UPDATE clothing SET worn_count = worn_count + 1, wash_count = wash_count + 1 WHERE id = ?').run(id);
    }
    db.exec('COMMIT');
    started = false;
    return { date, outfit_id: outfitId, items: clothingIds.length };
  } catch (error) {
    if (started) {
      try { db.exec('ROLLBACK'); }
      catch (rollbackError) { console.error('[Saved outfit] rollback failed:', rollbackError); }
    }
    throw error;
  }
}

module.exports = { applySavedOutfit };
