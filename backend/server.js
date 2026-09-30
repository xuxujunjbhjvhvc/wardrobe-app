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
  res.json({ success: true, status: 'running', version: '1.0.3', timestamp: new Date().toISOString() });
});

// v1.0.3 数据导入 API
app.post('/api/import', (req, res) => {
  try {
    const { wardrobe, outfits, mode } = req.body;
    if (!wardrobe && !outfits) return res.status(400).json({ success: false, error: '无有效数据' });
    const { db } = require('./db/database');
    let importedClothing = 0, importedOutfits = 0;

    if (mode === 'replace') {
      db.exec('DELETE FROM outfit_items');
      db.exec('DELETE FROM outfits');
      db.exec('DELETE FROM clothing');
    }

    if (Array.isArray(wardrobe)) {
      wardrobe.forEach(item => {
        if (!item.name) return;
        const existing = db.prepare('SELECT id FROM clothing WHERE name = ? AND category = ?').get(item.name, item.category || '上衣');
        if (existing && mode !== 'replace') return;
        db.prepare(`INSERT INTO clothing (name, category, season, color, price, brand, material, purchase_date, note, image_path, tags, worn_count, wash_count, wash_threshold, last_wash_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          item.name, item.category || '上衣', item.season || '四季', item.color || '',
          item.price || 0, item.brand || '', item.material || '', item.purchase_date || '',
          item.note || '', item.image_path || '', item.tags || '',
          item.worn_count || 0, item.wash_count || 0, item.wash_threshold || 3, item.last_wash_date || ''
        );
        importedClothing++;
      });
    }

    if (Array.isArray(outfits)) {
      outfits.forEach(outfit => {
        if (!outfit.date) return;
        const existing = db.prepare('SELECT id FROM outfits WHERE date = ?').get(outfit.date);
        if (existing) return;
        const result = db.prepare('INSERT INTO outfits (date, note, weather) VALUES (?, ?, ?)').run(outfit.date, outfit.note || '', outfit.weather || '');
        if (Array.isArray(outfit.items)) {
          outfit.items.forEach(item => {
            const clothing = db.prepare('SELECT id FROM clothing WHERE name = ? AND category = ?').get(item.name, item.category || '上衣');
            if (clothing) db.prepare('INSERT OR IGNORE INTO outfit_items (outfit_id, clothing_id) VALUES (?, ?)').run(result.lastInsertRowid, clothing.id);
          });
        }
        importedOutfits++;
      });
    }

    res.json({ success: true, importedClothing, importedOutfits });
  } catch (err) {
    res.status(500).json({ success: false, error: '导入失败: ' + err.message });
  }
});

async function start() {
  await initDatabase();
  const clothingRoutes = require('./routes/clothing');
  const outfitRoutes = require('./routes/outfits');
  const statsRoutes = require('./routes/stats');
  app.use('/api/clothing', clothingRoutes);
  app.use('/api/outfits', outfitRoutes);
  app.use('/api/stats', statsRoutes);
  app.get(/^\/(?!api|uploads).*/, (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
  app.use(notFound);
  app.use(errorHandler);
  app.listen(PORT, () => {
    console.log('Wardrobe server running at http://localhost:' + PORT);
  });
}
start().catch(err => { console.error('Start failed:', err); process.exit(1); });
