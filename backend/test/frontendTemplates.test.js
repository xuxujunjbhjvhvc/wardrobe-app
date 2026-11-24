const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../../frontend/js/app.js'), 'utf8');
function createApp(api = {}) {
  const nodes = new Map();
  const document = {
    addEventListener() {},
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { innerHTML: '', textContent: '' });
      return nodes.get(id);
    }
  };
  const ctx = vm.createContext({ document, API: api, console });
  const app = vm.runInContext(source + '\nApp;', ctx, { timeout: 2000 });
  return { app, nodes, ctx };
}
const malicious = '<img src=x onerror="alert(1)">';

test('HTML utility escapes text and rejects executable image URLs', () => {
  const { ctx } = createApp();
  const escape = vm.runInContext('escapeHTML', ctx);
  const safeImage = vm.runInContext('safeImageSrc', ctx);
  assert.equal(escape(malicious), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(safeImage('javascript:alert(1)'), '');
  assert.equal(safeImage('x" onerror="alert(1)'), '');
  assert.equal(safeImage('/uploads/photo.png'), '/uploads/photo.png');
});

test('calendar refuses injected clothing image attributes', async () => {
  const { app, nodes } = createApp({
    async getOutfits() {
      return [{ date: '2026-11-24', items: [{ image_path: 'x" onerror="alert(1)' }] }];
    }
  });
  app.calendarDate = new Date(2026, 10, 1);
  await app.renderCalendar();
  const html = nodes.get('calendarDays').innerHTML;
  assert.ok(html.includes('day-outfit'));
  assert.ok(!html.includes('onerror='));
});

test('monthly report escapes clothing names and date attributes', async () => {
  const { app, nodes } = createApp({
    async getMonthlyReport() {
      return {
        comparedToLastMonth: { outfitDaysChange: 0, totalWornChange: 0, lastOutfitDays: 0, lastTotalWorn: 0 },
        outfitDays: 1, totalWorn: 1, avgCostPerWear: 20,
        newPurchases: { count: 0, totalValue: 0 },
        mostWorn: [{ name: malicious, month_worn: 1 }],
        dailyTrend: [{ date: '2026-11-24" onmouseover="alert(1)', item_count: 1 }]
      };
    }
  });
  await app.renderMonthlyReport();
  assert.ok(nodes.get('monthlyMostWorn').innerHTML.includes('&lt;img'));
  assert.ok(!nodes.get('monthlyMostWorn').innerHTML.includes(malicious));
  assert.ok(nodes.get('dailyTrendChart').innerHTML.includes('&quot;'));
  assert.ok(!nodes.get('dailyTrendChart').innerHTML.includes('" onmouseover="'));
});
