require('dotenv').config();
const express = require('express');
const { listenHost, localAccess } = require('./middleware/localAccess');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = listenHost(process.env.HOST);

// 中间件
app.use(localAccess);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件
const frontendDir = path.join(__dirname, '..', 'frontend');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

// 健康检查（数据库初始化前也可用）
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'running', version: '1.0.10', timestamp: new Date().toISOString() });
});

async function start() {
  // 初始化数据库
  await initDatabase();

  // 路由（在数据库初始化后加载，确保db可用）
  const clothingRoutes = require('./routes/clothing');
  const outfitRoutes = require('./routes/outfits');
  const statsRoutes = require('./routes/stats');
  const shoppingRoutes = require('./routes/shopping');
  const weatherRoutes = require('./routes/weather');
  const savedOutfitRoutes = require('./routes/savedOutfits');
  app.use('/api/clothing', clothingRoutes);
  app.use('/api/outfits', outfitRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/shopping', shoppingRoutes);
  app.use('/api/weather', weatherRoutes);
  app.use('/api/saved-outfits', savedOutfitRoutes);

  // 数据导入 API（v1.0.3）
  const { db } = require('./db/database');
  app.post('/api/import', (req, res) => {
    const { wardrobe = [], outfits = [], mode = 'merge' } = req.body;
    // Validate the entire import envelope before any destructive replace operation.
    if (!Array.isArray(wardrobe) || !Array.isArray(outfits)) {
      return res.status(400).json({ success: false, error: '数据格式错误：wardrobe 和 outfits 必须都是数组' });
    }
    if (mode !== 'merge' && mode !== 'replace') {
      return res.status(400).json({ success: false, error: '导入模式必须是 merge 或 replace' });
    }
    if (wardrobe.some(item => !item || typeof item !== 'object' || Array.isArray(item)) ||
        outfits.some(outfit => !outfit || typeof outfit !== 'object' || Array.isArray(outfit))) {
      return res.status(400).json({ success: false, error: '导入记录必须是对象' });
    }
    let transactionStarted = false;
    try {
      db.exec('BEGIN');
      transactionStarted = true;
      let importedClothing = 0, importedOutfits = 0, skipped = 0;

      if (mode === 'replace') {
        db.prepare('DELETE FROM outfit_items').run();
        db.prepare('DELETE FROM outfits').run();
        db.prepare('DELETE FROM clothing').run();
      }

      // 导入衣物
      const idMap = {}; // 旧ID -> 新ID
      for (const item of wardrobe) {
        if (!item.name) continue;
        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM clothing WHERE name = ? AND category = ? AND status = "active"').get(item.name, item.category || '上衣');
          if (existing) { idMap[item.id] = existing.id; skipped++; continue; }
        }
        const result = db.prepare(`
          INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, worn_count, wash_count, wash_threshold, last_wash_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.name, item.category || '上衣', item.season || '四季', item.color || '',
          item.price || 0, item.brand || '', item.material || '', item.purchase_date || '',
          item.note || '', item.image_path || '', item.tags || '',
          item.worn_count || 0, item.wash_count || 0, item.wash_threshold || 3, item.last_wash_date || ''
        );
        idMap[item.id] = result.lastInsertRowid;
        importedClothing++;
      }

      // 导入穿搭记录
      for (const outfit of outfits) {
        if (!outfit.date) continue;
        if (mode === 'merge') {
          const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(outfit.date);
          if (existing) continue;
        }
        const result = db.prepare('INSERT INTO outfits (date, note, weather) VALUES (?, ?, ?)').run(
          outfit.date, outfit.note || '', outfit.weather || ''
        );
        if (Array.isArray(outfit.items)) {
          for (const ci of outfit.items) {
            const newId = idMap[ci.id] || ci.id;
            const exists = db.prepare('SELECT id FROM clothing WHERE id = ?').get(newId);
            if (exists) {
              db.prepare('INSERT OR IGNORE INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)').run(result.lastInsertRowid, newId);
            }
          }
        }
        importedOutfits++;
      }

      db.exec('COMMIT');
      transactionStarted = false;
      res.json({ success: true, importedClothing, importedOutfits, skipped, mode });
    } catch (err) {
      if (transactionStarted) {
        try { db.exec('ROLLBACK'); } catch (rollbackError) {
          console.error('[Import] rollback failed:', rollbackError);
        }
      }
      res.status(500).json({ success: false, error: '导入失败: ' + err.message });
    }
  });

  // SPA 回退
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  // 错误处理
  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, HOST, () => {
    console.log(`\n  👔 电子衣橱服务已启动`);
    console.log(`  📡 监听地址: http://${HOST.includes(':') ? '[' + HOST + ']' : HOST}:${PORT}`);
    console.log(`  📊 健康检查: http://127.0.0.1:${PORT}/api/health`);
    if (HOST === '0.0.0.0' || HOST === '::') {
      console.warn('  ⚠️ 局域网模式：无账户认证，请仅连接可信网络，不要向公网开放端口。');
    }
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
