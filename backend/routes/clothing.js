const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating } = require('../utils/helpers');

router.get('/', function(req, res) {
  var category = req.query.category, season = req.query.season, search = req.query.search, sort = req.query.sort;
  var sql = 'SELECT * FROM clothing WHERE status = "active"';
  var params = [];
  if (category && category !== '全部') { sql += ' AND category = ?'; params.push(category); }
  if (season && season !== '全部') { sql += ' AND (season = ? OR season = "四季")'; params.push(season); }
  if (search) { sql += ' AND (name LIKE ? OR color LIKE ? OR brand LIKE ?)'; params.push('%'+search+'%', '%'+search+'%', '%'+search+'%'); }
  if (sort === 'worn') sql += ' ORDER BY worn_count DESC';
  else if (sort === 'price') sql += ' ORDER BY price DESC';
  else sql += ' ORDER BY created_at DESC';
  var items = db.prepare(sql).all.apply(db.prepare(sql), params);
  var enriched = items.map(function(item) {
    var cpw = calcCostPerWear(item.price, item.worn_count);
    item.cost_per_wear = cpw;
    item.value_rating = calcValueRating(cpw);
    return item;
  });
  res.json({ success: true, data: enriched });
});

router.get('/:id', function(req, res) {
  var item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'not found' });
  var history = db.prepare('SELECT o.date, o.note FROM outfits o JOIN outfit_items oi ON o.id = oi.outfit_id WHERE oi.clothing_id = ? ORDER BY o.date DESC').all(req.params.id);
  var cpw = calcCostPerWear(item.price, item.worn_count);
  res.json({ success: true, data: { ...item, cost_per_wear: cpw, value_rating: calcValueRating(cpw), wear_history: history } });
});

router.post('/', function(req, res) {
  var b = req.body;
  if (!b.name || !b.name.trim()) return res.status(400).json({ success: false, error: 'name required' });
  var result = db.prepare('INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path) VALUES (?,?,?,?,?,?,?,?,?,?)').run(b.name.trim(), b.category||'上衣', b.season||'四季', b.color||'', b.price||0, b.brand||'', b.material||'', b.purchase_date||'', b.note||'', b.image_path||'');
  var item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: item });
});

router.put('/:id', function(req, res) {
  var existing = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ success: false, error: 'not found' });
  var b = req.body;
  db.prepare('UPDATE clothing SET name=?, category=?, season=?, color=?, price=?, brand=?, material=?, purchase_date=?, note=?, image_path=?, updated_at=datetime("now","localtime") WHERE id=?').run(b.name||existing.name, b.category||existing.category, b.season||existing.season, b.color!=null?b.color:existing.color, b.price!=null?b.price:existing.price, b.brand!=null?b.brand:existing.brand, b.material!=null?b.material:existing.material, b.purchase_date!=null?b.purchase_date:existing.purchase_date, b.note!=null?b.note:existing.note, b.image_path!=null?b.image_path:existing.image_path, req.params.id);
  res.json({ success: true, data: db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', function(req, res) {
  var result = db.prepare('UPDATE clothing SET status = "deleted" WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, message: 'deleted' });
});

router.post('/:id/wear', function(req, res) {
  var item = db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ success: false, error: 'not found' });
  db.prepare('UPDATE clothing SET worn_count = worn_count + 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true, data: db.prepare('SELECT * FROM clothing WHERE id = ?').get(req.params.id) });
});

module.exports = router;