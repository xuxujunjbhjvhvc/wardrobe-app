require('dotenv').config();
const express = require('express');
const { listenHost, localAccess } = require('./middleware/localAccess');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db/database');
const { importBackup } = require('./utils/importBackup');
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
    try {
      const outcome = importBackup(db, req.body);
      if (outcome.error) return res.status(400).json({ success: false, error: outcome.error });
      res.json({ success: true, ...outcome });
    } catch (err) {
      console.error('[Import] failed:', err);
      res.status(500).json({ success: false, error: '导入失败，数据已回滚' });
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
