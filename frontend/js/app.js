// 电子衣橱 - 主应用逻辑
const App = {
  wardrobe: [],
  outfits: [],
  overview: null,
  currentCategory: '全部',
  currentSeason: '全部',
  currentSort: 'recent',
  currentTag: '',
  currentWashFilter: 'all',
  allTags: [],
  needsWashCount: 0,
  importData: null,
  editingId: null,
  uploadedImage: null,
  selectedOutfitItems: [],
  calendarDate: new Date(),
  generatedOutfit: null,
  currentOutfitDate: null,
  shoppingItems: [],
  shoppingFilter: 'all',
  editingShoppingId: null,
  reportMonth: new Date().toISOString().slice(0, 7),
  weatherTemp: 22,
  weatherCondition: '晴',

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
    this.initTheme();
    this.bindNav();
    this.bindModalClose();
    this.renderCategoryBar();
    await this.loadAll();
    this.registerSW();
  },

  initTheme() {
    try {
      const saved = localStorage.getItem('wardrobe-theme');
      if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    } catch (e) {}
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('wardrobe-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('wardrobe-theme', 'dark');
    }
  },

  // ===== v1.0.2 颜色搭配引擎 =====
  colorMap: {
    '白':'#FFFFFF','白色':'#FFFFFF','米白':'#F5F5DC','奶白':'#FFF8E7',
    '黑':'#000000','黑色':'#000000',
    '灰':'#808080','灰色':'#808080','深灰':'#404040','浅灰':'#C0C0C0',
    '红':'#E74C3C','红色':'#E74C3C','酒红':'#722F37','砖红':'#B22222',
    '蓝':'#3498DB','蓝色':'#3498DB','牛仔蓝':'#4682B4','深蓝':'#1A1A4E','藏青':'#1A1A4E','藏蓝':'#1A1A4E','浅蓝':'#87CEEB','天蓝':'#87CEEB',
    '绿':'#2ECC71','绿色':'#2ECC71','军绿':'#4B5320','墨绿':'#1B4D3E','浅绿':'#90EE90',
    '黄':'#F1C40F','黄色':'#F1C40F','姜黄':'#DAA520','米黄':'#F5DEB3',
    '紫':'#9B59B6','紫色':'#9B59B6','浅紫':'#D8BFD8',
    '粉':'#FFB6C1','粉色':'#FFB6C1','玫红':'#FF007F',
    '棕':'#8B4513','棕色':'#8B4513','咖啡':'#6F4E37','驼色':'#C19A6B','卡其':'#C3B091','卡其色':'#C3B091','米色':'#F5F5DC','米':'#F5F5DC',
    '橙':'#E67E22','橙色':'#E67E22','橘色':'#E67E22',
    '银':'#C0C0C0','银色':'#C0C0C0','金':'#FFD700','金色':'#FFD700'
  },
  neutralColors: new Set(['#FFFFFF','#F5F5DC','#FFF8E7','#000000','#808080','#404040','#C0C0C0','#F5DEB3','#C3B091','#C19A6B']),

  parseColor(colorName) {
    if (!colorName) return null;
    const name = colorName.trim();
    for (const [key, hex] of Object.entries(this.colorMap)) {
      if (name.includes(key)) return hex;
    }
    return null;
  },

  hexToHsl(hex) {
    let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    let h=0,s=0,l=(max+min)/2;
    if(max!==min){const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h*=60;}
    return{h,s,l};
  },

  calcColorHarmony(items) {
    const colors = items.map(i => this.parseColor(i.color)).filter(c => c !== null);
    if (colors.length < 2) return { score: -1, label: '', level: '', colors: colors };
    const nonNeutral = colors.filter(c => !this.neutralColors.has(c));
    if (nonNeutral.length <= 1) return { score: 95, label: '经典百搭 · 中性色组合', level: 'excellent', colors };
    let totalDiff = 0, count = 0;
    for (let i = 0; i < nonNeutral.length; i++) {
      for (let j = i+1; j < nonNeutral.length; j++) {
        const h1 = this.hexToHsl(nonNeutral[i]), h2 = this.hexToHsl(nonNeutral[j]);
        let diff = Math.abs(h1.h - h2.h);
        if (diff > 180) diff = 360 - diff;
        totalDiff += diff; count++;
      }
    }
    const avgDiff = totalDiff / count;
    let score, label, level;
    if (avgDiff >= 150 && avgDiff <= 210) { score = 90; label = '互补色 · 视觉冲击'; level = 'excellent'; }
    else if (avgDiff >= 30 && avgDiff < 150) { score = 75; label = '邻近色 · 和谐自然'; level = 'good'; }
    else if (avgDiff > 210 && avgDiff < 330) { score = 70; label = '对比色 · 个性鲜明'; level = 'good'; }
    else { score = 55; label = '同色系 · 层次不足'; level = 'fair'; }
    return { score, label, level, colors };
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
      const [wardrobe, overview, tags, needsWash] = await Promise.all([
        API.getClothing({ sort: this.currentSort }),
        API.getOverview(),
        API.getTags().catch(() => []),
        API.getNeedsWash().catch(() => ({ data: [], count: 0 }))
      ]);
      this.wardrobe = wardrobe;
      this.overview = overview;
      this.allTags = tags || [];
      this.needsWashCount = needsWash.count || 0;
      this.renderStatsRow();
      this.renderTagFilterBar();
      this.updateWashBadge();
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
    if (view === 'shopping') this.loadShopping();
  },

  // ===== 统计卡片 =====
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

  // ===== 衣橱 =====
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

  setWashFilter(filter) {
    this.currentWashFilter = filter;
    document.querySelectorAll('.wash-chip').forEach(c => c.classList.toggle('active', c.dataset.wash === filter));
    this.renderWardrobe();
  },

  updateWashBadge() {
    const badge = document.getElementById('washCountBadge');
    if (badge && this.needsWashCount > 0) {
      badge.style.display = 'inline';
      badge.textContent = this.needsWashCount + '件';
    } else if (badge) {
      badge.style.display = 'none';
    }
  },

  async markAsWashed(id) {
    try {
      await API.washClothing(id);
      this.showToast('已标记为清洗', 'success');
      await this.loadAll();
    } catch (err) {
      this.showToast('操作失败', 'error');
    }
  },

  async renderWardrobe() {
    const grid = document.getElementById('wardrobeGrid');
    const search = document.getElementById('searchInput').value.toLowerCase();
    let items = this.wardrobe;
    if (this.currentCategory !== '全部') items = items.filter(i => i.category === this.currentCategory);
    if (this.currentSeason !== '全部') items = items.filter(i => i.season === this.currentSeason || i.season === '四季');
    if (this.currentTag) items = items.filter(i => (i.tags || '').split(',').map(t => t.trim()).includes(this.currentTag));
    if (this.currentWashFilter === 'needs') items = items.filter(i => i.needs_wash);
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
          ${item.needs_wash ? `<div class="wash-badge">待清洗</div>` : ''}
          ${item.worn_count > 0 ? `<div class="clothing-value-badge" style="background:${rating.color}">${rating.level}</div>` : ''}
          <div class="clothing-actions">
            ${item.needs_wash ? `<button class="icon-btn" onclick="event.stopPropagation();App.markAsWashed(${item.id})" title="标记已清洗" style="color:var(--danger)">&#129533;</button>` : ''}
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

  // ===== 添加/编辑衣物 =====
  openAddModal() {
    this.editingId = null;
    this.uploadedImage = null;
    document.getElementById('modalTitle').textContent = '添加衣服';
    ['clothingName', 'clothingColor', 'clothingPrice', 'clothingBrand', 'clothingMaterial', 'clothingTags', 'clothingNote', 'clothingWashThreshold'].forEach(id => document.getElementById(id).value = '');
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
    document.getElementById('clothingWashThreshold').value = item.wash_threshold !== undefined ? item.wash_threshold : 3;
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
      wash_threshold: parseInt(document.getElementById('clothingWashThreshold').value) || 3,
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

  // ===== 衣物详情 =====
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
          <div class="detail-item"><div class="detail-item-label">洗衣状态</div><div class="detail-item-value">${item.needs_wash ? '<span class="wash-indicator">待清洗（穿'+item.wash_count+'次）</span>' : '已清洗（穿'+(item.wash_count||0)+'/'+(item.wash_threshold||3)+'次）'}</div></div>
          ${item.last_wash_date ? '<div class="detail-item"><div class="detail-item-label">上次清洗</div><div class="detail-item-value">'+item.last_wash_date+'</div></div>' : ''}
          <div class="detail-item"><div class="detail-item-label">添加时间</div><div class="detail-item-value" style="font-size:12px">${item.created_at}</div></div>
        </div>
        ${item.note ? `<div class="detail-item" style="margin-bottom:16px"><div class="detail-item-label">备注</div><div class="detail-item-value" style="font-size:13px">${item.note}</div></div>` : ''}
        <div class="detail-history"><h4>最近穿着记录</h4>${historyHtml}</div>
      `;
      document.getElementById('detailEditBtn').onclick = () => { this.closeModal('detailModal'); this.editClothing(id); };
      const washBtn = document.getElementById('detailWashBtn');
      if (washBtn) {
        washBtn.style.display = item.needs_wash ? 'inline-flex' : 'none';
        washBtn.onclick = () => { this.markAsWashed(id); this.closeModal('detailModal'); };
      }
      document.getElementById('detailModal').classList.add('show');
    } catch (err) {
      this.showToast('加载详情失败', 'error');
    }
  },

  editFromDetail() {}, // 由 viewClothing 动态绑定

  // ===== 日历 =====
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

  // ===== 穿搭记录 =====
  async openOutfitForDate(dateStr) {
    this.currentOutfitDate = dateStr;
    this.selectedOutfitItems = [];
    document.getElementById('outfitModalTitle').textContent = `记录穿搭 · ${dateStr}`;

    // 加载当天已有穿搭
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

  // ===== 智能搭配（v1.0.7 天气联动） =====
  async generateOutfit() {
    try {
      const result = await API.getWeatherRecommend(this.weatherTemp, this.weatherCondition);
      const rec = result.recommendation;

      if (!rec || rec.items.length === 0) {
        // 衣橱为空时回退到随机搭配
        this.fallbackGenerateOutfit();
        return;
      }

      const slots = rec.items.map(item => ({ category: item.category, item, weatherScore: item.weatherScore }));
      this.generatedOutfit = slots;

      document.getElementById('outfitPreview').innerHTML = slots.map(s =>
        `<div class="outfit-slot"><div class="outfit-slot-img">${s.item.image_path ? `<img src="${s.item.image_path}">` : `<div style="opacity:0.3;width:40px;height:40px">${this.categoryIcons[s.category] || this.categoryIcons['上衣']}</div>`}</div><div class="outfit-slot-label">${s.category} · ${s.item.name}</div>${s.weatherScore ? `<div class="outfit-slot-score">适配 ${s.weatherScore}%</div>` : ''}</div>`
      ).join('');
      document.getElementById('saveOutfitBtn').style.display = 'inline-flex';

      // 天气适配度
      const scoreArea = document.getElementById('weatherScoreArea');
      if (rec.avgScore > 0) {
        document.getElementById('weatherScoreValue').textContent = rec.avgScore + '%';
        const fill = document.getElementById('weatherScoreFill');
        fill.style.width = rec.avgScore + '%';
        fill.style.background = rec.avgScore >= 80 ? 'linear-gradient(90deg,#2D8B4E,#5BA876)' : rec.avgScore >= 60 ? 'linear-gradient(90deg,#D4A84B,#E8C87A)' : 'linear-gradient(90deg,#C45F5F,#D88B7A)';
        scoreArea.style.display = 'block';
      } else {
        scoreArea.style.display = 'none';
      }

      // 穿搭建议
      const tipsArea = document.getElementById('weatherTipsArea');
      if (result.tips && result.tips.length > 0) {
        document.getElementById('weatherTipsList').innerHTML = result.tips.map(t => `<li>${t}</li>`).join('');
        tipsArea.style.display = 'block';
      } else {
        tipsArea.style.display = 'none';
      }

      // 颜色搭配评分
      const harmonyArea = document.getElementById('colorHarmonyArea');
      if (slots.length >= 2) {
        const harmony = this.calcColorHarmony(slots.map(s => s.item));
        if (harmony.score > 0) {
          document.getElementById('colorDots').innerHTML = harmony.colors.map(c => `<div class="color-dot" style="background:${c}"></div>`).join('');
          const el = document.getElementById('colorHarmony');
          el.className = 'color-harmony ' + harmony.level;
          el.textContent = `${harmony.label} · ${harmony.score}分`;
          harmonyArea.style.display = 'block';
        } else {
          harmonyArea.style.display = 'none';
        }
      } else {
        harmonyArea.style.display = 'none';
      }
    } catch (err) {
      console.error('天气推荐失败，使用随机搭配', err);
      this.fallbackGenerateOutfit();
    }
  },

  // 随机搭配回退
  fallbackGenerateOutfit() {
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
    document.getElementById('weatherScoreArea').style.display = 'none';
    document.getElementById('weatherTipsArea').style.display = 'none';

    const harmonyArea = document.getElementById('colorHarmonyArea');
    if (slots.length >= 2) {
      const harmony = this.calcColorHarmony(slots.map(s => s.item));
      if (harmony.score > 0) {
        document.getElementById('colorDots').innerHTML = harmony.colors.map(c => `<div class="color-dot" style="background:${c}"></div>`).join('');
        const el = document.getElementById('colorHarmony');
        el.className = 'color-harmony ' + harmony.level;
        el.textContent = `${harmony.label} · ${harmony.score}分`;
        harmonyArea.style.display = 'block';
      } else {
        harmonyArea.style.display = 'none';
      }
    } else {
      harmonyArea.style.display = 'none';
    }
  },

  // v1.0.7 天气控制
  updateWeatherTempDisplay(temp) {
    this.weatherTemp = parseInt(temp);
    document.getElementById('tempDisplay').textContent = temp + '°C';
    this.updateWeatherTip();
  },

  setWeatherCondition(condition) {
    this.weatherCondition = condition;
    document.querySelectorAll('.weather-btn').forEach(b => b.classList.toggle('active', b.dataset.condition === condition));
    this.updateWeatherTip();
  },

  updateWeatherTip() {
    const temp = this.weatherTemp;
    let label, icon, tip;
    if (temp < 0) { label = '极寒'; icon = '❄️'; tip = '多层穿搭：保暖内衣+毛衣+厚外套'; }
    else if (temp < 10) { label = '寒冷'; icon = '🧥'; tip = '建议穿着保暖外套和厚底鞋'; }
    else if (temp < 18) { label = '凉爽'; icon = '🍂'; tip = '薄外套或卫衣，早晚温差大'; }
    else if (temp < 25) { label = '舒适'; icon = '☀️'; tip = '大多数衣物都适合穿着'; }
    else if (temp < 30) { label = '温暖'; icon = '🌤️'; tip = '选择透气材质，浅色更清爽'; }
    else { label = '炎热'; icon = '🔥'; tip = '棉麻透气材质，注意防晒'; }

    const condTip = { '晴': '阳光充足', '多云': '云层较多', '阴': '阴天', '雨': '有雨，注意防水', '雪': '有雪，注意保暖防滑', '雾': '有雾' };
    document.getElementById('weatherTip').textContent = `${icon} ${label} ${temp}°C · ${condTip[this.weatherCondition] || ''} · ${tip}`;
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

  // ===== 统计页 =====
  async renderStats() {
    this.renderMonthlyReport();
    try {
      const [cats, seasons, mostWorn, bestValue, underutilized, depreciation] = await Promise.all([
        API.getCategories(), API.getSeasons(), API.getMostWorn(10), API.getBestValue(10), API.getUnderutilized(), API.getDepreciation().catch(() => null)
      ]);

      // 分类分布
      const maxCat = Math.max(...cats.map(c => c.count), 1);
      document.getElementById('categoryChart').innerHTML = cats.map(c =>
        `<div class="bar-row"><div class="bar-label">${c.category}</div><div class="bar-track"><div class="bar-fill" style="width:${c.count / maxCat * 100}%">${c.count}</div></div></div>`
      ).join('') || '<p style="color:var(--text-secondary);font-size:13px">暂无数据</p>';

      // 季节分布
      const maxSeason = Math.max(...seasons.map(s => s.count), 1);
      document.getElementById('seasonChart').innerHTML = seasons.map(s =>
        `<div class="bar-row"><div class="bar-label">${s.season}</div><div class="bar-track"><div class="bar-fill accent" style="width:${s.count / maxSeason * 100}%">${s.count}</div></div></div>`
      ).join('') || '<p style="color:var(--text-secondary);font-size:13px">暂无数据</p>';

      // 穿着频率
      const maxWorn = Math.max(...mostWorn.map(i => i.worn_count), 1);
      document.getElementById('wornChart').innerHTML = mostWorn.length > 0
        ? mostWorn.map((item, idx) => `<div class="bar-row"><div class="bar-label wide">${idx + 1}. ${item.name}</div><div class="bar-track"><div class="bar-fill green" style="width:${item.worn_count / maxWorn * 100}%">${item.worn_count}次</div></div></div>`).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">还没有穿搭记录</p>';

      // 性价比
      document.getElementById('valueChart').innerHTML = bestValue.length > 0
        ? bestValue.map((item, idx) => {
            const rating = item.value_rating || { color: '#999' };
            return `<div class="bar-row"><div class="bar-label wide" title="${item.name}">${idx + 1}. ${item.name}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.max(10, 100 - idx * 8)}%;background:${rating.color}">¥${item.cost_per_wear}/次</div></div></div>`;
          }).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">还没有穿着记录</p>';

      // 待提升
      document.getElementById('underutilizedChart').innerHTML = underutilized.length > 0
        ? underutilized.slice(0, 10).map(item =>
            `<div class="bar-row"><div class="bar-label wide" title="${item.name}">${item.name}</div><div class="bar-track"><div class="bar-fill accent" style="width:${Math.min(100, item.worn_count / 5 * 100)}%">穿${item.worn_count}次 · ¥${item.cost_per_wear}/次</div></div></div>`
          ).join('')
        : '<p style="color:var(--text-secondary);font-size:13px">没有待提升的衣物，继续保持！</p>';

      // v1.0.4 折旧分析
      if (depreciation && depreciation.totalItems > 0) {
        const d = depreciation;
        document.getElementById('depreciationSummary').innerHTML =
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">总原值</div><div style="font-size:18px;font-weight:700">¥' + d.totalOriginal + '</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">当前估值</div><div style="font-size:18px;font-weight:700;color:#2D8B4E">¥' + d.totalCurrent + '</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">累计折旧</div><div style="font-size:18px;font-weight:700;color:#C45F5F">¥' + d.totalDepreciated + '</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">平均折旧率</div><div style="font-size:18px;font-weight:700">' + Math.round(d.avgDepreciationRate * 100) + '%</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">保值中</div><div style="font-size:18px;font-weight:700;color:#2D8B4E">' + (d.byStatus['保值中']||0) + '</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">正常使用</div><div style="font-size:18px;font-weight:700;color:#D4A84B">' + (d.byStatus['正常使用']||0) + '</div></div>' +
          '<div style="text-align:center"><div style="font-size:11px;color:var(--text-secondary)">建议淘汰</div><div style="font-size:18px;font-weight:700;color:#C45F5F">' + (d.byStatus['建议淘汰']||0) + '</div></div>';
        document.getElementById('depreciationChart').innerHTML = d.toRetire.length > 0
          ? d.toRetire.map(item => '<div class="bar-row"><div class="bar-label wide" title="' + item.name + '">' + item.name + '</div><div class="bar-track"><div class="bar-fill accent" style="width:' + Math.max(10, (1 - item.depreciationRate) * 100) + '%">估值¥' + item.currentValue + ' · 穿' + item.wornCount + '次</div></div></div>').join('')
          : '<p style="color:var(--text-secondary);font-size:13px">所有衣物状态良好，暂无建议淘汰项</p>';
      } else {
        document.getElementById('depreciationSummary').innerHTML = '<p style="color:var(--text-secondary);font-size:13px">记录衣物价格后可查看折旧分析</p>';
        document.getElementById('depreciationChart').innerHTML = '';
      }
    } catch (err) {
      console.error('统计加载失败', err);
    }
  },

  // ===== v1.0.6 月度穿搭报告 =====
  changeReportMonth(delta) {
    const [y, m] = this.reportMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.reportMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    this.renderMonthlyReport();
  },

  async renderMonthlyReport() {
    const [y, m] = this.reportMonth.split('-').map(Number);
    document.getElementById('reportMonthTitle').textContent = `${y}年${m}月`;
    try {
      const report = await API.getMonthlyReport(this.reportMonth);
      const cmp = report.comparedToLastMonth;
      const daysChange = cmp.outfitDaysChange;
      const wornChange = cmp.totalWornChange;

      document.getElementById('monthlyReportStats').innerHTML =
        '<div class="report-stat"><div class="report-stat-value">' + report.outfitDays + '</div><div class="report-stat-label">穿搭天数</div>' + (cmp.lastOutfitDays > 0 ? '<div class="report-stat-change ' + (daysChange >= 0 ? 'up' : 'down') + '">' + (daysChange >= 0 ? '+' : '') + daysChange + ' 天</div>' : '') + '</div>' +
        '<div class="report-stat"><div class="report-stat-value">' + report.totalWorn + '</div><div class="report-stat-label">总穿次</div>' + (cmp.lastTotalWorn > 0 ? '<div class="report-stat-change ' + (wornChange >= 0 ? 'up' : 'down') + '">' + (wornChange >= 0 ? '+' : '') + wornChange + ' 次</div>' : '') + '</div>' +
        '<div class="report-stat"><div class="report-stat-value">¥' + report.avgCostPerWear + '</div><div class="report-stat-label">平均单次成本</div><div class="report-stat-change">本月穿着衣物价值/穿次</div></div>' +
        '<div class="report-stat"><div class="report-stat-value">' + report.newPurchases.count + '</div><div class="report-stat-label">新购衣物</div><div class="report-stat-change">花费 ¥' + report.newPurchases.totalValue + '</div></div>';

      // 本月最常穿 Top 5
      const mostWornEl = document.getElementById('monthlyMostWorn');
      if (report.mostWorn.length > 0) {
        const maxMonthWorn = Math.max(...report.mostWorn.map(i => i.month_worn), 1);
        mostWornEl.innerHTML = report.mostWorn.map((item, idx) =>
          '<div class="bar-row"><div class="bar-label wide">' + (idx + 1) + '. ' + item.name + '</div><div class="bar-track"><div class="bar-fill green" style="width:' + (item.month_worn / maxMonthWorn * 100) + '%">' + item.month_worn + '次</div></div></div>'
        ).join('');
      } else {
        mostWornEl.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">本月还没有穿搭记录</p>';
      }

      // 每日穿搭趋势
      const trendEl = document.getElementById('dailyTrendChart');
      if (report.dailyTrend.length > 0) {
        const maxItems = Math.max(...report.dailyTrend.map(d => d.item_count), 1);
        trendEl.innerHTML = '<div class="daily-trend-bars">' + report.dailyTrend.map(d => {
          const day = parseInt(d.date.slice(8, 10));
          const height = Math.max(4, d.item_count / maxItems * 100);
          return '<div class="daily-trend-bar" title="' + d.date + ': ' + d.item_count + '件" style="height:' + height + '%"><span class="daily-trend-day">' + day + '</span></div>';
        }).join('') + '</div>';
      } else {
        trendEl.innerHTML = '<p style="color:var(--text-secondary);font-size:13px">本月暂无穿搭趋势数据</p>';
      }
    } catch (err) {
      document.getElementById('monthlyReportStats').innerHTML = '<p style="color:var(--text-secondary);font-size:13px">月度报告加载失败</p>';
      document.getElementById('monthlyMostWorn').innerHTML = '';
      document.getElementById('dailyTrendChart').innerHTML = '';
    }
  },

  // ===== 数据导出 =====
  async exportData() {
    try {
      const [wardrobe, outfits] = await Promise.all([API.getClothing(), API.getOutfits()]);
      const data = { wardrobe, outfits, exportAt: new Date().toISOString(), version: '1.0.7' };
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

  // ===== 数据导入 =====
  openImportModal() {
    this.importData = null;
    document.getElementById('importFileName').textContent = '点击选择备份文件';
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importConfirmBtn').disabled = true;
    document.getElementById('importFileInput').value = '';
    document.querySelector('input[name="importMode"][value="merge"]').checked = true;
    document.getElementById('importModal').classList.add('show');
  },

  handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.wardrobe && !data.outfits) throw new Error('无效的备份文件');
        this.importData = data;
        document.getElementById('importFileName').textContent = file.name;
        const preview = document.getElementById('importPreview');
        preview.style.display = 'block';
        document.getElementById('importPreviewText').textContent =
          `衣物 ${data.wardrobe ? data.wardrobe.length : 0} 件，穿搭记录 ${data.outfits ? data.outfits.length : 0} 条`;
        document.getElementById('importConfirmBtn').disabled = false;
      } catch (err) {
        this.showToast('文件解析失败：' + err.message, 'error');
        input.value = '';
      }
    };
    reader.readAsText(file);
  },

  async confirmImport() {
    if (!this.importData) return;
    const mode = document.querySelector('input[name="importMode"]:checked').value;
    if (mode === 'replace' && !confirm('覆盖模式将删除所有现有数据，确定继续吗？')) return;
    try {
      const result = await API.importData({ ...this.importData, mode });
      this.showToast(`导入成功：衣物 ${result.importedClothing} 件，穿搭 ${result.importedOutfits} 条`, 'success');
      this.closeModal('importModal');
      await this.loadAll();
    } catch (err) {
      this.showToast('导入失败：' + err.message, 'error');
    }
  },

  washFromDetail() {}, // 由 viewClothing 动态绑定

  // ===== v1.0.5 购物清单 =====
  async loadShopping() {
    try {
      const result = await API.getShopping();
      this.shoppingItems = result.data || [];
      this.shoppingSummary = result.summary || { total: 0, pending: 0, purchased: 0, totalBudget: 0, highPriority: 0 };
      this.renderShopping();
    } catch (err) {
      this.showToast('加载购物清单失败', 'error');
    }
  },

  renderShopping() {
    const summary = this.shoppingSummary || { total: 0, pending: 0, purchased: 0, totalBudget: 0, highPriority: 0 };
    document.getElementById('shoppingSummary').innerHTML =
      '<div class="shopping-stat"><span class="shopping-stat-label">待购买</span><span class="shopping-stat-value">' + summary.pending + '</span></div>' +
      '<div class="shopping-stat"><span class="shopping-stat-label">已购买</span><span class="shopping-stat-value">' + summary.purchased + '</span></div>' +
      '<div class="shopping-stat"><span class="shopping-stat-label">预算合计</span><span class="shopping-stat-value">¥' + summary.totalBudget + '</span></div>' +
      (summary.highPriority > 0 ? '<div class="shopping-stat"><span class="shopping-stat-label">高优先级</span><span class="shopping-stat-value" style="color:var(--danger)">' + summary.highPriority + '</span></div>' : '');

    let items = this.shoppingItems;
    if (this.shoppingFilter !== 'all') items = items.filter(i => i.status === this.shoppingFilter);

    const list = document.getElementById('shoppingList');
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-icon" style="width:48px;height:48px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:100%;height:100%"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg></div><div class="empty-title">购物清单是空的</div><div class="empty-desc">点击"添加购物项"开始记录想买的衣服</div></div>';
      return;
    }

    const priorityMap = { high: { label: '高', color: '#C45F5F' }, medium: { label: '中', color: '#D4A84B' }, low: { label: '低', color: '#888' } };
    list.innerHTML = items.map(item => {
      const p = priorityMap[item.priority] || priorityMap.medium;
      const isPurchased = item.status === 'purchased';
      return '<div class="shopping-item ' + (isPurchased ? 'purchased' : '') + '">' +
        '<div class="shopping-item-main">' +
          '<div class="shopping-item-check" onclick="App.' + (isPurchased ? 'unpurchaseShoppingItem' : 'purchaseShoppingItem') + '(' + item.id + ')">' + (isPurchased ? '✓' : '') + '</div>' +
          '<div class="shopping-item-info">' +
            '<div class="shopping-item-name">' + item.name + '</div>' +
            '<div class="shopping-item-meta">' +
              '<span class="meta-tag">' + item.category + '</span>' +
              '<span class="shopping-priority" style="color:' + p.color + '">' + p.label + '优先级</span>' +
              (item.estimated_price > 0 ? '<span>预估 ¥' + item.estimated_price + '</span>' : '') +
              (isPurchased && item.purchased_at ? '<span style="color:var(--text-secondary);font-size:11px">购于 ' + item.purchased_at.slice(0, 10) + '</span>' : '') +
            '</div>' +
            (item.note ? '<div class="shopping-item-note">' + item.note + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="shopping-item-actions">' +
          '<button class="icon-btn" onclick="App.editShoppingItem(' + item.id + ')" title="编辑">&#9998;</button>' +
          '<button class="icon-btn" onclick="App.deleteShoppingItem(' + item.id + ')" title="删除">&#128465;</button>' +
        '</div>' +
      '</div>';
    }).join('');
  },

  openShoppingModal() {
    this.editingShoppingId = null;
    document.getElementById('shoppingModalTitle').textContent = '添加购物项';
    document.getElementById('shoppingName').value = '';
    document.getElementById('shoppingCategory').value = '上衣';
    document.getElementById('shoppingPrice').value = '';
    document.getElementById('shoppingNote').value = '';
    document.querySelector('input[name="shoppingPriority"][value="medium"]').checked = true;
    document.getElementById('shoppingModal').classList.add('show');
  },

  editShoppingItem(id) {
    const item = this.shoppingItems.find(i => i.id === id);
    if (!item) return;
    this.editingShoppingId = id;
    document.getElementById('shoppingModalTitle').textContent = '编辑购物项';
    document.getElementById('shoppingName').value = item.name;
    document.getElementById('shoppingCategory').value = item.category;
    document.getElementById('shoppingPrice').value = item.estimated_price || '';
    document.getElementById('shoppingNote').value = item.note || '';
    const priorityRadio = document.querySelector('input[name="shoppingPriority"][value="' + item.priority + '"]');
    if (priorityRadio) priorityRadio.checked = true;
    document.getElementById('shoppingModal').classList.add('show');
  },

  async saveShoppingItem() {
    const name = document.getElementById('shoppingName').value.trim();
    if (!name) { this.showToast('请输入物品名称', 'error'); return; }
    const priority = document.querySelector('input[name="shoppingPriority"]:checked').value;
    const data = {
      name,
      category: document.getElementById('shoppingCategory').value,
      estimated_price: parseFloat(document.getElementById('shoppingPrice').value) || 0,
      priority,
      note: document.getElementById('shoppingNote').value.trim()
    };
    try {
      if (this.editingShoppingId) {
        await API.updateShoppingItem(this.editingShoppingId, data);
        this.showToast('已更新', 'success');
      } else {
        await API.addShoppingItem(data);
        this.showToast('已添加到购物清单', 'success');
      }
      this.closeModal('shoppingModal');
      await this.loadShopping();
    } catch (err) {
      this.showToast('保存失败：' + err.message, 'error');
    }
  },

  async deleteShoppingItem(id) {
    if (!confirm('确定要删除这个购物项吗？')) return;
    try {
      await API.deleteShoppingItem(id);
      this.showToast('已删除', 'success');
      await this.loadShopping();
    } catch (err) {
      this.showToast('删除失败：' + err.message, 'error');
    }
  },

  async purchaseShoppingItem(id) {
    try {
      await API.purchaseShoppingItem(id);
      this.showToast('已标记为购买', 'success');
      await this.loadShopping();
    } catch (err) {
      this.showToast('操作失败', 'error');
    }
  },

  async unpurchaseShoppingItem(id) {
    try {
      await API.unpurchaseShoppingItem(id);
      this.showToast('已撤销购买', 'success');
      await this.loadShopping();
    } catch (err) {
      this.showToast('操作失败', 'error');
    }
  },

  setShoppingFilter(filter) {
    this.shoppingFilter = filter;
    document.querySelectorAll('.shopping-filter').forEach(c => c.classList.toggle('active', c.dataset.status === filter));
    this.renderShopping();
  },

  async clearPurchasedItems() {
    const purchased = this.shoppingItems.filter(i => i.status === 'purchased');
    if (purchased.length === 0) { this.showToast('没有已购买的项', 'info'); return; }
    if (!confirm('确定要清除所有已购买的项吗？（' + purchased.length + '项）')) return;
    try {
      await API.clearPurchased();
      this.showToast('已清除 ' + purchased.length + ' 项已购买记录', 'success');
      await this.loadShopping();
    } catch (err) {
      this.showToast('清除失败', 'error');
    }
  },

  // ===== 工具 =====
  closeModal(id) { document.getElementById(id).classList.remove('show'); },
  showToast(msg, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
