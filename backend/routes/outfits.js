const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { today } = require('../utils/helpers');

router.get('/', (req, res) => {
  const { month } = req.query;
  let sql = 'SELECT * FROM outfits';
  const params = [];
  if (month) { sql += ' WHERE date LIKE ?'; params.push(`${month}%`); }
  sql += ' ORDER BY date DESC';
  const outfits = db.prepare(sql).all(...params);
  const result = outfits.map(o => {
    const items = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(o.id);
    return { ...o, items };
  });
  res.json({ success: true, data: result });
});

router.get('/date/:date', (req, res) => {
  const outfit = db.prepare('SELECT * FROM outfits WHERE date = ?').get(req.params.date);
  if (!outfit) return res.json({ success: true, data: null });
  const items = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(outfit.id);
  res.json({ success: true, data: { ...outfit, items } });
});

router.post('/', (req, res) => {
  const { date, items, note, weather } = req.body;
  const outfitDate = date || today();
  if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: '请至少选择一件衣服' });
  const placeholders = items.map(() => '?').join(',');
  const validItems = db.prepare(`SELECT id FROM clothing WHERE id IN (${placeholders}) AND status = 'active'`).all(...items);
  if (validItems.length !== items.length) return res.status(400).json({ success: false, error: '部分衣物不存在或已删除' });
  const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(outfitDate);
  let outfitId;
  if (existing) {
    outfitId = existing.id;
    db.prepare("UPDATE outfits SET note=?, weather=?, created_at=datetime('now','localtime') WHERE id=?").run(note || '', weather || '', outfitId);
    const oldItems = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(outfitId);
    oldItems.forEach(oi => { db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1), wash_count = MAX(0, wash_count - 1) WHERE id = ?').run(oi.clothing_id); });
    db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(outfitId);
  } else {
    const result = db.prepare('INSERT INTO outfits (date, note, weather) VALUES (?, ?, ?)').run(outfitDate, note || '', weather || '');
    outfitId = result.lastInsertRowid;
  }
  items.forEach(id => {
    db.prepare('INSERT INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)').run(outfitId, id);
    db.prepare('UPDATE clothing SET worn_count = worn_count + 1, wash_count = wash_count + 1 WHERE id = ?').run(id);
  });
  const outfit = db.prepare('SELECT * FROM outfits WHERE id = ?').get(outfitId);
  const outfitItems = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(outfitId);
  res.status(201).json({ success: true, data: { ...outfit, items: outfitItems } });
});

router.delete('/:id', (req, res) => {
  const outfit = db.prepare('SELECT * FROM outfits WHERE id = ?').get(req.params.id);
  if (!outfit) return res.status(404).json({ success: false, error: '穿搭记录不存在' });
  const items = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(req.params.id);
  items.forEach(oi => { db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1), wash_count = MAX(0, wash_count - 1) WHERE id = ?').run(oi.clothing_id); });
  db.prepare('DELETE FROM outfits WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除' });
});

module.exports = router;
