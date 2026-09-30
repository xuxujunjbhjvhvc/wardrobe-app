const express = require('express');
const router = express.Router();
const { calcCostPerWear, calcValueRating, calcDepreciation } = require('../utils/helpers');

// 总览统计
router.get('/overview', (req, res) => {
  const db = req.app.locals.db;
  const totalClothing = db.get("SELECT COUNT(*) as count FROM clothing WHERE status = 1").count;
  const totalOutfits = db.get("SELECT COUNT(*) as count FROM outfits").count;
  const totalWorn = db.get("SELECT COALESCE(SUM(worn_count), 0) as total FROM clothing WHERE status = 1").total;
  const totalValue = db.get("SELECT COALESCE(SUM(price), 0) as total FROM clothing WHERE status = 1").total;
  const avgCostPerWear = totalWorn > 0 ? (totalValue / totalWorn).toFixed(2) : 0;

  res.json({
    success: true,
    data: { totalClothing, totalOutfits, totalWorn, totalValue, avgCostPerWear }
  });
});

// 分类分布
router.get('/categories', (req, res) => {
  const db = req.app.locals.db;
  const categories = db.all("SELECT category, COUNT(*) as count, COALESCE(SUM(price), 0) as totalValue FROM clothing WHERE status = 1 GROUP BY category ORDER BY count DESC");
  res.json({ success: true, data: categories });
});

// 季节分布
router.get('/seasons', (req, res) => {
  const db = req.app.locals.db;
  const seasons = db.all("SELECT season, COUNT(*) as count FROM clothing WHERE status = 1 GROUP BY season ORDER BY count DESC");
  res.json({ success: true, data: seasons });
});

// 穿着频次排行
router.get('/most-worn', (req, res) => {
  const db = req.app.locals.db;
  const limit = parseInt(req.query.limit) || 10;
  const items = db.all(
    "SELECT id, name, category, color, price, worn_count, image_path FROM clothing WHERE status = 1 ORDER BY worn_count DESC LIMIT ?",
    [limit]
  );
  res.json({ success: true, data: items });
});

// 性价比排行（单次穿着成本最低）
router.get('/best-value', (req, res) => {
  const db = req.app.locals.db;
  const limit = parseInt(req.query.limit) || 10;
  const items = db.all(
    "SELECT id, name, category, color, price, worn_count, image_path FROM clothing WHERE status = 1 AND worn_count > 0 ORDER BY (price * 1.0 / worn_count) ASC LIMIT ?",
    [limit]
  );
  const result = items.map(item => ({
    ...item,
    costPerWear: calcCostPerWear(item.price, item.worn_count),
    rating: calcValueRating(item.price, item.worn_count)
  }));
  res.json({ success: true, data: result });
});

// 待提升衣物（贵但穿得少）
router.get('/underutilized', (req, res) => {
  const db = req.app.locals.db;
  const items = db.all(
    "SELECT id, name, category, color, price, worn_count, image_path FROM clothing WHERE status = 1 AND price > 100 AND worn_count < 5 ORDER BY price DESC"
  );
  const result = items.map(item => ({
    ...item,
    costPerWear: calcCostPerWear(item.price, item.worn_count),
    rating: calcValueRating(item.price, item.worn_count)
  }));
  res.json({ success: true, data: result });
});

// 月度穿搭趋势
router.get('/monthly-trend', (req, res) => {
  const db = req.app.locals.db;
  const trend = db.all(
    `SELECT strftime('%Y-%m', date) as month, COUNT(*) as outfitCount, COALESCE(SUM(worn_count), 0) as totalWorn
     FROM outfits LEFT JOIN outfit_items ON outfits.id = outfit_items.outfit_id
     GROUP BY month ORDER BY month DESC LIMIT 12`
  );
  res.json({ success: true, data: trend });
});

// 颜色分布
router.get('/colors', (req, res) => {
  const db = req.app.locals.db;
  const colors = db.all("SELECT color, COUNT(*) as count FROM clothing WHERE status = 1 AND color != '' GROUP BY color ORDER BY count DESC");
  res.json({ success: true, data: colors });
});

// 折旧分析
router.get('/depreciation', (req, res) => {
  const db = req.app.locals.db;
  const items = db.all("SELECT * FROM clothing WHERE status = 1");

  let totalOriginalValue = 0;
  let totalCurrentValue = 0;
  const statusCounts = { preserving: 0, normal: 0, retiring: 0 };
  const details = [];

  for (const item of items) {
    const dep = calcDepreciation(item);
    totalOriginalValue += item.price || 0;
    totalCurrentValue += dep.currentValue;
    statusCounts[dep.status]++;
    details.push({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      wornCount: item.worn_count,
      currentValue: dep.currentValue,
      depreciationRate: dep.depreciationRate,
      status: dep.status,
      monthsUsed: dep.monthsUsed
    });
  }

  const avgDepreciationRate = totalOriginalValue > 0
    ? ((1 - totalCurrentValue / totalOriginalValue) * 100).toFixed(1)
    : 0;

  const retiringList = details
    .filter(d => d.status === 'retiring')
    .sort((a, b) => a.currentValue - b.currentValue);

  res.json({
    success: true,
    data: {
      totalOriginalValue,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalDepreciation: Math.round((totalOriginalValue - totalCurrentValue) * 100) / 100,
      avgDepreciationRate,
      statusCounts,
      retiringList
    }
  });
});

// 月度穿搭报告
router.get('/monthly-report', (req, res) => {
  const db = req.app.locals.db;
  const now = new Date();
  const month = req.query.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 解析月份
  const [year, mon] = month.split('-').map(Number);
  const monthStart = `${year}-${String(mon).padStart(2, '0')}-01`;
  const nextMonth = mon === 12 ? `${year + 1}-01-01` : `${year}-${String(mon + 1).padStart(2, '0')}-01`;
  const lastMonthStart = mon === 1 ? `${year - 1}-12-01` : `${year}-${String(mon - 1).padStart(2, '0')}-01`;

  // 本月穿搭天数
  const outfitDays = db.get(
    "SELECT COUNT(DISTINCT date) as count FROM outfits WHERE date >= ? AND date < ?",
    [monthStart, nextMonth]
  ).count;

  // 本月总穿搭记录数
  const totalOutfits = db.get(
    "SELECT COUNT(*) as count FROM outfits WHERE date >= ? AND date < ?",
    [monthStart, nextMonth]
  ).count;

  // 本月总穿着次数（所有衣物被穿的次数之和）
  const totalWorn = db.get(
    `SELECT COALESCE(SUM(1), 0) as total FROM outfit_items oi
     JOIN outfits o ON oi.outfit_id = o.id
     WHERE o.date >= ? AND o.date < ?`,
    [monthStart, nextMonth]
  ).total;

  // 本月最常穿的衣物 Top 5
  const mostWorn = db.all(
    `SELECT c.id, c.name, c.category, c.color, c.image_path, c.price, c.worn_count,
            COUNT(oi.id) as monthWorn
     FROM clothing c
     JOIN outfit_items oi ON c.id = oi.clothing_id
     JOIN outfits o ON oi.outfit_id = o.id
     WHERE o.date >= ? AND o.date < ? AND c.status = 1
     GROUP BY c.id
     ORDER BY monthWorn DESC
     LIMIT 5`,
    [monthStart, nextMonth]
  );

  // 本月分类穿着占比
  const categoryBreakdown = db.all(
    `SELECT c.category, COUNT(oi.id) as wornCount
     FROM clothing c
     JOIN outfit_items oi ON c.id = oi.clothing_id
     JOIN outfits o ON oi.outfit_id = o.id
     WHERE o.date >= ? AND o.date < ? AND c.status = 1
     GROUP BY c.category
     ORDER BY wornCount DESC`,
    [monthStart, nextMonth]
  );

  // 本月新购衣物
  const newPurchases = db.all(
    `SELECT id, name, category, price, purchase_date, image_path
     FROM clothing
     WHERE purchase_date >= ? AND purchase_date < ? AND status = 1
     ORDER BY purchase_date DESC`,
    [monthStart, nextMonth]
  );
  const newPurchaseTotal = newPurchases.reduce((sum, item) => sum + (item.price || 0), 0);

  // 平均单次成本（本月新购+已有衣物的总价值 / 本月总穿着次数）
  const avgCostPerWear = totalWorn > 0
    ? (newPurchaseTotal / totalWorn).toFixed(2)
    : 0;

  // 上月对比
  const lastMonthOutfitDays = db.get(
    "SELECT COUNT(DISTINCT date) as count FROM outfits WHERE date >= ? AND date < ?",
    [lastMonthStart, monthStart]
  ).count;
  const lastMonthTotalWorn = db.get(
    `SELECT COALESCE(SUM(1), 0) as total FROM outfit_items oi
     JOIN outfits o ON oi.outfit_id = o.id
     WHERE o.date >= ? AND o.date < ?`,
    [lastMonthStart, monthStart]
  ).total;

  // 每日穿搭趋势
  const dailyTrend = db.all(
    `SELECT o.date, COUNT(DISTINCT o.id) as outfitCount, COUNT(oi.id) as itemCount
     FROM outfits o
     LEFT JOIN outfit_items oi ON o.id = oi.outfit_id
     WHERE o.date >= ? AND o.date < ?
     GROUP BY o.date
     ORDER BY o.date ASC`,
    [monthStart, nextMonth]
  );

  res.json({
    success: true,
    data: {
      month,
      outfitDays,
      totalOutfits,
      totalWorn,
      mostWorn,
      categoryBreakdown,
      newPurchases: { count: newPurchases.length, totalValue: newPurchaseTotal, items: newPurchases },
      avgCostPerWear,
      comparedToLastMonth: {
        outfitDaysChange: outfitDays - lastMonthOutfitDays,
        totalWornChange: totalWorn - lastMonthTotalWorn,
        lastOutfitDays: lastMonthOutfitDays,
        lastTotalWorn: lastMonthTotalWorn
      },
      dailyTrend
    }
  });
});

module.exports = router;
