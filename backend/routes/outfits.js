const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { today } = require('../utils/helpers');
const { replaceOutfit, removeOutfit } = require('../utils/outfitChanges');

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
  try {
    const result = replaceOutfit(db, { ...req.body, date: req.body.date || today() });
    if (result.error === 'invalid_items') return res.status(400).json({ success: false, error: '衣物编号无效、重复，或衣物不存在/已删除' });
    if (result.error === 'invalid_date') return res.status(400).json({ success: false, error: '日期格式必须为 YYYY-MM-DD' });
    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    console.error('[Outfit] save failed:', error);
    res.status(500).json({ success: false, error: '保存穿搭失败' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = removeOutfit(db, req.params.id);
    if (result.error === 'not_found') return res.status(404).json({ success: false, error: '穿搭记录不存在' });
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    console.error('[Outfit] delete failed:', error);
    res.status(500).json({ success: false, error: '删除穿搭失败' });
  }
});

module.exports = router;
