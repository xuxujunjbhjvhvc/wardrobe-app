const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating } = require('../utils/helpers');

// 获取所有衣物（支持筛选、搜索、标签）
router.get('/', (req, res) => {
  const { category, season, search, sort, tag } = req.query;
  let sql = 'SELECT * FROM clothing WHERE status = "active"';
  const params = [];

  if (category && category !== '全部') { sql += ' AND category = ?'; params.push(category); }
  if (season && season !== '全部') { sql += ' AND (season = ? OR season = "四季")'; params.push(season); }
  if (search) { sql += ' AND (name LIKE ? OR color LIKE ? OR brand LIKE ? OR tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }

  if (sort === 'worn') sql += ' ORDER BY worn_count DESC';
  else if (sort === 'price') sql += ' ORDER BY price DESC';
  else if (sort === 'recent') sql += ' ORDER BY created_at DESC';
  else sql += ' ORDER BY created_at DESC';

  const items = db.prepare(sql).all(...params);
  const enriched = items.map(item => ({
    ...item,
    cost_per_wear: calcCostPerWear(item.price, item.worn_count),
    value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count))
  }));
  res.json({ success: true, data: enriched });
});

// 获取单件衣物详情
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '衣物不存在' });

  const history = db.prepare(`
    SELECT o.date, o.note FROM outfits o
    JOIN outfit_items oi ON o.id = oi.outfit_id
    WHERE oi.clothing_id = ? ORDER BY o.date DESC
  `).all(req.params.id);

  res.json({
    success: true,
    data: {
      ...item,
      cost_per_wear: calcCostPerWear(item.price, item.worn_count),
      value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)),
      wear_history: history
    }
  });
});

// 添加衣物
router.post('/', (req, res) => {
  const { name, category, season, color, price, brand, material, purchase_date, note, image_path, tags } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: '名称不能为空' });

  const stmt = db.prepare(`
    INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name.trim(), category || '上衣', season || '四季', color || '',
    price || 0, brand || '', material || '', purchase_date || '', note || '', image_path || '',
    tags || ''
  );
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: item });
});

// 更新衣物
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '衣物不存在' });

  const { name, category, season, color, price, brand, material, purchase_date, note, image_path, tags } = req.body;
  db.prepare(`
    UPDATE clothing SET name=?, category=?, season=?, color=?, price=?, brand=?, material=?,
    purchase_date=?, note=?, image_path=?, tags=?, updated_at=datetime('now','localtime') WHERE id=?
  `).run(
    name || existing.name, category || existing.category, season || existing.season,
    color ?? existing.color, price ?? existing.price, brand ?? existing.brand,
    material ?? existing.material, purchase_date ?? existing.purchase_date,
    note ?? existing.note, image_path ?? existing.image_path,
    tags != null ? tags : existing.tags, req.params.id
  );
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: item });
});

// 删除衣物（软删除）
router.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE clothing SET status = "deleted" WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: '衣物不存在' });
  res.json({ success: true, message: '已删除' });
});

// 记录穿着（+1次）
router.post('/:id/wear', (req, res) => {
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '衣物不存在' });
  db.prepare('UPDATE clothing SET worn_count = worn_count + 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 获取所有标签（去重+计数）
router.get('/tags/all', (req, res) => {
  const items = db.prepare("SELECT tags FROM clothing WHERE status='active' AND tags != '' AND tags IS NOT NULL").all();
  const tagMap = {};
  items.forEach(function(item) {
    if (!item.tags) return;
    item.tags.split(',').forEach(function(t) {
      t = t.trim();
      if (t) tagMap[t] = (tagMap[t] || 0) + 1;
    });
  });
  const tags = Object.keys(tagMap).map(function(name) {
    return { name: name, count: tagMap[name] };
  }).sort(function(a, b) { return b.count - a.count; });
  res.json({ success: true, data: tags });
});

module.exports = router;
