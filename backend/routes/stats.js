const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating, calcDepreciation } = require('../utils/helpers');

router.get('/overview', (req, res) => {
  const totalClothing = db.prepare("SELECT COUNT(*) as count FROM clothing WHERE status='active'").get().count;
  const totalOutfits = db.prepare('SELECT COUNT(*) as count FROM outfits').get().count;
  const totalWorn = db.prepare("SELECT COALESCE(SUM(worn_count),0) as sum FROM clothing WHERE status='active'").get().sum;
  const totalValue = db.prepare("SELECT COALESCE(SUM(price),0) as sum FROM clothing WHERE status='active'").get().sum;
  const recentAdded = db.prepare("SELECT COUNT(*) as count FROM clothing WHERE status='active' AND date(created_at) >= date('now','-7 days','localtime')").get().count;
  const recentWorn = db.prepare("SELECT COUNT(*) as count FROM outfits WHERE date >= date('now','-7 days')").get().count;
  res.json({ success: true, data: { total_clothing: totalClothing, total_outfits: totalOutfits, total_worn: totalWorn, total_value: Math.round(totalValue * 100) / 100, recent_added: recentAdded, recent_worn: recentWorn, avg_cost_per_wear: totalWorn > 0 ? Math.round((totalValue / totalWorn) * 100) / 100 : 0 } });
});

router.get('/categories', (req, res) => {
  const data = db.prepare("SELECT category, COUNT(*) as count, COALESCE(SUM(price),0) as total_value, COALESCE(SUM(worn_count),0) as total_worn FROM clothing WHERE status='active' GROUP BY category ORDER BY count DESC").all();
  res.json({ success: true, data });
});

router.get('/seasons', (req, res) => {
  const data = db.prepare("SELECT season, COUNT(*) as count FROM clothing WHERE status='active' GROUP BY season ORDER BY count DESC").all();
  res.json({ success: true, data });
});

router.get('/most-worn', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const data = db.prepare("SELECT * FROM clothing WHERE status='active' AND worn_count > 0 ORDER BY worn_count DESC LIMIT ?").all(limit).map(item => ({ ...item, cost_per_wear: calcCostPerWear(item.price, item.worn_count), value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)) }));
  res.json({ success: true, data });
});

router.get('/best-value', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const items = db.prepare("SELECT * FROM clothing WHERE status='active' AND worn_count > 0").all();
  const enriched = items.map(item => ({ ...item, cost_per_wear: calcCostPerWear(item.price, item.worn_count), value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)) })).sort((a, b) => a.cost_per_wear - b.cost_per_wear).slice(0, limit);
  res.json({ success: true, data: enriched });
});

router.get('/underutilized', (req, res) => {
  const items = db.prepare("SELECT * FROM clothing WHERE status='active' AND price > 0").all();
  const enriched = items.map(item => ({ ...item, cost_per_wear: calcCostPerWear(item.price, item.worn_count), value_rating: calcValueRating(calcCostPerWear(item.price, item.worn_count)) })).filter(i => i.worn_count <= 2 && i.price >= 100).sort((a, b) => b.cost_per_wear - a.cost_per_wear);
  res.json({ success: true, data: enriched });
});

router.get('/monthly-trend', (req, res) => {
  const data = db.prepare("SELECT strftime('%Y-%m', date) as month, COUNT(*) as outfit_count, COUNT(DISTINCT oi.clothing_id) as unique_items FROM outfits o LEFT JOIN outfit_items oi ON o.id = oi.outfit_id GROUP BY month ORDER BY month DESC LIMIT 12").all();
  res.json({ success: true, data: data.reverse() });
});

router.get('/colors', (req, res) => {
  const data = db.prepare("SELECT color, COUNT(*) as count FROM clothing WHERE status='active' AND color != '' GROUP BY color ORDER BY count DESC").all();
  res.json({ success: true, data });
});

router.get('/depreciation', (req, res) => {
  const items = db.prepare("SELECT * FROM clothing WHERE status='active' AND price > 0").all();
  const withDep = items.map(item => ({ ...item, depreciation: calcDepreciation(item) }));
  const totalOriginal = withDep.reduce((s, i) => s + i.price, 0);
  const totalCurrent = withDep.reduce((s, i) => s + i.depreciation.currentValue, 0);
  const totalDepreciated = totalOriginal - totalCurrent;
  const byStatus = { '保值中': 0, '正常使用': 0, '建议淘汰': 0, '未估价': 0 };
  withDep.forEach(i => { byStatus[i.depreciation.status] = (byStatus[i.depreciation.status] || 0) + 1; });
  const toRetire = withDep.filter(i => i.depreciation.status === '建议淘汰').sort((a, b) => a.depreciation.currentValue - b.depreciation.currentValue).slice(0, 10).map(i => ({ id: i.id, name: i.name, category: i.category, price: i.price, currentValue: i.depreciation.currentValue, depreciationRate: i.depreciation.depreciationRate, monthsUsed: i.depreciation.monthsUsed, wornCount: i.worn_count, suggestion: i.depreciation.suggestion }));
  res.json({ success: true, data: { totalOriginal: Math.round(totalOriginal * 100) / 100, totalCurrent: Math.round(totalCurrent * 100) / 100, totalDepreciated: Math.round(totalDepreciated * 100) / 100, avgDepreciationRate: totalOriginal > 0 ? Math.round((totalDepreciated / totalOriginal) * 1000) / 1000 : 0, byStatus, toRetire, totalItems: withDep.length } });
});

module.exports = router;
