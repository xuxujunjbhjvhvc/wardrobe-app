require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const frontendDir = path.join(__dirname, '..', 'frontend');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use(express.static(frontendDir));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'running', version: '1.0.5', timestamp: new Date().toISOString() });
});

async function start() {
  await initDatabase();

  const clothingRoutes = require('./routes/clothing');
  const outfitRoutes = require('./routes/outfits');
  const statsRoutes = require('./routes/stats');
  const shoppingRoutes = require('./routes/shopping');
  app.use('/api/clothing', clothingRoutes);
  app.use('/api/outfits', outfitRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/shopping', shoppingRoutes);

  const { db } = require('./db/database');
  app.post('/api/import', (req, res) => {
    const { wardrobe = [], outfits = [], mode = 'merge' } = req.body;
    if (!Array.isArray(wardrobe) && !Array.isArray(outfits)) {
      return res.status(400).json({ success: false, error: '数据格式错误' });
    }
    try {
      let importedClothing = 0, importedOutfits = 0, skipped = 0;

      if (mode === 'replace') {
        db.prepare('DELETE FROM outfit_items').run();
        db.prepare('DELETE FROM outfits').run();
        db.prepare('DELETE FROM clothing').run();
      }

      const idMap = {};
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

      res.json({ success: true, importedClothing, importedOutfits, skipped, mode });
    } catch (err) {
      res.status(500).json({ success: false, error: '导入失败: ' + err.message });
    }
  });

  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });

  app.use(notFound);
  app.use(errorHandler);

  app.listen(PORT, () => {
    console.log(`\n  👔 电子衣橱服务已启动`);
    console.log(`  📡 本地地址: http://localhost:${PORT}`);
    console.log(`  📱 手机访问: http://<你的IP>:${PORT}`);
    console.log(`  📊 健康检查: http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
