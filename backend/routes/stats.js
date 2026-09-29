const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating } = require('../utils/helpers');

router.get('/overview', function(req, res) {
  var totalClothing = db.prepare("SELECT COUNT(*) as count FROM clothing WHERE status='active'").get().count;
  var totalOutfits = db.prepare('SELECT COUNT(*) as count FROM outfits').get().count;
  var totalWorn = db.prepare("SELECT COALESCE(SUM(worn_count),0) as sum FROM clothing WHERE status='active'").get().sum;
  var totalValue = db.prepare("SELECT COALESCE(SUM(price),0) as sum FROM clothing WHERE status='active'").get().sum;
  var recentAdded = db.prepare("SELECT COUNT(*) as count FROM clothing WHERE status='active' AND date(created_at) >= date('now','-7 days','localtime')").get().count;
  var recentWorn = db.prepare("SELECT COUNT(*) as count FROM outfits WHERE date >= date('now','-7 days')").get().count;
  res.json({ success: true, data: {
    total_clothing: totalClothing, total_outfits: totalOutfits, total_worn: totalWorn,
    total_value: Math.round(totalValue * 100) / 100, recent_added: recentAdded, recent_worn: recentWorn,
    avg_cost_per_wear: totalWorn > 0 ? Math.round((totalValue / totalWorn) * 100) / 100 : 0
  }});
});

router.get('/categories', function(req, res) {
  var data = db.prepare("SELECT category, COUNT(*) as count, COALESCE(SUM(price),0) as total_value, COALESCE(SUM(worn_count),0) as total_worn FROM clothing WHERE status='active' GROUP BY category ORDER BY count DESC").all();
  res.json({ success: true, data: data });
});

router.get('/seasons', function(req, res) {
  var data = db.prepare("SELECT season, COUNT(*) as count FROM clothing WHERE status='active' GROUP BY season ORDER BY count DESC").all();
  res.json({ success: true, data: data });
});

router.get('/most-worn', function(req, res) {
  var limit = parseInt(req.query.limit) || 10;
  var items = db.prepare("SELECT * FROM clothing WHERE status='active' AND worn_count > 0 ORDER BY worn_count DESC LIMIT ?").all(limit);
  var data = items.map(function(item) {
    var cpw = calcCostPerWear(item.price, item.worn_count);
    return { ...item, cost_per_wear: cpw, value_rating: calcValueRating(cpw) };
  });
  res.json({ success: true, data: data });
});

router.get('/best-value', function(req, res) {
  var limit = parseInt(req.query.limit) || 10;
  var items = db.prepare("SELECT * FROM clothing WHERE status='active' AND worn_count > 0").all();
  var data = items.map(function(item) {
    var cpw = calcCostPerWear(item.price, item.worn_count);
    return { ...item, cost_per_wear: cpw, value_rating: calcValueRating(cpw) };
  }).sort(function(a, b) { return a.cost_per_wear - b.cost_per_wear; }).slice(0, limit);
  res.json({ success: true, data: data });
});

router.get('/underutilized', function(req, res) {
  var items = db.prepare("SELECT * FROM clothing WHERE status='active' AND price > 0").all();
  var data = items.map(function(item) {
    var cpw = calcCostPerWear(item.price, item.worn_count);
    return { ...item, cost_per_wear: cpw, value_rating: calcValueRating(cpw) };
  }).filter(function(i) { return i.worn_count <= 2 && i.price >= 100; }).sort(function(a, b) { return b.cost_per_wear - a.cost_per_wear; });
  res.json({ success: true, data: data });
});

router.get('/monthly-trend', function(req, res) {
  var data = db.prepare("SELECT strftime('%Y-%m', date) as month, COUNT(*) as outfit_count FROM outfits GROUP BY month ORDER BY month DESC LIMIT 12").all();
  res.json({ success: true, data: data.reverse() });
});

module.exports = router;