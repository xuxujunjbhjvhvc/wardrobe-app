const API = {
  base: '/api',
  request: async function(endpoint, options) {
    options = options || {};
    try {
      const res = await fetch(this.base + endpoint, { headers: { 'Content-Type': 'application/json' }, ...options });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'request failed');
      return data.data;
    } catch (err) { console.error('[API]', endpoint, err); throw err; }
  },
  getClothing: function(params) { params = params || {}; const qs = new URLSearchParams(params).toString(); return this.request('/clothing' + (qs ? '?' + qs : '')); },
  getClothingDetail: function(id) { return this.request('/clothing/' + id); },
  addClothing: function(data) { return this.request('/clothing', { method: 'POST', body: JSON.stringify(data) }); },
  updateClothing: function(id, data) { return this.request('/clothing/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
  deleteClothing: function(id) { return this.request('/clothing/' + id, { method: 'DELETE' }); },
  getOutfits: function(params) { params = params || {}; const qs = new URLSearchParams(params).toString(); return this.request('/outfits' + (qs ? '?' + qs : '')); },
  getOutfitByDate: function(date) { return this.request('/outfits/date/' + date); },
  saveOutfit: function(data) { return this.request('/outfits', { method: 'POST', body: JSON.stringify(data) }); },
  deleteOutfit: function(id) { return this.request('/outfits/' + id, { method: 'DELETE' }); },
  getOverview: function() { return this.request('/stats/overview'); },
  getCategories: function() { return this.request('/stats/categories'); },
  getSeasons: function() { return this.request('/stats/seasons'); },
  getMostWorn: function(limit) { return this.request('/stats/most-worn?limit=' + (limit || 10)); },
  getBestValue: function(limit) { return this.request('/stats/best-value?limit=' + (limit || 10)); },
  getUnderutilized: function() { return this.request('/stats/underutilized'); },
  getMonthlyTrend: function() { return this.request('/stats/monthly-trend'); },
  uploadImage: async function(file) {
    return new Promise(function(resolve, reject) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const canvas = document.createElement('canvas');
          const maxSize = 600;
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = h * maxSize / w; w = maxSize; } } else { if (h > maxSize) { w = w * maxSize / h; h = maxSize; } }
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