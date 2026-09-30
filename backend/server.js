const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initDB = require('./db/database');
const clothingRoutes = require('./routes/clothing');
const outfitRoutes = require('./routes/outfits');
const statsRoutes = require('./routes/stats');
const shoppingRoutes = require('./routes/shopping');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// 初始化数据库
const db = initDB();
app.locals.db = db;

// 路由
app.use('/api/clothing', clothingRoutes);
app.use('/api/outfits', outfitRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/shopping', shoppingRoutes);

// 数据导入 API
app.post('/api/import', (req, res) => {
  const { clothing = [], outfits = [], mode = 'merge' } = req.body;
  const db = app.locals.db;

  if (mode === 'replace') {
    db.run('DELETE FROM outfit_items');
    db.run('DELETE FROM outfits');
    db.run('DELETE FROM clothing');
  }

  let clothingCount = 0;
  let outfitCount = 0;

  // 导入衣物
  for (const item of clothing) {
    if (mode === 'merge') {
      const existing = db.get(
        'SELECT id FROM clothing WHERE name = ? AND category = ? AND status = 1',
        [item.name, item.category]
      );
      if (existing) continue;
    }
    db.run(
      `INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, worn_count, wash_count, wash_threshold, last_wash_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [
        item.name, item.category, item.season || '四季', item.color || '',
        item.price || 0, item.brand || '', item.material || '', item.purchase_date || null,
        item.note || '', item.image_path || '', item.tags || '',
        item.worn_count || 0, item.wash_count || 0, item.wash_threshold || 3, item.last_wash_date || null
      ]
    );
    clothingCount++;
  }

  // 导入穿搭
  for (const outfit of outfits) {
    if (mode === 'merge') {
      const existing = db.get('SELECT id FROM outfits WHERE date = ?', [outfit.date]);
      if (existing) continue;
    }
    const result = db.run(
      `INSERT INTO outfits (date, note, weather, created_at) VALUES (?, ?, ?, datetime('now'))`,
      [outfit.date, outfit.note || '', outfit.weather || '']
    );
    const outfitId = result.lastInsertRowid;
    if (outfit.items && outfit.items.length > 0) {
      for (const clothingId of outfit.items) {
        db.run(
          'INSERT OR IGNORE INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)',
          [outfitId, clothingId]
        );
      }
    }
    outfitCount++;
  }

  res.json({ success: true, data: { clothingCount, outfitCount, mode } });
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'running', version: '1.0.6', timestamp: new Date().toISOString() } });
});

// SPA 回退
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 错误处理
app.use(errorHandler);

// 启动服务
app.listen(PORT, () => {
  console.log(`✅ 电子衣橱服务已启动: http://localhost:${PORT}`);
  console.log(`📦 版本: 1.0.6`);
});

module.exports = app;
