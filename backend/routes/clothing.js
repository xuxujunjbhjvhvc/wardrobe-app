const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating, calcDepreciation } = require('../utils/helpers');

// 获取所有衣物（支持筛选、搜索、标签）
router.get('/', (req, res) => {
  const { category, season, search, sort, tag, needsWash, occasion, itemStatus } = req.query;
  let sql = 'SELECT * FROM clothing WHERE status = "active"';
  const params = [];

  if (category && category !== '全部') { sql += ' AND category = ?'; params.push(category); }
  if (season && season !== '全部') { sql += ' AND (season = ? OR season = "四季")'; params.push(season); }
  if (search) { sql += ' AND (name LIKE ? OR color LIKE ? OR brand LIKE ? OR tags LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (tag) { sql += ' AND tags LIKE ?'; params.push(`%${tag}%`); }
  if (needsWash === 'true') { sql += ' AND wash_count >= wash_threshold AND wash_threshold > 0'; }
  if (occasion && occasion !== '全部') { sql += ' AND occasion = ?'; params.push(occasion); }
  if (itemStatus && itemStatus !== 'all' && itemStatus !== 'active') { sql = sql.replace('WHERE status = "active"', 'WHERE status = ?'); params.unshift(itemStatus); }

  if (sort === 'worn') sql += ' ORDER BY worn_count DESC';
  else if (sort === 'price') sql += ' ORDER BY price DESC';
  else if (sort === 'recent') sql += ' ORDER BY created_at DESC';
  else sql += ' ORDER BY created_at DESC';

  const items = db.prepare(sql).all(...params);
  const enriched = items.map(item => ({
    ...item,
    cost_per_wear: calcCostPerWear(item.price, item.worn_count),
    value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)),
    needs_wash: item.wash_threshold > 0 && item.wash_count >= item.wash_threshold
  }));
  res.json({ success: true, data: enriched });
});

// 获取待洗衣物列表
router.get('/needs-wash/list', (req, res) => {
  const items = db.prepare(
    'SELECT * FROM clothing WHERE status = "active" AND wash_threshold > 0 AND wash_count >= wash_threshold ORDER BY wash_count DESC'
  ).all();
  const enriched = items.map(item => ({
    ...item,
    cost_per_wear: calcCostPerWear(item.price, item.worn_count),
    value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)),
    needs_wash: true
  }));
  res.json({ success: true, data: enriched, count: enriched.length });
});

// 获取单件衣物详情
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '衣物不存在' });

  // 获取穿着历史
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
      needs_wash: item.wash_threshold > 0 && item.wash_count >= item.wash_threshold,
      depreciation: calcDepreciation(item),
      wear_history: history
    }
  });
});

// 添加衣物
router.post('/', (req, res) => {
  const { name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, wash_threshold, occasion, status } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: '名称不能为空' });

  const threshold = wash_threshold !== undefined && wash_threshold !== null ? parseInt(wash_threshold) : 3;
  const stmt = db.prepare(`
    INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, wash_threshold, occasion, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    name.trim(), category || '上衣', season || '四季', color || '',
    price || 0, brand || '', material || '', purchase_date || '', note || '', image_path || '',
    tags || '', threshold, occasion || '', status || 'active'
  );
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: item });
});

// 更新衣物
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '衣物不存在' });

  const { name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, wash_threshold, occasion, status } = req.body;
  db.prepare(`
    UPDATE clothing SET name=?, category=?, season=?, color=?, price=?, brand=?, material=?,
    purchase_date=?, note=?, image_path=?, tags=?, wash_threshold=?, occasion=?, status=?, updated_at=datetime('now','localtime') WHERE id=?
  `).run(
    name || existing.name, category || existing.category, season || existing.season,
    color ?? existing.color, price ?? existing.price, brand ?? existing.brand,
    material ?? existing.material, purchase_date ?? existing.purchase_date,
    note ?? existing.note, image_path ?? existing.image_path,
    tags != null ? tags : existing.tags,
    wash_threshold !== undefined && wash_threshold !== null ? parseInt(wash_threshold) : existing.wash_threshold,
    occasion != null ? occasion : existing.occasion,
    status || existing.status,
    req.params.id
  );
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: item });
});

// 快速修改衣物状态（active/idle/wishlist/discarded）
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['active', 'idle', 'wishlist', 'discarded', 'deleted'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: '无效的状态值' });
  }
  const result = db.prepare("UPDATE clothing SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(status, req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: '衣物不存在' });
  res.json({ success: true, message: '状态已更新', data: { id: parseInt(req.params.id), status } });
});

// 删除衣物（软删除）
router.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE clothing SET status = "deleted" WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: '衣物不存在' });
  res.json({ success: true, message: '已删除' });
});

// 记录穿着（+1次，同时增加洗衣计数）
router.post('/:id/wear', (req, res) => {
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '衣物不存在' });
  db.prepare('UPDATE clothing SET worn_count = worn_count + 1, wash_count = wash_count + 1 WHERE id = ?').run(req.params.id);
  const updated = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated });
});

// 标记已清洗（重置洗衣计数）
router.post('/:id/wash', (req, res) => {
  const item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: '衣物不存在' });
  const now = new Date().toISOString().slice(0, 10);
  db.prepare("UPDATE clothing SET wash_count = 0, last_wash_date = ?, updated_at=datetime('now','localtime') WHERE id = ?").run(now, req.params.id);
  const updated = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: updated, message: '已标记为清洗' });
});

// 批量标记已清洗
router.post('/wash/batch', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ success: false, error: '请选择衣物' });
  const now = new Date().toISOString().slice(0, 10);
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE clothing SET wash_count = 0, last_wash_date = ?, updated_at=datetime('now','localtime') WHERE id IN (${placeholders})`).run(now, ...ids);
  res.json({ success: true, message: `已标记 ${ids.length} 件衣物为清洗` });
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
