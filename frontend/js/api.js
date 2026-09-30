// API 封装层
const API = {
  base: '/api',

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.base}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || '请求失败');
      return data.data;
    } catch (err) {
      console.error(`[API ${endpoint}]`, err);
      throw err;
    }
  },

  // 衣物
  getClothing(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/clothing${qs ? '?' + qs : ''}`);
  },
  getClothingDetail(id) { return this.request(`/clothing/${id}`); },
  addClothing(data) { return this.request('/clothing', { method: 'POST', body: JSON.stringify(data) }); },
  updateClothing(id, data) { return this.request(`/clothing/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteClothing(id) { return this.request(`/clothing/${id}`, { method: 'DELETE' }); },
  wearClothing(id) { return this.request(`/clothing/${id}/wear`, { method: 'POST' }); },
  washClothing(id) { return this.request(`/clothing/${id}/wash`, { method: 'POST' }); },
  washClothingBatch(ids) { return this.request('/clothing/wash/batch', { method: 'POST', body: JSON.stringify({ ids }) }); },
  getNeedsWash() { return this.request('/clothing/needs-wash/list'); },
  getTags() { return this.request('/clothing/tags/all'); },
  updateClothingStatus(id, status) { return this.request(`/clothing/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },

  // v1.0.8 收藏搭配
  getSavedOutfits() { return this.request('/saved-outfits'); },
  getSavedOutfitDetail(id) { return this.request(`/saved-outfits/${id}`); },
  saveOutfitToCollection(data) { return this.request('/saved-outfits', { method: 'POST', body: JSON.stringify(data) }); },
  updateSavedOutfit(id, data) { return this.request(`/saved-outfits/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteSavedOutfit(id) { return this.request(`/saved-outfits/${id}`, { method: 'DELETE' }); },
  applySavedOutfit(id) { return this.request(`/saved-outfits/${id}/apply`, { method: 'POST' }); },

  // 数据导入
  importData(data) { return this.request('/import', { method: 'POST', body: JSON.stringify(data) }); },

  // 穿搭
  getOutfits(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/outfits${qs ? '?' + qs : ''}`);
  },
  getOutfitByDate(date) { return this.request(`/outfits/date/${date}`); },
  saveOutfit(data) { return this.request('/outfits', { method: 'POST', body: JSON.stringify(data) }); },
  deleteOutfit(id) { return this.request(`/outfits/${id}`, { method: 'DELETE' }); },

  // 统计
  getOverview() { return this.request('/stats/overview'); },
  getCategories() { return this.request('/stats/categories'); },
  getSeasons() { return this.request('/stats/seasons'); },
  getMostWorn(limit = 10) { return this.request(`/stats/most-worn?limit=${limit}`); },
  getBestValue(limit = 10) { return this.request(`/stats/best-value?limit=${limit}`); },
  getUnderutilized() { return this.request('/stats/underutilized'); },
  getMonthlyTrend() { return this.request('/stats/monthly-trend'); },
  getColors() { return this.request('/stats/colors'); },
  getDepreciation() { return this.request('/stats/depreciation'); },
  getMonthlyReport(month) { return this.request(`/stats/monthly-report${month ? '?month=' + month : ''}`); },

  // 购物清单
  getShopping(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/shopping${qs ? '?' + qs : ''}`);
  },
  addShoppingItem(data) { return this.request('/shopping', { method: 'POST', body: JSON.stringify(data) }); },
  updateShoppingItem(id, data) { return this.request(`/shopping/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteShoppingItem(id) { return this.request(`/shopping/${id}`, { method: 'DELETE' }); },
  purchaseShoppingItem(id) { return this.request(`/shopping/${id}/purchase`, { method: 'POST' }); },
  unpurchaseShoppingItem(id) { return this.request(`/shopping/${id}/unpurchase`, { method: 'POST' }); },
  clearPurchased() { return this.request('/shopping/purchased/clear', { method: 'DELETE' }); },

  // v1.0.7 天气联动
  getWeatherRecommend(temp, condition) {
    return this.request(`/weather/recommend?temp=${temp}&condition=${encodeURIComponent(condition || '晴')}`);
  },
  getWeatherCategories() { return this.request('/weather/categories'); },

  // 上传图片（转base64后直接存，简化处理）
  async uploadImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 600;
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } }
          else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};
