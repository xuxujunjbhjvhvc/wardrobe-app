const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { calcCostPerWear, calcValueRating } = require('../utils/helpers');

// ===== 天气匹配引擎 =====

// 温度分类
function getTempCategory(temp) {
  const t = parseFloat(temp);
  if (isNaN(t)) return { key: 'comfortable', label: '舒适', range: '18-25°C', icon: '☀️' };
  if (t < 0) return { key: 'freezing', label: '极寒', range: '<0°C', icon: '❄️' };
  if (t < 10) return { key: 'cold', label: '寒冷', range: '0-10°C', icon: '🧥' };
  if (t < 18) return { key: 'cool', label: '凉爽', range: '10-18°C', icon: '🍂' };
  if (t < 25) return { key: 'comfortable', label: '舒适', range: '18-25°C', icon: '☀️' };
  if (t < 30) return { key: 'warm', label: '温暖', range: '25-30°C', icon: '🌤️' };
  return { key: 'hot', label: '炎热', range: '>30°C', icon: '🔥' };
}

// 季节-温度匹配权重
const seasonTempWeight = {
  'freezing': { '冬': 1.0, '秋': 0.3, '四季': 0.5, '春': 0.2, '夏': 0.0 },
  'cold':     { '冬': 0.9, '秋': 0.6, '四季': 0.7, '春': 0.3, '夏': 0.1 },
  'cool':     { '冬': 0.5, '秋': 0.9, '四季': 0.8, '春': 0.7, '夏': 0.2 },
  'comfortable': { '冬': 0.3, '秋': 0.7, '四季': 1.0, '春': 0.9, '夏': 0.5 },
  'warm':     { '冬': 0.1, '秋': 0.4, '四季': 0.8, '春': 0.9, '夏': 0.9 },
  'hot':      { '冬': 0.0, '秋': 0.2, '四季': 0.6, '春': 0.7, '夏': 1.0 }
};

// 材质-温度匹配（保暖性评分，越高越保暖）
const materialWarmth = {
  '羊毛': 0.95, '羊绒': 1.0, '羽绒': 1.0, '真皮': 0.85, '皮革': 0.85,
  '毛呢': 0.9, '呢子': 0.9, '抓绒': 0.8, '法兰绒': 0.75,
  '牛仔': 0.55, '棉': 0.5, '帆布': 0.45, '麻': 0.2, '亚麻': 0.2,
  '丝绸': 0.25, '真丝': 0.25, '雪纺': 0.15, '涤纶': 0.4, '化纤': 0.4,
  '尼龙': 0.35, '速干': 0.3
};

function getMaterialWarmth(material) {
  if (!material) return 0.5;
  for (const [key, warmth] of Object.entries(materialWarmth)) {
    if (material.includes(key)) return warmth;
  }
  return 0.5;
}

// 天气状况-功能匹配
const conditionFeature = {
  '晴': { rain: 0, sun: 1, wind: 0.3 },
  '多云': { rain: 0, sun: 0.5, wind: 0.4 },
  '阴': { rain: 0.2, sun: 0, wind: 0.5 },
  '雨': { rain: 1, sun: 0, wind: 0.6 },
  '雪': { rain: 0.8, sun: 0, wind: 0.8 },
  '雾': { rain: 0.3, sun: 0, wind: 0.2 }
};

// 单件衣物天气适配度评分 (0-100)
function scoreItemForWeather(item, temp, condition) {
  const tempCat = getTempCategory(temp);
  const seasonWeight = seasonTempWeight[tempCat.key]?.[item.season] ?? 0.5;

  // 材质保暖性与温度匹配
  const materialWarmthVal = getMaterialWarmth(item.material);
  const targetWarmth = { freezing: 0.95, cold: 0.8, cool: 0.6, comfortable: 0.45, warm: 0.3, hot: 0.15 }[tempCat.key] || 0.5;
  const materialMatch = 1 - Math.abs(materialWarmthVal - targetWarmth);

  // 天气功能匹配（防雨材质在雨天加分）
  const cond = conditionFeature[condition] || conditionFeature['晴'];
  let featureBonus = 0;
  if (cond.rain > 0.5) {
    if (item.material && /防水|防雨|尼龙|涤纶|速干|冲锋/.test(item.material)) featureBonus += 15;
    if (item.category === '外套' && /防水|防雨|冲锋/.test(item.material || '')) featureBonus += 10;
  }
  if (cond.sun > 0.5 && item.category === '配饰') featureBonus += 5; // 晴天配饰（帽子墨镜）

  // 穿着频次加权（常穿的优先推荐）
  const wornBonus = Math.min(10, (item.worn_count || 0) * 0.5);

  const score = Math.round(seasonWeight * 40 + materialMatch * 35 + featureBonus + wornBonus);
  return Math.min(100, Math.max(0, score));
}

// 按分类筛选并排序
function getBestItemsByCategory(items, category, temp, condition, limit = 3) {
  return items
    .filter(i => i.category === category && i.status === 'active')
    .map(i => ({ ...i, weatherScore: scoreItemForWeather(i, temp, condition) }))
    .sort((a, b) => b.weatherScore - a.weatherScore)
    .slice(0, limit);
}

// 生成天气适配穿搭
function generateWeatherOutfit(allItems, temp, condition) {
  const tempCat = getTempCategory(temp);
  const outfit = [];
  const categories = ['上衣', '裤子', '鞋子'];

  // 根据温度调整搭配策略
  if (tempCat.key === 'freezing' || tempCat.key === 'cold') {
    categories.unshift('外套'); // 寒冷优先外套
  }
  if (tempCat.key === 'hot') {
    // 炎热时不推荐外套
  }

  for (const cat of categories) {
    const best = getBestItemsByCategory(allItems, cat, temp, condition, 1);
    if (best.length > 0) outfit.push(best[0]);
  }

  // 配饰/包包（30%概率）
  if (Math.random() > 0.5) {
    const acc = getBestItemsByCategory(allItems, '配饰', temp, condition, 1);
    if (acc.length > 0) outfit.push(acc[0]);
  }

  // 计算整体适配度
  const avgScore = outfit.length > 0
    ? Math.round(outfit.reduce((sum, i) => sum + i.weatherScore, 0) / outfit.length)
    : 0;

  return { items: outfit, avgScore, tempCategory: tempCat };
}

// ===== 路由 =====

// 天气推荐穿搭
router.get('/recommend', (req, res) => {
  const { temp = 22, condition = '晴' } = req.query;
  const tempCat = getTempCategory(temp);

  const allItems = db.prepare("SELECT * FROM clothing WHERE status = 'active'").all();

  if (allItems.length === 0) {
    return res.json({
      success: true,
      data: {
        tempCategory: tempCat,
        condition,
        recommendation: null,
        alternatives: [],
        tips: ['衣橱为空，请先添加衣物']
      }
    });
  }

  // 生成主推荐
  const mainOutfit = generateWeatherOutfit(allItems, temp, condition);

  // 生成备选搭配（2套）
  const alternatives = [];
  for (let i = 0; i < 2; i++) {
    const alt = generateWeatherOutfit(allItems, temp, condition);
    if (alt.items.length > 0) alternatives.push(alt);
  }

  // 天气穿搭建议
  const tips = generateWeatherTips(tempCat, condition, allItems);

  res.json({
    success: true,
    data: {
      tempCategory: tempCat,
      condition,
      temp: parseFloat(temp),
      recommendation: mainOutfit,
      alternatives,
      tips
    }
  });
});

// 生成天气穿搭建议
function generateWeatherTips(tempCat, condition, allItems) {
  const tips = [];
  const cond = conditionFeature[condition] || conditionFeature['晴'];

  if (tempCat.key === 'freezing') {
    tips.push('极寒天气，建议多层穿搭：保暖内衣+毛衣+厚外套');
    tips.push('注意头部和手部保暖，选择帽子、手套等配饰');
  } else if (tempCat.key === 'cold') {
    tips.push('寒冷天气，建议穿着保暖外套和厚底鞋');
    tips.push('可选择羊毛、羊绒等保暖材质');
  } else if (tempCat.key === 'cool') {
    tips.push('凉爽天气，薄外套或卫衣是不错的选择');
    tips.push('早晚温差大，建议携带可穿脱的外套');
  } else if (tempCat.key === 'comfortable') {
    tips.push('温度舒适，大多数衣物都适合穿着');
    tips.push('是展示穿搭风格的好天气');
  } else if (tempCat.key === 'warm') {
    tips.push('温暖天气，建议选择透气材质');
    tips.push('浅色衣物更显清爽');
  } else if (tempCat.key === 'hot') {
    tips.push('炎热天气，优先选择棉、麻等透气吸汗材质');
    tips.push('避免深色厚重衣物，注意防晒');
  }

  if (cond.rain > 0.5) {
    tips.push('有雨，建议穿着防水材质衣物和防滑鞋子');
    const hasRainGear = allItems.some(i => /防水|防雨|冲锋/.test(i.material || ''));
    if (!hasRainGear) tips.push('提示：衣橱中暂无防水衣物，可考虑添加');
  }
  if (cond.sun > 0.5 && tempCat.key !== 'freezing' && tempCat.key !== 'cold') {
    tips.push('阳光充足，注意防晒，可搭配帽子或太阳镜');
  }

  return tips.slice(0, 4);
}

// 获取天气分类列表（前端用）
router.get('/categories', (req, res) => {
  res.json({
    success: true,
    data: {
      tempCategories: [
        { key: 'freezing', label: '极寒', range: '<0°C', icon: '❄️' },
        { key: 'cold', label: '寒冷', range: '0-10°C', icon: '🧥' },
        { key: 'cool', label: '凉爽', range: '10-18°C', icon: '🍂' },
        { key: 'comfortable', label: '舒适', range: '18-25°C', icon: '☀️' },
        { key: 'warm', label: '温暖', range: '25-30°C', icon: '🌤️' },
        { key: 'hot', label: '炎热', range: '>30°C', icon: '🔥' }
      ],
      conditions: ['晴', '多云', '阴', '雨', '雪', '雾']
    }
  });
});

module.exports = router;
module.exports.getTempCategory = getTempCategory;
module.exports.scoreItemForWeather = scoreItemForWeather;
