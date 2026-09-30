const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', (req, res) => {
  let sql = "SELECT * FROM shopping_list WHERE 1=1";
  const params = [];
  if (req.query.status) { sql += " AND status = ?"; params.push(req.query.status); }
  if (req.query.priority) { sql += " AND priority = ?"; params.push(req.query.priority); }
  if (req.query.category) { sql += " AND category = ?"; params.push(req.query.category); }
  sql += " ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC";
  const items = db.prepare(sql).all(...params);
  const pending = items.filter(i => i.status === 'pending');
  const totalBudget = pending.reduce((s, i) => s + (i.estimated_price || 0), 0);
  const highPriority = pending.filter(i => i.priority === 'high').length;
  res.json({ success: true, data: items, summary: { total: items.length, pending: pending.length, purchased: items.filter(i => i.status === 'purchased').length, totalBudget: Math.round(totalBudget * 100) / 100, highPriority } });
});

router.post('/', (req, res) => {
  const { name, category = '上衣', estimated_price = 0, priority = 'medium', note = '' } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ success: false, error: '请输入物品名称' });
  const result = db.prepare("INSERT INTO shopping_list (name, category, estimated_price, priority, note) VALUES (?, ?, ?, ?, ?)").run(name.trim(), category, parseFloat(estimated_price) || 0, priority, note.trim());
  const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, data: item });
});

router.put('/:id', (req, res) => {
  const { name, category, estimated_price, priority, note } = req.body;
  const existing = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '购物项不存在' });
  db.prepare("UPDATE shopping_list SET name = ?, category = ?, estimated_price = ?, priority = ?, note = ? WHERE id = ?").run(name || existing.name, category || existing.category, estimated_price !== undefined ? parseFloat(estimated_price) || 0 : existing.estimated_price, priority || existing.priority, note !== undefined ? note : existing.note, req.params.id);
  const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: item });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM shopping_list WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: '购物项不存在' });
  res.json({ success: true, message: '已删除' });
});

router.post('/:id/purchase', (req, res) => {
  const existing = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '购物项不存在' });
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  db.prepare("UPDATE shopping_list SET status = 'purchased', purchased_at = ? WHERE id = ?").run(now, req.params.id);
  const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: item });
});

router.post('/:id/unpurchase', (req, res) => {
  const existing = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: '购物项不存在' });
  db.prepare("UPDATE shopping_list SET status = 'pending', purchased_at = '' WHERE id = ?").run(req.params.id);
  const item = db.prepare('SELECT * FROM shopping_list WHERE id = ?').get(req.params.id);
  res.json({ success: true, data: item });
});

router.delete('/purchased/clear', (req, res) => {
  const result = db.prepare("DELETE FROM shopping_list WHERE status = 'purchased'").run();
  res.json({ success: true, deleted: result.changes });
});

module.exports = router;
