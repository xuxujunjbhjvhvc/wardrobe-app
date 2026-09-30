const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating } = require('../utils/helpers');

// 获取所有收藏搭配
router.get('/', (req, res) => {
  const outfits = db.prepare('SELECT * FROM saved_outfits ORDER BY created_at DESC').all();
  const enriched = outfits.map(outfit => {
    const items = db.prepare(`
      SELECT c.* FROM clothing c
      JOIN saved_outfit_items soi ON c.id = soi.clothing_id
      WHERE soi.saved_outfit_id = ?
    `).all(outfit.id);
    const enrichedItems = items.map(item => ({
      ...item,
      cost_per_wear: calcCostPerWear(item.price, item.worn_count),
      value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count))
    }));
    const totalValue = items.reduce((sum, i) => sum + (i.price || 0), 0);
    return { ...outfit, items: enrichedItems, item_count: items.length, total_value: totalValue };
  });
  res.json({ success: true, data: enriched });
});

// 获取单个收藏搭配详情
router.get('/:id', (req, res) => {
  const outfit = db.prepare('SELECT * FROM saved_outfits WHERE id = ?').get(req.params.id);
  if (!outfit) return res.status(404).json({ success: false, error: '收藏搭配不存在' });

  const items = db.prepare(`
    SELECT c.* FROM clothing c
    JOIN saved_outfit_items soi ON c.id = soi.clothing_id
    WHERE soi.saved_outfit_id = ?
  `).all(outfit.id);
  const enrichedItems = items.map(item => ({
    ...item,
    cost_per_wear: calcCostPerWear(item.price, item.worn_count),
    value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count))
  }));

  res.json({ success: true, data: { ...outfit, items: enrichedItems, item_count: items.length } });
});

// 创建收藏搭配
router.post('/', (req, res) => {
  const { name, note, occasion, clothing_ids } = req.body;
  if (!Array.isArray(clothing_ids) || clothing_ids.length === 0) {
    return res.status(400).json({ success: false, error: '请至少选择一件衣服' });
  }

  const result = db.prepare(`
    INSERT INTO saved_outfits (name, note, occasion) VALUES (?, ?, ?)
  `).run(name || '我的搭配', note || '', occasion || '');

  const outfitId = result.lastInsertRowid;
  const insertStmt = db.prepare('INSERT OR IGNORE INTO saved_outfit_items (saved_outfit_id, clothing_id) VALUES (?, ?)');
  clothing_ids.forEach(id => insertStmt.run(outfitId, id));

  const outfit = db.prepare('SELECT * FROM saved_outfits WHERE id = ?').get(outfitId);
  res.status(201).json({ success: true, data: outfit, message: '搭配已收藏' });
});

// 更新收藏搭配
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM saved_outfits WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '收藏搭配不存在' });

  const { name, note, occasion, clothing_ids } = req.body;
  db.prepare(`
    UPDATE saved_outfits SET name=?, note=?, occasion=? WHERE id=?
  `).run(name || existing.name, note ?? existing.note, occasion ?? existing.occasion, req.params.id);

  if (Array.isArray(clothing_ids)) {
    db.prepare('DELETE FROM saved_outfit_items WHERE saved_outfit_id = ?').run(req.params.id);
    const insertStmt = db.prepare('INSERT OR IGNORE INTO saved_outfit_items (saved_outfit_id, clothing_id) VALUES (?, ?)');
    clothing_ids.forEach(id => insertStmt.run(req.params.id, id));
  }

  const outfit = db.prepare('SELECT * FROM saved_outfits WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: outfit, message: '已更新' });
});

// 删除收藏搭配
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM saved_outfits WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: '收藏搭配不存在' });
  db.prepare('DELETE FROM saved_outfit_items WHERE saved_outfit_id = ?').run(req.params.id);
  res.json({ success: true, message: '已删除收藏' });
});

// 将收藏搭配应用为今日穿搭
router.post('/:id/apply', (req, res) => {
  const outfit = db.prepare('SELECT * FROM saved_outfits WHERE id = ?').get(req.params.id);
  if (!outfit) return res.status(404).json({ success: false, error: '收藏搭配不存在' });

  const items = db.prepare('SELECT clothing_id FROM saved_outfit_items WHERE saved_outfit_id = ?').all(outfit.id);
  const clothingIds = items.map(i => i.clothing_id);

  const today = new Date().toISOString().slice(0, 10);
  const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(today);

  let outfitId;
  if (existing) {
    outfitId = existing.id;
    db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(outfitId);
  } else {
    const result = db.prepare('INSERT INTO outfits (date, note) VALUES (?, ?)').run(today, outfit.note || '');
    outfitId = result.lastInsertRowid;
  }

  const insertStmt = db.prepare('INSERT OR IGNORE INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)');
  clothingIds.forEach(id => insertStmt.run(outfitId, id));

  // 累加穿着次数和洗衣计数
  clothingIds.forEach(id => {
    db.prepare('UPDATE clothing SET worn_count = worn_count + 1, wash_count = wash_count + 1 WHERE id = ?').run(id);
  });

  res.json({ success: true, message: '已应用为今日穿搭', data: { date: today, outfit_id: outfitId, items: clothingIds.length } });
});

module.exports = router;
