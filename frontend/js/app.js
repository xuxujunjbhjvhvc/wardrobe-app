const App = {
  wardrobe: [], overview: null, currentCategory: '全部', currentSeason: '全部',
  editingId: null, uploadedImage: null, selectedOutfitItems: [],
  calendarDate: new Date(), generatedOutfit: null, currentOutfitDate: null,
  categories: ['全部','上衣','裤子','裙子','鞋子','外套','配饰','包包'],
  seasons: ['全部','春','夏','秋','冬','四季'],

  init: function() {
    this.bindNav();
    this.bindModalClose();
    this.renderCategoryBar();
    this.loadAll();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function(){});
  },

  bindNav: function() {
    var self = this;
    document.querySelectorAll('.nav-tab').forEach(function(tab) {
      tab.addEventListener('click', function() { self.switchView(tab.dataset.view); });
    });
  },

  bindModalClose: function() {
    document.querySelectorAll('.modal-overlay').forEach(function(o) {
      o.addEventListener('click', function(e) { if (e.target === o) o.classList.remove('show'); });
    });
  },

  loadAll: async function() {
    try {
      var self = this;
      var results = await Promise.all([API.getClothing(), API.getOverview()]);
      self.wardrobe = results[0];
      self.overview = results[1];
      self.renderStatsRow();
      self.renderWardrobe();
    } catch (err) { this.showToast('加载失败: ' + err.message, 'error'); }
  },

  switchView: function(view) {
    document.querySelectorAll('.view').forEach(function(v) { v.classList.remove('active'); });
    document.querySelectorAll('.nav-tab').forEach(function(t) { t.classList.remove('active'); });
    document.getElementById('view-' + view).classList.add('active');
    document.querySelector('[data-view="' + view + '"]').classList.add('active');
    if (view === 'calendar') this.renderCalendar();
    if (view === 'generator') this.generateOutfit();
    if (view === 'stats') this.renderStats();
  },

  renderStatsRow: function() {
    if (!this.overview) return;
    var o = this.overview;
    document.getElementById('statsRow').innerHTML =
      '<div class="stat-card"><div class="stat-icon brown">👔</div><div class="stat-info"><div class="stat-label">衣服总数</div><div class="stat-value">' + o.total_clothing + '</div><div class="stat-sub">总价值 ¥' + o.total_value + '</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon pink">📅</div><div class="stat-info"><div class="stat-label">穿搭记录</div><div class="stat-value">' + o.total_outfits + '</div><div class="stat-sub">近7天 ' + o.recent_worn + ' 套</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon green">❤️</div><div class="stat-info"><div class="stat-label">累计穿次</div><div class="stat-value">' + o.total_worn + '</div><div class="stat-sub">近7天新增 ' + o.recent_added + ' 件</div></div></div>' +
      '<div class="stat-card"><div class="stat-icon yellow">💰</div><div class="stat-info"><div class="stat-label">平均单次成本</div><div class="stat-value">¥' + o.avg_cost_per_wear + '</div><div class="stat-sub">总价值/总穿次</div></div></div>';
  },

  renderCategoryBar: function() {
    var self = this;
    document.getElementById('categoryBar').innerHTML = this.categories.map(function(c) {
      return '<button class="chip ' + (self.currentCategory === c ? 'active' : '') + '" onclick="App.setCategory(\'' + c + '\')">' + c + '</button>';
    }).join('');
    document.getElementById('seasonBar').innerHTML = this.seasons.map(function(s) {
      return '<button class="chip ' + (self.currentSeason === s ? 'active-sm' : '') + '" onclick="App.setSeason(\'' + s + '\')">' + s + '</button>';
    }).join('');
  },

  setCategory: function(c) { this.currentCategory = c; this.renderCategoryBar(); this.renderWardrobe(); },
  setSeason: function(s) { this.currentSeason = s; this.renderCategoryBar(); this.renderWardrobe(); },

  renderWardrobe: function() {
    var grid = document.getElementById('wardrobeGrid');
    var search = document.getElementById('searchInput').value.toLowerCase();
    var items = this.wardrobe;
    if (this.currentCategory !== '全部') items = items.filter(function(i) { return i.category === this.currentCategory; }, this);
    if (this.currentSeason !== '全部') items = items.filter(function(i) { return i.season === this.currentSeason || i.season === '四季'; }, this);
    if (search) items = items.filter(function(i) { return (i.name || '').toLowerCase().indexOf(search) > -1 || (i.color || '').toLowerCase().indexOf(search) > -1; });
    if (items.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-title">' + (this.wardrobe.length === 0 ? '衣橱还是空的' : '没有匹配的衣服') + '</div><div class="empty-desc">' + (this.wardrobe.length === 0 ? '点击右上角添加衣服开始记录' : '换个筛选条件试试') + '</div></div>';
      return;
    }
    grid.innerHTML = items.map(function(item) {
      var rating = item.value_rating || { level: '', color: '#999' };
      return '<div class="clothing-card" onclick="App.viewClothing(' + item.id + ')">' +
        '<div class="clothing-image">' + (item.image_path ? '<img src="' + item.image_path + '">' : '<div style="font-size:48px;opacity:.25">👔</div>') +
        '<div class="clothing-badge">' + item.season + '</div>' +
        (item.worn_count > 0 ? '<div class="clothing-value-badge" style="background:' + rating.color + '">' + rating.level + '</div>' : '') +
        '<div class="clothing-actions"><button class="icon-btn" onclick="event.stopPropagation();App.editClothing(' + item.id + ')">✏️</button>' +
        '<button class="icon-btn" onclick="event.stopPropagation();App.deleteClothing(' + item.id + ')">🗑️</button></div></div>' +
        '<div class="clothing-info"><div class="clothing-name">' + item.name + '</div>' +
        '<div class="clothing-meta"><span class="meta-tag">' + item.category + '</span>' + (item.color ? '<span>' + item.color + '</span>' : '') +
        '<span class="meta-worn">已穿 ' + (item.worn_count || 0) + ' 次</span>' + (item.worn_count > 0 ? '<span class="meta-cpw">¥' + item.cost_per_wear + '/次</span>' : '') + '</div></div></div>';
    }).join('');
  },

  openAddModal: function() {
    this.editingId = null; this.uploadedImage = null;
    document.getElementById('modalTitle').textContent = '添加衣服';
    ['clothingName','clothingColor','clothingPrice','clothingBrand','clothingNote'].forEach(function(id) { document.getElementById(id).value = ''; });
    document.getElementById('clothingCategory').value = '上衣';
    document.getElementById('clothingSeason').value = '四季';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('addModal').classList.add('show');
  },

  editClothing: function(id) {
    var item = this.wardrobe.find(function(i) { return i.id === id; });
    if (!item) return;
    this.editingId = id; this.uploadedImage = item.image_path;
    document.getElementById('modalTitle').textContent = '编辑衣服';
    document.getElementById('clothingName').value = item.name;
    document.getElementById('clothingCategory').value = item.category;
    document.getElementById('clothingSeason').value = item.season;
    document.getElementById('clothingColor').value = item.color || '';
    document.getElementById('clothingPrice').value = item.price || '';
    document.getElementById('clothingBrand').value = item.brand || '';
    document.getElementById('clothingNote').value = item.note || '';
    if (item.image_path) { document.getElementById('uploadPreview').src = item.image_path; document.getElementById('uploadPreview').style.display = 'block'; }
    document.getElementById('addModal').classList.add('show');
  },

  handleImageUpload: async function(input) {
    var file = input.files[0]; if (!file) return;
    try {
      this.uploadedImage = await API.uploadImage(file);
      document.getElementById('uploadPreview').src = this.uploadedImage;
      document.getElementById('uploadPreview').style.display = 'block';
    } catch (e) { this.showToast('图片处理失败', 'error'); }
    input.value = '';
  },

  saveClothing: async function() {
    var name = document.getElementById('clothingName').value.trim();
    if (!name) { this.showToast('请输入衣服名称', 'error'); return; }
    var data = {
      name: name, category: document.getElementById('clothingCategory').value,
      season: document.getElementById('clothingSeason').value,
      color: document.getElementById('clothingColor').value.trim(),
      price: parseFloat(document.getElementById('clothingPrice').value) || 0,
      brand: document.getElementById('clothingBrand').value.trim(),
      note: document.getElementById('clothingNote').value.trim(),
      image_path: this.uploadedImage || ''
    };
    try {
      if (this.editingId) { await API.updateClothing(this.editingId, data); this.showToast('已更新', 'success'); }
      else { await API.addClothing(data); this.showToast('已添加到衣橱', 'success'); }
      this.closeModal('addModal'); await this.loadAll();
    } catch (err) { this.showToast('保存失败: ' + err.message, 'error'); }
  },

  deleteClothing: async function(id) {
    if (!confirm('确定要删除这件衣服吗？')) return;
    try { await API.deleteClothing(id); this.showToast('已删除', 'success'); await this.loadAll(); }
    catch (err) { this.showToast('删除失败', 'error'); }
  },

  viewClothing: async function(id) {
    try {
      var item = await API.getClothingDetail(id);
      var rating = item.value_rating || { level: '-', color: '#999', score: 0 };
      var stars = '★'.repeat(rating.score) + '☆'.repeat(5 - rating.score);
      var historyHtml = item.wear_history && item.wear_history.length > 0
        ? item.wear_history.slice(0, 10).map(function(h) { return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:12px"><span>' + h.date + '</span><span>' + (h.note || '-') + '</span></div>'; }).join('')
        : '<p style="color:#999;font-size:12px">还没有穿着记录</p>';
      document.getElementById('detailBody').innerHTML =
        (item.image_path ? '<img src="' + item.image_path + '" class="detail-image">' : '') +
        '<div class="detail-cost-card"><div class="detail-cost-label">单次穿着成本</div>' +
        '<div class="detail-cost-value">¥' + item.cost_per_wear + '</div>' +
        '<div class="detail-cost-sub">原价 ¥' + item.price + ' ÷ ' + item.worn_count + ' 次</div>' +
        '<div class="detail-rating" style="background:' + rating.color + '">' + rating.level + ' ' + stars + '</div></div>' +
        '<div class="detail-grid">' +
        '<div class="detail-item"><div class="detail-item-label">分类</div><div class="detail-item-value">' + item.category + '</div></div>' +
        '<div class="detail-item"><div class="detail-item-label">季节</div><div class="detail-item-value">' + item.season + '</div></div>' +
        '<div class="detail-item"><div class="detail-item-label">颜色</div><div class="detail-item-value">' + (item.color || '-') + '</div></div>' +
        '<div class="detail-item"><div class="detail-item-label">品牌</div><div class="detail-item-value">' + (item.brand || '-') + '</div></div>' +
        '<div class="detail-item"><div class="detail-item-label">穿着次数</div><div class="detail-item-value">' + item.worn_count + ' 次</div></div>' +
        '<div class="detail-item"><div class="detail-item-label">添加时间</div><div class="detail-item-value" style="font-size:12px">' + item.created_at + '</div></div></div>' +
        (item.note ? '<div class="detail-item" style="margin-bottom:16px"><div class="detail-item-label">备注</div><div class="detail-item-value" style="font-size:13px">' + item.note + '</div></div>' : '') +
        '<div style="margin-top:16px"><h4 style="font-size:13px;margin-bottom:8px;color:#666">最近穿着记录</h4>' + historyHtml + '</div>';
      document.getElementById('detailEditBtn').onclick = (function(self, cid) { return function() { self.closeModal('detailModal'); self.editClothing(cid); }; })(this, id);
      document.getElementById('detailModal').classList.add('show');
    } catch (err) { this.showToast('加载详情失败', 'error'); }
  },

  renderCalendar: async function() {
    var year = this.calendarDate.getFullYear(), month = this.calendarDate.getMonth();
    document.getElementById('calendarTitle').textContent = year + '年' + (month + 1) + '月';
    var monthStr = year + '-' + String(month + 1).padStart(2, '0');
    var outfitsByDate = {};
    try {
      var outfits = await API.getOutfits({ month: monthStr });
      outfits.forEach(function(o) { outfitsByDate[o.date] = o; });
    } catch (e) {}
    var firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    var startOffset = (firstDay.getDay() + 6) % 7;
    var today = new Date();
    var html = '';
    for (var i = 0; i < startOffset; i++) html += '<div class="calendar-day other-month"></div>';
    for (var d = 1; d <= lastDay.getDate(); d++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var outfit = outfitsByDate[dateStr];
      var isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      var firstItem = outfit && outfit.items ? outfit.items[0] : null;
      html += '<div class="calendar-day ' + (isToday ? 'today' : '') + (outfit ? ' has-outfit' : '') + '" onclick="App.openOutfitForDate(\'' + dateStr + '\')">' +
        '<div class="day-number">' + d + '</div>' +
        (firstItem ? '<div class="day-outfit">' + (firstItem.image_path ? '<img src="' + firstItem.image_path + '">' : '') + '</div>' : '') +
        (outfit ? '<div style="font-size:9px;color:#999;position:absolute;bottom:4px;right:6px">' + outfit.items.length + '件</div>' : '') + '</div>';
    }
    document.getElementById('calendarDays').innerHTML = html;
  },

  changeMonth: function(delta) {
    if (delta === 0) this.calendarDate = new Date();
    else this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
    this.renderCalendar();
  },

  openOutfitForDate: async function(dateStr) {
    this.currentOutfitDate = dateStr;
    this.selectedOutfitItems = [];
    document.getElementById('outfitModalTitle').textContent = '记录穿搭 · ' + dateStr;
    try {
      var existing = await API.getOutfitByDate(dateStr);
      if (existing) this.selectedOutfitItems = existing.items.map(function(i) { return i.id; });
    } catch (e) {}
    var self = this;
    document.getElementById('outfitSelectList').innerHTML = this.wardrobe.map(function(item) {
      var selected = self.selectedOutfitItems.indexOf(item.id) > -1;
      return '<div class="outfit-select-item ' + (selected ? 'selected' : '') + '" onclick="App.toggleOutfitItem(' + item.id + ',this)">' +
        '<div class="item-img">' + (item.image_path ? '<img src="' + item.image_path + '">' : '<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:.3;font-size:32px">👔</div>') + '</div>' +
        '<div class="item-name">' + item.name + '</div></div>';
    }).join('');
    document.getElementById('outfitModal').classList.add('show');
  },

  toggleOutfitItem: function(id, el) {
    var idx = this.selectedOutfitItems.indexOf(id);
    if (idx > -1) { this.selectedOutfitItems.splice(idx, 1); el.classList.remove('selected'); }
    else { this.selectedOutfitItems.push(id); el.classList.add('selected'); }
  },

  saveOutfit: async function() {
    if (this.selectedOutfitItems.length === 0) { this.showToast('请至少选择一件衣服', 'error'); return; }
    try {
      await API.saveOutfit({
        date: this.currentOutfitDate, items: this.selectedOutfitItems,
        note: document.getElementById('outfitNote').value.trim(),
        weather: document.getElementById('outfitWeather').value
      });
      this.showToast('穿搭已记录', 'success');
      this.closeModal('outfitModal'); await this.loadAll(); this.renderCalendar();
    } catch (err) { this.showToast('保存失败: ' + err.message, 'error'); }
  },

  generateOutfit: function() {
    var needCategories = ['上衣', '裤子', '鞋子'];
    var slots = [];
    var self = this;
    needCategories.forEach(function(cat) {
      var pool = self.wardrobe.filter(function(i) { return i.category === cat; });
      if (pool.length > 0) slots.push({ category: cat, item: pool[Math.floor(Math.random() * pool.length)] });
    });
    var accPool = this.wardrobe.filter(function(i) { return i.category === '配饰' || i.category === '包包'; });
    if (accPool.length > 0 && Math.random() > 0.5) slots.push({ category: '配饰', item: accPool[Math.floor(Math.random() * accPool.length)] });
    this.generatedOutfit = slots;
    document.getElementById('outfitPreview').innerHTML = slots.length > 0
      ? slots.map(function(s) { return '<div class="outfit-slot"><div class="outfit-slot-img">' + (s.item.image_path ? '<img src="' + s.item.image_path + '">' : '<div style="opacity:.3;font-size:32px">👔</div>') + '</div><div class="outfit-slot-label">' + s.category + ' · ' + s.item.name + '</div></div>'; }).join('')
      : '<p style="color:#999">先添加一些衣服再来搭配吧</p>';
    document.getElementById('saveOutfitBtn').style.display = slots.length > 0 ? 'inline-flex' : 'none';
  },

  saveGeneratedOutfit: async function() {
    if (!this.generatedOutfit || this.generatedOutfit.length === 0) return;
    var today = new Date();
    var dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    try {
      await API.saveOutfit({ date: dateStr, items: this.generatedOutfit.map(function(s) { return s.item.id; }) });
      this.showToast('穿搭已记录', 'success'); await this.loadAll();
    } catch (err) { this.showToast('保存失败: ' + err.message, 'error'); }
  },

  renderStats: async function() {
    try {
      var results = await Promise.all([API.getCategories(), API.getSeasons(), API.getMostWorn(10), API.getBestValue(10), API.getUnderutilized()]);
      var cats = results[0], seasons = results[1], mostWorn = results[2], bestValue = results[3], underutilized = results[4];
      var maxCat = Math.max.apply(null, cats.map(function(c) { return c.count; }).concat([1]));
      document.getElementById('categoryChart').innerHTML = cats.map(function(c) { return '<div class="bar-row"><div class="bar-label">' + c.category + '</div><div class="bar-track"><div class="bar-fill" style="width:' + (c.count / maxCat * 100) + '%">' + c.count + '</div></div></div>'; }).join('') || '<p style="color:#999;font-size:13px">暂无数据</p>';
      var maxSeason = Math.max.apply(null, seasons.map(function(s) { return s.count; }).concat([1]));
      document.getElementById('seasonChart').innerHTML = seasons.map(function(s) { return '<div class="bar-row"><div class="bar-label">' + s.season + '</div><div class="bar-track"><div class="bar-fill accent" style="width:' + (s.count / maxSeason * 100) + '%">' + s.count + '</div></div></div>'; }).join('') || '<p style="color:#999;font-size:13px">暂无数据</p>';
      var maxWornVal = Math.max.apply(null, mostWorn.map(function(i) { return i.worn_count; }).concat([1]));
      document.getElementById('wornChart').innerHTML = mostWorn.length > 0
        ? mostWorn.map(function(item, idx) { return '<div class="bar-row"><div class="bar-label wide">' + (idx + 1) + '. ' + item.name + '</div><div class="bar-track"><div class="bar-fill green" style="width:' + (item.worn_count / maxWornVal * 100) + '%">' + item.worn_count + '次</div></div></div>'; }).join('')
        : '<p style="color:#999;font-size:13px">还没有穿搭记录</p>';
      document.getElementById('valueChart').innerHTML = bestValue.length > 0
        ? bestValue.map(function(item, idx) { var rating = item.value_rating || { color: '#999' }; return '<div class="bar-row"><div class="bar-label wide" title="' + item.name + '">' + (idx + 1) + '. ' + item.name + '</div><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(10, 100 - idx * 8) + '%;background:' + rating.color + '">¥' + item.cost_per_wear + '/次</div></div></div>'; }).join('')
        : '<p style="color:#999;font-size:13px">还没有穿着记录</p>';
      document.getElementById('underutilizedChart').innerHTML = underutilized.length > 0
        ? underutilized.slice(0, 10).map(function(item) { return '<div class="bar-row"><div class="bar-label wide" title="' + item.name + '">' + item.name + '</div><div class="bar-track"><div class="bar-fill accent" style="width:' + Math.min(100, item.worn_count / 5 * 100) + '%">穿' + item.worn_count + '次 · ¥' + item.cost_per_wear + '/次</div></div></div>'; }).join('')
        : '<p style="color:#999;font-size:13px">没有待提升的衣物，继续保持！</p>';
    } catch (err) { console.error('stats error', err); }
  },

  exportData: async function() {
    try {
      var results = await Promise.all([API.getClothing(), API.getOutfits()]);
      var data = { wardrobe: results[0], outfits: results[1], exportAt: new Date().toISOString(), version: '1.0.0' };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'wardrobe_backup_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click(); URL.revokeObjectURL(url);
      this.showToast('数据已导出', 'success');
    } catch (err) { this.showToast('导出失败', 'error'); }
  },

  closeModal: function(id) { document.getElementById(id).classList.remove('show'); },
  showToast: function(msg, type) {
    var toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + (type || '');
    setTimeout(function() { toast.classList.remove('show'); }, 2500);
  }
};

document.addEventListener('DOMContentLoaded', function() { App.init(); });