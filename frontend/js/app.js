// 电子衣橱 - 主应用逻辑
const App = {
  wardrobe: [],
  outfits: [],
  overview: null,
  currentCategory: '全部',
  currentSeason: '全部',
  currentSort: 'recent',
  currentTag: '',
  allTags: [],
  editingId: null,
  uploadedImage: null,
  selectedOutfitItems: [],
  calendarDate: new Date(),
  generatedOutfit: null,
  currentOutfitDate: null,

  categories: ['全部', '上衣', '裤子', '裙子', '鞋子', '外套', '配饰', '包包'],
  seasons: ['全部', '春', '夏', '秋', '冬', '四季'],

  categoryIcons: {
    '上衣': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg>',
    '裤子': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M4 3h16l-2 18H6L4 3z"/><path d="M12 3v18"/></svg>',
    '裙子': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M8 3h8l2 6H6l2-6z"/><path d="M6 9h12l-3 12H9L6 9z"/></svg>',
    '鞋子': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M2 17h20v2a1 1 0 01-1 1H3a1 1 0 01-1-1v-2z"/><path d="M2 17V12l4-2 3 3h6l4-2 3 4v2"/></svg>',
    '外套': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M3 9l4-6h10l4 6v12H3V9z"/><path d="M12 3v18"/></svg>',
    '配饰': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    '包包': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2"/><rect x="4" y="7" width="16" height="14" rx="2"/></svg>'
  },

  async init() {
    this.bindNav();
    this.bindModalClose();
    this.renderCategoryBar();
    await this.loadAll();
    this.registerSW();
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  bindNav() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchView(tab.dataset.view));
    });
  },

  bindModalClose() {
    document.querySelectorAll('.modal-overlay').forEach(o => {
      o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); });
    });
  },

  async loadAll() {
    try {
      const [wardrobe, overview, tags] = await Promise.all([
        API.getClothing({ sort: this.currentSort }),
        API.getOverview(),
        API.getTags().catch(() => [])
      ]);
      this.wardrobe = wardrobe;
      this.overview = overview;
      this.allTags = tags || [];
      this.renderStatsRow();
      this.renderTagFilterBar();
      this.renderWardrobe();
    } catch (err) {
      this.showToast('加载失败：' + err.message, 'error');
    }
  },

  switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    if (view === 'calendar') this.renderCalendar();
    if (view === 'generator') this.generateOutfit();
    if (view === 'stats') this.renderStats();
  },

  renderStatsRow() {
    if (!this.overview) return;
    const o = this.overview;
    const html = `
      <div class="stat-card"><div class="stat-icon brown"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10a2 2 0 002 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z"/></svg></div><div class="stat-info"><div class="stat-label">衣服总数</div><div class="stat-value">${o.total_clothing}</div><div class="stat-sub">总价值 ¥${o.total_value}</div></div></div>
      <div class="stat-card"><div class="stat-icon pink"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><div class="stat-label">穿搭记录</div><div class="stat-value">${o.total_outfits}</div><div class="stat-sub">近7天 ${o.recent_worn} 套</div></div></div>
      <div class="stat-card"><div class="stat-icon green"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg></div><div class="stat-info"><div class="stat-label">累计穿次</div><div class="stat-value">${o.total_worn}</div><div class="stat-sub">近7天新增 ${o.recent_added} 件</div></div></div>
      <div class="stat-card"><div class="stat-icon yellow"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><div class="stat-label">平均单次成本</div><div class="stat-value">¥${o.avg_cost_per_wear}</div><div class="stat-sub">总价值/总穿次</div></div></div>
    `;
    document.getElementById('statsRow').innerHTML = html;
  },

  renderCategoryBar() {
    document.getElementById('categoryBar').innerHTML = this.categories.map(c =>
      `<button class="chip ${this.currentCategory === c ? 'active' : ''}" onclick="App.setCategory('${c}')">${c}</button>`
    ).join('');
    document.getElementById('seasonBar').innerHTML = this.seasons.map(s =>
      `<button class="chip ${this.currentSeason === s ? 'active-sm' : ''}" onclick="App.setSeason('${s}')">${s}</button>`
    ).join('');
  },

  setCategory(c) { this.currentCategory = c; this.renderCategoryBar(); this.renderWardrobe(); },
  setSeason(s) { this.currentSeason = s; this.renderCategoryBar(); this.renderWardrobe(); },
  setSort(sort) {
    this.currentSort = sort;
    document.querySelectorAll('.sort-chip').forEach(c => c.classList.toggle('active', c.dataset.sort === sort));
    this.loadAll();
  },

  renderTagFilterBar() {
    const bar = document.getElementById('tagFilterBar');
    if (!this.allTags || this.allTags.length === 0) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    bar.innerHTML = '<button class="chip tag-chip ' + (this.currentTag === '' ? 'active' : '') + '" onclick="App.setTag(\'\')">全部标签</button>' +
      this.allTags.map(t =>
        '<button class="chip tag-chip ' + (this.currentTag === t.name ? 'active' : '') + '" onclick="App.setTag(\'' + t.name.replace(/'/g, "\\'") + '\')">' + t.name + ' <span style="opacity:.6;font-size:10px">' + t.count + '</span></button>'
      ).join('');
  },

  setTag(tag) { this.currentTag = tag; this.renderTagFilterBar(); this.renderWardrobe(); },

  async renderWardrobe() {
    const grid = document.getElementById('wardrobeGrid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    let items = this.wardrobe;
    if (this.currentCategory !== '全部') items = items.filter(i => i.category === this.currentCategory);
    if (this.currentSeason !== '全部') items = items.filter(i => i.season === this.currentSeason || i.season === '四季');
    if (this.currentTag) items = items.filter(i => (i.tags || '').split(',').map(t => t.trim()).includes(this.currentTag));
    if (search) items = items.filter(i => (i.name || '').toLowerCase().includes(search) || (i.color || '').toLowerCase().includes(search));

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">${this.categoryIcons['上衣']}</div><div class="empty-title">${this.wardrobe.length === 0 ? '衣橱还是空的' : '没有匹配的衣服'}</div><div class="empty-desc">${this.wardrobe.length === 0 ? '点击右上角"添加衣服"开始记录' : '换个筛选条件试试'}</div></div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const rating = item.value_rating || { level: '-', color: '#999' };
      return `
      <div class="clothing-card" onclick="App.viewClothing(${item.id})">
        <div class="clothing-image">
          ${item.image_path ? `<img src="${item.image_path}" alt="${item.name}">` : `<div class="clothing-icon">${this.categoryIcons[item.category] || this.categoryIcons['上衣']}</div>`}
          <div class="clothing-badge">${item.season}</div>
          ${item.worn_count > 0 ? `<div class="clothing-value-badge" style="background:${rating.color}">${rating.level}</div>` : ''}
          <div class="clothing-actions">
            <button class="icon-btn" onclick="event.stopPropagation();App.editClothing(${item.id})" title="编辑">&#9998;</button>
            <button class="icon-btn" onclick="event.stopPropagation();App.deleteClothing(${item.id})" title="删除">&#128465;</button>
          </div>
        </div>
        <div class="clothing-info">
          <div class="clothing-name">${item.name}</div>
          ${item.tags ? `<div class="clothing-tags">${item.tags.split(',').filter(t=>t.trim()).slice(0,3).map(t=>`<span class="clothing-tag">${t.trim()}</span>`).join('')}</div>` : ''}
          <div class="clothing-meta">
            <span class="meta-tag">${item.category}</span>
            ${item.color ? `<span>${item.color}</span>` : ''}
            <span class="meta-worn">已穿 ${item.worn_count || 0} 次</span>
            ${item.worn_count > 0 ? `<span class="meta-cpw">¥${item.cost_per_wear}/次</span>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  },

  openAddModal() {
    this.editingId = null;
    this.uploadedImage = null;
    document.getElementById('modalTitle').textContent = '添加衣服';
    ['clothingName', 'clothingColor', 'clothingPrice', 'clothingBrand', 'clothingMaterial', 'clothingTags', 'clothingNote'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('clothingCategory').value = '上衣';
    document.getElementById('clothingSeason').value = '四季';
    document.getElementById('clothingPurchaseDate').value = '';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('uploadText').textContent = '点击上传衣服照片';
    document.getElementById('addModal').classList.add('show');
  },

  async editClothing(id) {
    const item = this.wardrobe.find(i => i.id === id);
    if (!item) return;
    this.editingId = id;
    this.uploadedImage = item.image_path;
    document.getElementById('modalTitle').textContent = '编辑衣服';
    document.getElementById('clothingName').value = item.name;
    document.getElementById('clothingCategory').value = item.category;
    document.getElementById('clothingSeason').value = item.season;
    document.getElementById('clothingColor').value = item.color || '';
    document.getElementById('clothingPrice').value = item.price || '';
    document.getElementById('clothingBrand').value = item.brand || '';
    document.getElementById('clothingMaterial').value = item.material || '';
    document.getElementById('clothingTags').value = item.tags || '';
    document.getElementById('clothingPurchaseDate').value = item.purchase_date || '';
    document.getElementById('clothingNote').value = item.note || '';
    if (item.image_path) {
      document.getElementById('uploadPreview').src = item.image_path;
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('uploadText').textContent = '重新上传';
    } else {
      document.getElementById('uploadPreview').style.display = 'none';
      document.getElementById('uploadText').textContent = '点击上传衣服照片';
    }
    document.getElementById('addModal').classList.add('show');
  },

  async handleImageUpload(input) {
    const file = input.files[0];
    if (!file) return;
    try {
      this.uploadedImage = await API.uploadImage(file);
      document.getElementById('uploadPreview').src = this.uploadedImage;
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('uploadText').textContent = '重新上传';
    } catch {
      this.showToast('图片处理失败', 'error');
    }
    input.value = '';
  },

  async saveClothing() {
    const name = document.getElementById('clothingName').value.trim();
    if (!name) { this.showToast('请输入衣服名称', 'error'); return; }
    const data = {
      name,
      category: document.getElementById('clothingCategory').value,
      season: document.getElementById('clothingSeason').value,
      color: document.getElementById('clothingColor').value.trim(),
      price: parseFloat(document.getElementById('clothingPrice').value) || 0,
      brand: document.getElementById('clothingBrand').value.trim(),
      material: document.getElementById('clothingMaterial').value.trim(),
      tags: document.getElementById('clothingTags').value.trim(),
      purchase_date: document.getElementById('clothingPurchaseDate').value,
      note: document.getElementById('clothingNote').value.trim(),
      image_path: this.uploadedImage || ''
    };
    try {
      if (this.editingId) {
        await API.updateClothing(this.editingId, data);
        this.showToast('已更新', 'success');
      } else {
        await API.addClothing(data);
        this.showToast('已添加到衣橱', 'success');
      }
      this.closeModal('addModal');
      await this.loadAll();
    } catch (err) {
      this.showToast('保存失败：' + err.message, 'error');
    }
  },

  async deleteClothing(id) {
    if (!confirm('确定要删除这件衣服吗？')) return;
    try {
      await API.deleteClothing(id);
      this.showToast('已删除', 'success');
      await this.loadAll();
    } catch (err) {
      this.showToast('删除失败：' + err.message, 'error');
    }
  },

  async viewClothing(id) {
    try {
      const item = await API.getClothingDetail(id);
      const rating = item.value_rating || { level: '-', color: '#999', score: 0 };
      const stars = '★'.repeat(rating.score) + '☆'.repeat(5 - rating.score);
      const historyHtml = item.wear_history && item.wear_history.length > 0
        ? item.wear_history.slice(0, 10).map(h => `<div class="history-item"><span>${h.date}</span><span>${h.note || '—'}</span></div>`).join('')
        : '<p style="color:var(--text-secondary);font-size:12px">还没有穿着记录</p>';

      document.getElementById('detailBody').innerHTML = `
        ${item.image_path ? `<img src="${item.image_path}" class="detail-image">` : ''}
        <div class="detail-cost-card">
          <div class="detail-cost-label">单次穿着成本</div>
          <div class="detail-cost-value">¥${item.cost_per_wear}</div>
          <div class="detail-cost-sub">${item.price > 0 ? `原价 ¥${item.price} ÷ ${item.worn_count} 次` : '未记录价格'}</div>
          <div class="detail-rating" style="background:${rating.color}">${rating.level} · ${stars}</div>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-item-label">分类</div><div class="detail-item-value">${item.category}</div></div>
          <div class="detail-item"><div class="detail-item-label">季节</div><div class="detail-item-value">${item.season}</div></div>
          <div class="detail-item"><div class="detail-item-label">颜色</div><div class="detail-item-value">${item.color || '—'}</div></div>
          <div class="detail-item"><div class="detail-item-label">品牌</div><div class="detail-item-value">${item.brand || '—'}</div></div>
          <div class="detail-item"><div class="detail-item-label">材质</div><div class="detail-item-value">${item.material || '—'}</div></div>
          <div class="detail-item"><div class="detail-item-label">标签</div><div class="detail-item-value">${item.tags ? item.tags.split(',').filter(t=>t.trim()).map(t=>'<span class="detail-tag">'+t.trim()+'</span>').join('') : '—'}</div></div>
          <div class="detail-item"><div class="detail-item-label">购买日期</div><div class="detail-item-value">${item.purchase_date || '—'}</div></div>
          <div class="detail-item"><div class="detail-item-label">穿着次数</div><div class="detail-item-value">${item.worn_count} 次</div></div>
          <div class="detail-item"><div class="detail-item-label">添加时间</div><div class="detail-item-value" style="font-size:12px">${item.created_at}</div></div>
        </div>
        ${item.note ? `<div class="detail-item" style="margin-bottom:16px"><div class="detail-item-label">备注</div><div class="detail-item-value" style="font-size:13px">${item.note}</div></div>` : ''}
        <div class="detail-history"><h4>最近穿着记录</h4>${historyHtml}</div>
      `;
      document.getElementById('detailEditBtn').onclick = () => { this.closeModal('detailModal'); this.editClothing(id); };
      document.getElementById('detailModal').classList.add('show');
    } catch (err) {
      this.showToast('加载详情失败', 'error');
    }
  },

  editFromDetail() {},

  async renderCalendar() {
    const year = this.calendarDate.getFullYear(), month = this.calendarDate.getMonth();
    document.getElementById('calendarTitle').textContent = `${year}年${month + 1}月`;
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    let outfitsByDate = {};
    try {
      const outfits = await API.getOutfits({ month: monthStr });
      outfits.forEach(o => { outfitsByDate[o.date] = o; });
    } catch {}

    const firstDay = new Date(year, month, 1), lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const today = new Date();
    let html = '';
    for (let i = 0; i < startOffset; i++) html += `<div class="calendar-day other-month"></div>`;
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const outfit = outfitsByDate[dateStr];
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const firstItem = outfit?.items?.[0];
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${outfit ? 'has-outfit' : ''}" onclick="App.openOutfitForDate('${dateStr}')">
        <div class="day-number">${d}</div>
        ${firstItem ? `<div class="day-outfit">${firstItem.image_path ? `<img src="${firstItem.image_path}">` : ''}</div>` : ''}
        ${outfit ? `<div class="day-outfit-count">${outfit.items.length}件</div>` : ''}
      </div>`;
    }
    document.getElementById('calendarDays').innerHTML = html;
  },

  changeMonth(delta) {
    if (delta === 0) this.calendarDate = new Date();
    else this.calendarDate.setMonth(this.calendarDate.getMonth() + delta);
    this.renderCalendar();
  },

  async openOutfitForDate(dateStr) {
    this.currentOutfitDate = dateStr;
    this.selectedOutfitItems = [];
    document.getElementById('outfitModalTitle').textContent = `记录穿搭 · ${dateStr}`;

    try {
      const existing = await API.getOutfitByDate(dateStr);
      if (existing) this.selectedOutfitItems = existing.items.map(i => i.id);
    } catch {}

    const list = document.getElementById('outfitSelectList');
    list.innerHTML = this.wardrobe.map(item => `
      <div class="outfit-select-item ${this.selectedOutfitItems.includes(item.id) ? 'selected' : ''}" onclick="App.toggleOutfitItem(${item.id},this)">
        <div class="item-img">${item.image_path ? `<img src="${item.image_path}">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;opacity:0.3">${this.categoryIcons[item.category] || this.categoryIcons['上衣']}</div>`}</div>
        <div class="item-name">${item.name}</div>
      </div>`).join('');
    document.getElementById('outfitModal').classList.add('show');
  },

  toggleOutfitItem(id, el) {
    const idx = this.selectedOutfitItems.indexOf(id);
    if (idx > -1) { this.selectedOutfitItems.splice(idx, 1); el.classList.remove('selected'); }
    else { this.selectedOutfitItems.push(id); el.classList.add('selected'); }
  },

  async saveOutfit() {
    if (this.selectedOutfitItems.length === 0) { this.showToast('请至少选择一件衣服', 'error'); return; }
    try {
      await API.saveOutfit({
        date: this.currentOutfitDate,
        items: this.selectedOutfitItems,
        note: document.getElementById('outfitNote').value.trim(),
        weather: document.getElementById('outfitWeather').value
      });
      this.showToast('穿搭已记录', 'success');
      this.closeModal('outfitModal');
      await this.loadAll();
      this.renderCalendar();
    } catch (err) {
      this.showToast('保存失败：' + err.message, 'error');
    }
  },

  generateOutfit() {
    const needCategories = ['上衣', '裤子', '鞋子'];
    const slots = [];
    needCategories.forEach(cat => {
      const pool = this.wardrobe.filter(i => i.category === cat);
      if (pool.length > 0) slots.push({ category: cat, item: pool[Math.floor(Math.random() * pool.length)] });
    });
    const accPool = this.wardrobe.filter(i => i.category === '配饰' || i.category === '包包');
    if (accPool.length > 0 && Math.random() > 0.5) slots.push({ category: '配饰', item: accPool[Math.floor(Math.random() * accPool.length)] });
    this.generatedOutfit = slots;

    document.getElementById('outfitPreview').innerHTML = slots.length > 0
      ? slots.map(s => `<div class="outfit-slot"><div class="outfit-slot-img">${s.item.image_path ? `<img src="${s.item.image_path}">` : `<div style="opacity:0.3;width:40px;height:40px">${this.categoryIcons[s.category] || this.categoryIcons['上衣']}</div>`}</div><div class="outfit-slot-label">${s.category} · ${s.item.name}</div></div>`).join('')
      : '<p style="color:var(--text-secondary)">先添加一些衣服再来搭配吧</p>';
    document.getElementById('saveOutfitBtn').style.display = slots.length > 0 ? 'inline-flex' : 'none';
  },

  async saveGeneratedOutfit() {
    if (!this.generatedOutfit || this.generatedOutfit.length === 0) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    try {
      await API.saveOutfit({ date: dateStr, items: this.generatedOutfit.map(s => s.item.id) });
      this.showToast('穿搭已记录', 'success');
      await this.loadAll();
    } catch (err) {
      this.showToast('保存失败：' + err.message, 'error');
    }
  },

  async renderStats() {
    try {
      const [cats, seasons, mostWorn, bestValue, underutilized] = await Promise.all([
        API.getCategories(), API.getSeasons(), API.getMostWorn(10), API.getBestValue(10), API.getUnderutilized()
      ]);

      const maxCat = Math.max(...cats.map(c => c.count), 1);
      document.getElementById('categoryChart').innerHTML = cats.map(c =>
        `<div class="bar-row"><div class="bar-label">${c.category}</div><div class="bar-track"><div class="bar-fill" style="width:${c.count / maxCat * 100}%">${c.count}</div></div></div>`
      ).join('') || '<p style="color:var(--text-secondary);font-size:13px">暂无数据</p>';

      const maxSeason = Math.max(...seasons.map(s => s.count), 1);
      document.getElementById('seasonChart').innerHTML = seasons.map(s =>
        `<div class="bar-row"><div class="bar-label">${s.season}</div><div class="bar-track"><div class="bar-fill accent" style="width:${s.count / maxSeason * 100}%">${s.count}</div></div></div>`
      ).join('') || '<p style="color:var(--text-secondary);font-size:13px">暂无数据</p>';

      const maxWorn = Math.max(...mostWorn.map(i => i.worn_count), 1);
      document.getElementById('wornChart').innerHTML = mostWorn.length > 0
        ? mostWorn.map((item, idx) => `<div class="bar-row"><div class="bar-label wide">${idx + 1}. ${item.name}</div><div class="bar-track"><div class="bar-fill green" style="width:${item.worn_count / maxWorn * 100}%">${item.worn_count}次</div></div></div>`).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">还没有穿搭记录</p>';

      document.getElementById('valueChart').innerHTML = bestValue.length > 0
        ? bestValue.map((item, idx) => {
            const rating = item.value_rating || { color: '#999' };
            return `<div class="bar-row"><div class="bar-label wide" title="${item.name}">${idx + 1}. ${item.name}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(10, 100 - idx * 8)}%;background:${rating.color}">¥${item.cost_per_wear}/次</div></div></div>`;
          }).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">还没有穿着记录</p>';

      document.getElementById('underutilizedChart').innerHTML = underutilized.length > 0
        ? underutilized.slice(0, 10).map(item =>
            `<div class="bar-row"><div class="bar-label wide" title="${item.name}">${item.name}</div><div class="bar-track"><div class="bar-fill accent" style="width:${Math.min(100, item.worn_count / 5 * 100)}%">穿${item.worn_count}次 · ¥${item.cost_per_wear}/次</div></div></div>`
          ).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">没有待提升的衣物，继续保持！</p>';
    } catch (err) {
      console.error('统计加载失败', err);
    }
  },

  async exportData() {
    try {
      const [wardrobe, outfits] = await Promise.all([API.getClothing(), API.getOutfits()]);
      const data = { wardrobe, outfits, exportAt: new Date().toISOString(), version: '1.0.1' };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `我的衣橱_备份_${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
      this.showToast('数据已导出', 'success');
    } catch (err) {
      this.showToast('导出失败', 'error');
    }
  },

  closeModal(id) { document.getElementById(id).classList.remove('show'); },
  showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
