const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { today } = require('../utils/helpers');

router.get('/', function(req, res) {
  var month = req.query.month;
  var sql = 'SELECT * FROM outfits';
  var params = [];
  if (month) { sql += ' WHERE date LIKE ?'; params.push(month + '%'); }
  sql += ' ORDER BY date DESC';
  var outfits = db.prepare(sql).all.apply(db.prepare(sql), params);
  var result = outfits.map(function(o) {
    var items = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(o.id);
    return { ...o, items: items };
  });
  res.json({ success: true, data: result });
});

router.get('/date/:date', function(req, res) {
  var outfit = db.prepare('SELECT * FROM outfits WHERE date = ?').get(req.params.date);
  if (!outfit) return res.json({ success: true, data: null });
  var items = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(outfit.id);
  res.json({ success: true, data: { ...outfit, items: items } });
});

router.post('/', function(req, res) {
  var date = req.body.date || today();
  var items = req.body.items;
  var note = req.body.note || '';
  var weather = req.body.weather || '';
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'select at least one item' });
  }
  var existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(date);
  var outfitId;
  if (existing) {
    outfitId = existing.id;
    db.prepare('UPDATE outfits SET note=?, weather=? WHERE id=?').run(note, weather, outfitId);
    var oldItems = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(outfitId);
    oldItems.forEach(function(oi) { db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1) WHERE id = ?').run(oi.clothing_id); });
    db.prepare('DELETE FROM outfit_items WHERE outfit_id = ?').run(outfitId);
  } else {
    var result = db.prepare('INSERT INTO outfits (date, note, weather) VALUES (?,?,?)').run(date, note, weather);
    outfitId = result.lastInsertRowid;
  }
  items.forEach(function(id) {
    db.prepare('INSERT INTO outfit_items (outfit_id, clothing_id) VALUES (?,?)').run(outfitId, id);
    db.prepare('UPDATE clothing SET worn_count = worn_count + 1 WHERE id = ?').run(id);
  });
  var outfit = db.prepare('SELECT * FROM outfits WHERE id = ?').get(outfitId);
  var outfitItems = db.prepare('SELECT c.* FROM clothing c JOIN outfit_items oi ON c.id = oi.clothing_id WHERE oi.outfit_id = ?').all(outfitId);
  res.status(201).json({ success: true, data: { ...outfit, items: outfitItems } });
});

router.delete('/:id', function(req, res) {
  var outfit = db.prepare('SELECT * FROM outfits WHERE id = ?').get(req.params.id);
  if (!outfit) return res.status(404).json({ success: false, error: 'not found' });
  var items = db.prepare('SELECT clothing_id FROM outfit_items WHERE outfit_id = ?').all(req.params.id);
  items.forEach(function(oi) { db.prepare('UPDATE clothing SET worn_count = MAX(0, worn_count - 1) WHERE id = ?').run(oi.clothing_id); });
  db.prepare('DELETE FROM outfits WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'deleted' });
});

module.exports = router;