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

  getOutfits(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/outfits${qs ? '?' + qs : ''}`);
  },
  getOutfitByDate(date) { return this.request(`/outfits/date/${date}`); },
  saveOutfit(data) { return this.request('/outfits', { method: 'POST', body: JSON.stringify(data) }); },
  deleteOutfit(id) { return this.request(`/outfits/${id}`, { method: 'DELETE' }); },

  getOverview() { return this.request('/stats/overview'); },
  getCategories() { return this.request('/stats/categories'); },
  getSeasons() { return this.request('/stats/seasons'); },
  getMostWorn(limit = 10) { return this.request(`/stats/most-worn?limit=${limit}`); },
  getBestValue(limit = 10) { return this.request(`/stats/best-value?limit=${limit}`); },
  getUnderutilized() { return this.request('/stats/underutilized'); },
  getMonthlyTrend() { return this.request('/stats/monthly-trend'); },
  getColors() { return this.request('/stats/colors'); },

  importData(data) { return this.request('/import', { method: 'POST', body: JSON.stringify(data) }); },

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
