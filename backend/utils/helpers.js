// 计算单次穿着成本（性价比）
function calcCostPerWear(price, wornCount) {
  if (!wornCount || wornCount <= 0) return price || 0;
  return Math.round((price / wornCount) * 100) / 100;
}

// 性价比评级
function calcValueRating(costPerWear) {
  if (costPerWear <= 5) return { level: '极佳', color: '#2D8B4E', score: 5 };
  if (costPerWear <= 15) return { level: '优秀', color: '#5BA876', score: 4 };
  if (costPerWear <= 30) return { level: '良好', color: '#D4A84B', score: 3 };
  if (costPerWear <= 60) return { level: '一般', color: '#C4705F', score: 2 };
  return { level: '待提升', color: '#A85D4E', score: 1 };
}

// 格式化日期 YYYY-MM-DD
function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取今天日期字符串
function today() {
  return formatDate(new Date());
}

// ===== v1.0.4 折旧计算引擎 =====
const materialDepreciationRate = {
  '真皮': 0.012, '皮革': 0.012, '羊毛': 0.015, '羊绒': 0.015,
  '棉': 0.02, '麻': 0.02, '牛仔': 0.018, '帆布': 0.02,
  '涤纶': 0.025, '化纤': 0.025, '尼龙': 0.025, '腈纶': 0.025,
  '丝绸': 0.022, '真丝': 0.022
};

function getMaterialRate(material) {
  if (!material) return 0.02;
  for (const [key, rate] of Object.entries(materialDepreciationRate)) {
    if (material.includes(key)) return rate;
  }
  return 0.02;
}

function calcDepreciation(item) {
  const price = item.price || 0;
  if (price <= 0) {
    return { currentValue: 0, depreciationRate: 0, monthsUsed: 0, status: '未估价', statusColor: '#999', suggestion: '记录价格后可计算折旧' };
  }
  const purchaseDate = item.purchase_date ? new Date(item.purchase_date) : null;
  const now = new Date();
  let monthsUsed = 0;
  if (purchaseDate && purchaseDate < now) {
    monthsUsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    if (now.getDate() < purchaseDate.getDate()) monthsUsed--;
    monthsUsed = Math.max(0, monthsUsed);
  }
  const materialRate = getMaterialRate(item.material);
  const timeDepreciation = Math.min(0.7, monthsUsed * materialRate);
  const wearDepreciation = Math.min(0.3, Math.floor((item.worn_count || 0) / 10) * 0.03);
  const totalDepreciation = Math.min(0.9, timeDepreciation + wearDepreciation);
  const currentValue = Math.round(price * (1 - totalDepreciation) * 100) / 100;
  const valueRatio = currentValue / price;

  let status, statusColor, suggestion;
  if (valueRatio > 0.6) {
    status = '保值中'; statusColor = '#2D8B4E';
    suggestion = monthsUsed < 6 ? '新品阶段，继续穿着' : '状态良好，建议保持当前穿着频率';
  } else if (valueRatio > 0.3) {
    status = '正常使用'; statusColor = '#D4A84B';
    suggestion = '已进入稳定使用期，注意保养延长寿命';
  } else {
    status = '建议淘汰'; statusColor = '#C45F5F';
    suggestion = '折旧严重，建议考虑捐赠、二手转卖或替换';
  }

  return {
    currentValue,
    originalPrice: price,
    depreciationRate: Math.round(totalDepreciation * 100) / 100,
    depreciationAmount: Math.round((price - currentValue) * 100) / 100,
    monthsUsed,
    wornCount: item.worn_count || 0,
    status,
    statusColor,
    suggestion
  };
}

module.exports = { calcCostPerWear, calcValueRating, formatDate, today, calcDepreciation };
