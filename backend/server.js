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
  res.json({ success: true, status: 'running', version: '1.0.0', timestamp: new Date().toISOString() });
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