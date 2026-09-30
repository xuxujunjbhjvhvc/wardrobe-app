# 电子衣橱 · 版本发布记录

## v1.0.9 (2026-09-30)

### 新增功能
- ✨ **AI抠图+变平整**
  - 随手拍的衣物照片（穿在身上/摆在地上），一键AI抠除背景
  - 纯前端运行，使用 @imgly/background-removal（CDN动态加载，无需API key，无调用次数限制）
  - AI自动识别衣物轮廓，精准分割前景/背景
  - 自动裁剪透明边距，去除多余空白（隔行扫描算法，性能优化）
  - 主轴旋转校正：基于像素质心+二阶矩算法计算衣物主轴角度，自动旋转对齐到0/90度，衣物变平整
  - 抠图进度实时显示：模型加载→抠图百分比→自动裁剪+变平整
  - 输出PNG透明背景base64，直接保存到衣橱
  - 添加/编辑衣物弹窗中，上传图片后显示"✨ AI抠图 · 变平整"按钮

### 技术改进
- 🧠 AI背景移除：@imgly/background-removal@1.5.5（ONNX Runtime + WebAssembly）
- 📐 变平整算法：图像二阶矩主轴分析 + 透视旋转 + 自动裁剪
- ⚡ 性能优化：降采样分析（最大边300px）、隔行扫描透明像素检测
- 🎨 新增AI抠图按钮、进度条、旋转动画CSS样式（含深色模式适配）
- 📊 健康检查接口版本号同步更新为1.0.9
- 📱 导出数据版本号更新为1.0.9

### 文件变更
- frontend/index.html - 版本徽章 + AI抠图按钮UI
- frontend/css/style.css - AI抠图按钮/进度条/旋转动画样式
- frontend/js/app.js - AI抠图核心逻辑（loadAIModule/removeBackgroundAI/autoCropTransparent/flattenByRotation）
- backend/server.js - 版本号更新
- package.json - 版本号更新
- backend/package.json - 版本号更新
- README.md - 更新功能说明、技术栈、更新日志、路线图
- RELEASE_NOTES.md - 新增v1.0.9发布记录

---

## v1.0.8 (2026-09-30)

### 新增功能
- 🏷️ **场合标签系统**
  - 每件衣物可标记适用场合：工作/休闲/正式/运动/约会/居家/旅行
  - 衣橱页新增场合筛选栏，8个场合按钮一键筛选
  - 添加/编辑表单新增场合下拉选择
  - 衣物卡片左上角显示场合徽章
- 📦 **衣物状态管理**
  - 四种状态全生命周期管理：正常(active)/种草(wishlist)/闲置(idle)/丢弃(discarded)
  - 衣橱页新增状态筛选栏，快速查看不同状态衣物
  - 详情页footer新增"状态切换"按钮，一键循环切换状态
  - 衣物卡片右上角显示状态彩色徽章（种草黄/闲置灰/丢弃红）
  - 添加/编辑表单新增状态下拉选择
- ⭐ **收藏搭配库**
  - 新增第6个主视图"收藏"（导航栏"购物清单"缩短为"购物"）
  - 搭配页生成穿搭后新增"⭐收藏这套"按钮，自定义命名保存
  - 收藏卡片展示：搭配名称、衣物件数、总价值、衣物缩略图（最多6件+更多标记）
  - 一键"今日穿这套"：自动记录为今日穿搭并累加所有衣物穿着次数
  - 支持删除收藏搭配

### 技术改进
- 🗄️ 新增 saved_outfits 和 saved_outfit_items 两张数据表
- 🔧 数据库自动迁移：clothing表自动添加 occasion 和 status 字段
- 🔌 新增完整收藏搭配 REST API（6个接口）
- 🔌 新增 PATCH /api/clothing/:id/status 快速状态修改API
- 🎨 新增场合/状态筛选栏、状态徽章、收藏卡片CSS样式（含深色模式适配）
- 📊 健康检查接口版本号同步更新为1.0.8
- 📱 导出数据版本号更新为1.0.8

### API变更
- 新增 `GET /api/saved-outfits` 获取所有收藏搭配（含衣物详情和总价值）
- 新增 `GET /api/saved-outfits/:id` 获取收藏搭配详情
- 新增 `POST /api/saved-outfits` 创建收藏搭配
- 新增 `PUT /api/saved-outfits/:id` 更新收藏搭配
- 新增 `DELETE /api/saved-outfits/:id` 删除收藏搭配
- 新增 `POST /api/saved-outfits/:id/apply` 应用为今日穿搭（自动累加穿着次数）
- 新增 `PATCH /api/clothing/:id/status` 快速修改衣物状态
- `GET /api/clothing` 列表接口新增 occasion 和 itemStatus 查询参数筛选

### 文件变更
- backend/db/database.js - 新增saved_outfits/saved_outfit_items表 + occasion/status字段迁移
- backend/routes/clothing.js - 新增状态筛选 + PATCH状态API
- backend/routes/savedOutfits.js - 新增收藏搭配路由（6个API）
- backend/server.js - 注册收藏搭配路由，版本号更新
- frontend/index.html - 版本徽章 + 收藏tab + 场合/状态筛选栏 + 收藏视图 + 表单字段
- frontend/css/style.css - 场合/状态筛选 + 状态徽章 + 收藏卡片样式
- frontend/js/api.js - 新增状态修改 + 收藏搭配6个API方法
- frontend/js/app.js - 场合/状态筛选逻辑 + 状态切换 + 收藏搭配完整功能
- README.md - 更新功能说明、API列表、更新日志、路线图
- RELEASE_NOTES.md - 新增v1.0.8发布记录
- package.json - 版本号更新
- backend/package.json - 版本号更新

---

## v1.0.7 (2026-09-30)

### 新增功能
- 🌤️ **天气联动穿搭推荐**
  - 搭配页新增天气控制面板：温度滑块（-10°C ~ 40°C）+ 天气状况按钮（晴/多云/阴/雨/雪）
  - 实时天气提示条，根据温度和天气状况给出穿搭建议
  - 智能匹配引擎：季节-温度权重 + 材质保暖性匹配 + 天气功能匹配（防雨/防晒）
  - 六档温度分类：极寒(<0°C)/寒冷(0-10°C)/凉爽(10-18°C)/舒适(18-25°C)/温暖(25-30°C)/炎热(>30°C)
  - 17种材质保暖性评分（羊绒1.0/羊毛0.95/棉0.5/麻0.2等），自动匹配目标保暖度
  - 雨天自动优先推荐防水材质衣物，晴天优先推荐配饰（帽子/墨镜）
  - 穿搭适配度评分（0-100%），进度条可视化展示，颜色随分数变化
  - 智能穿搭建议列表（多层穿搭/保暖材质/防水提醒/防晒提示等）
  - 每件推荐衣物显示单独适配度百分比
  - API失败时自动回退到随机搭配，保证可用性

### 技术改进
- 🔧 新增天气推荐路由 `backend/routes/weather.js`
  - `GET /api/weather/recommend?temp=22&condition=晴` — 天气穿搭推荐
  - `GET /api/weather/categories` — 温度分类和天气状况列表
- 🧮 天气匹配算法：
  - 季节-温度匹配权重（40分）
  - 材质保暖性与目标保暖度匹配（35分）
  - 天气功能匹配加分（防雨/防晒，最高25分）
  - 穿着频次加权（常穿优先，最高10分）
- 🎨 新增天气控制面板、适配度卡片、穿搭建议卡片CSS样式（含深色模式适配）
- 📊 健康检查接口版本号同步更新为1.0.7

### API变更
- 新增 `GET /api/weather/recommend?temp=XX&condition=XX` 天气穿搭推荐
- 新增 `GET /api/weather/categories` 温度分类列表

### 文件变更
- backend/routes/weather.js - 新增天气推荐路由
- backend/server.js - 注册天气路由，版本号更新
- frontend/index.html - 搭配页新增天气控制面板
- frontend/css/style.css - 新增天气相关样式
- frontend/js/api.js - 新增天气API方法
- frontend/js/app.js - 重写智能搭配逻辑，新增天气控制方法
- README.md - 更新功能说明、API列表、更新日志、路线图
- RELEASE_NOTES.md - 新增v1.0.7发布记录
- package.json - 版本号更新
- backend/package.json - 版本号更新

---

## v1.0.6 (2026-09-30)

### 新增功能
- 📈 **月度穿搭报告**
  - 统计页顶部新增全宽月度报告卡片，渐变背景突出显示
  - 月份切换器（上月/下月按钮），可查看任意历史月份的穿搭数据
  - 四大核心指标卡片：穿搭天数、总穿次、平均单次成本、新购衣物
  - 与上月智能对比：穿搭天数变化、穿次变化（绿色上升/红色下降箭头）
  - 本月最常穿 Top 5 排行（横向进度条，显示本月穿着次数）
  - 每日穿搭趋势柱状图，直观展示整月穿搭活跃度
  - 响应式布局，移动端自动切换为单列显示

### 技术改进
- 🔧 新增 `GET /api/stats/monthly-report` 月度报告API
  - 返回月度总览（穿搭天数/总穿次/平均单次成本/新购统计）
  - 本月最常穿 Top 5
  - 分类穿着占比
  - 与上月对比数据
  - 每日穿搭趋势
- 🎨 新增月度报告专属CSS样式（含深色模式适配、响应式布局）
- 📊 健康检查接口版本号同步更新为1.0.6

### API变更
- 新增 `GET /api/stats/monthly-report?month=YYYY-MM` 月度穿搭报告

### 文件变更
- backend/routes/stats.js - 新增月度报告API
- backend/server.js - 版本号更新
- backend/package.json - 版本号更新
- frontend/index.html - 版本徽章更新 + 月度报告卡片UI
- frontend/css/style.css - 月度报告样式
- frontend/js/api.js - 新增getMonthlyReport方法
- frontend/js/app.js - 月度报告渲染逻辑 + 版本号更新
- package.json - 版本号更新
- README.md - 功能说明 + 更新日志 + 路线图
- RELEASE_NOTES.md - 本文件

---

## v1.0.5 (2026-09-30)

### 新增功能
- 🛒 **购物清单系统**
  - 新增第5个主视图"购物清单"，与衣橱/日历/搭配/统计并列
  - 想买的衣服统一管理，不再忘记
  - 三级优先级（高/中/低），按优先级自动排序显示
  - 预估价格记录，顶部汇总：待购买数量、已购买数量、预算合计、高优先级数量
  - 圆形勾选框一键标记已购买/撤销购买，已购买项自动划线+半透明效果
  - 全部/待购买/已购买三种筛选视图
  - 一键清除所有已购买记录，保持清单清爽
  - 添加/编辑弹窗：名称、分类、预估价格、优先级、备注
  - 卡片入场动画，悬停提升效果

### 技术改进
- 🗄️ 新增 shopping_list 数据表
- 🔌 新增完整购物清单 REST API（7个接口）
- 🎨 新增购物清单专属CSS样式（含深色模式适配）
- 🐛 修复统计页折旧分析变量未定义的 bug（v1.0.4遗留）
- 📊 健康检查接口版本号同步更新为1.0.5

### API变更
- 新增 `GET /api/shopping` 获取购物清单（含汇总统计）
- 新增 `POST /api/shopping` 添加购物项
- 新增 `PUT /api/shopping/:id` 更新购物项
- 新增 `DELETE /api/shopping/:id` 删除购物项
- 新增 `POST /api/shopping/:id/purchase` 标记已购买
- 新增 `POST /api/shopping/:id/unpurchase` 撤销购买
- 新增 `DELETE /api/shopping/purchased/clear` 清除已购买项

---

## v1.0.4 (2026-09-30)

### 新增功能
- 📉 **折旧建议系统**
  - 智能计算衣物当前估值，基于购买日期和穿着次数
  - 材质差异化折旧率：真皮/皮革1.2%/月、羊毛/羊绒1.5%/月、棉/麻2%/月、化纤2.5%/月
  - 穿着加速折旧：每穿10次额外折旧3%，最高加速30%
  - 最低残值保护：估值不低于原价10%，总折旧不超过90%
  - 三级状态分类：保值中（>60%）/ 正常使用（30-60%）/ 建议淘汰（<30%）
  - 衣物详情页新增：当前估值、折旧状态、使用时长（月）
  - 统计页新增"折旧分析"全宽卡片
    - 汇总指标：总原值、当前估值、累计折旧、平均折旧率
    - 状态分布：保值中/正常使用/建议淘汰 数量统计
    - 建议淘汰列表：按估值从低到高排序，显示估值和穿着次数

### API变更
- 新增 `GET /api/stats/depreciation` 折旧统计接口
- `GET /api/clothing/:id` 详情接口新增 `depreciation` 字段

### 技术细节
- 后端 helpers.js 新增 calcDepreciation 折旧计算引擎
- 前端 api.js 新增 getDepreciation 封装
- 版本号同步更新：根package.json、backend/package.json、index.html徽章、app.js导出版本、server.js健康检查

## v1.0.3 (2026-09-30)

### 新增功能
- 🧺 **洗衣提醒系统**
  - 每件衣物可设置洗衣阈值（默认穿3次提醒，0为不提醒）
  - 衣橱卡片显示"待清洗"红色徽章，脉冲动画提示
  - 卡片悬停操作栏新增"标记已清洗"按钮
  - 衣橱页新增"待清洗"筛选栏，显示待清洗数量徽章
  - 衣物详情页显示洗衣状态（穿X/Y次）和上次清洗日期
  - 详情页footer新增"标记已清洗"按钮（仅待清洗时显示）
  - 保存穿搭时自动累加 wash_count，删除穿搭时自动扣减
  - 批量标记已清洗 API
- 📥 **数据导入功能**
  - header新增导入按钮，与导出按钮对称
  - 导入弹窗：选择JSON备份文件 → 预览衣物/穿搭数量 → 选择导入模式
  - 合并模式：根据name+category去重，保留现有数据
  - 覆盖模式：清空所有数据后导入（有二次确认）
  - 导入完成后自动刷新衣橱和统计数据

### 技术改进
- 🔧 数据库自动迁移：旧数据库自动添加 wash_count、wash_threshold、last_wash_date 字段
- 🔧 新增 API：标记已清洗、批量清洗、待清洗列表、数据导入
- 🔧 衣物列表 API 支持 needsWash 查询参数筛选
- 🔧 健康检查接口版本号更新为 1.0.3

### 文件变更
- backend/db/database.js - v1.0.3 数据库迁移
- backend/routes/clothing.js - 洗衣相关API
- backend/routes/outfits.js - 穿搭同步wash_count
- backend/server.js - 数据导入API
- frontend/index.html - 导入按钮、洗衣筛选、导入弹窗
- frontend/css/style.css - 洗衣提醒样式
- frontend/js/api.js - 洗衣和导入API封装
- frontend/js/app.js - 洗衣提醒逻辑 + 数据导入
- package.json / backend/package.json - 版本号升级
- README.md - 更新文档

---

## v1.0.2 (2026-09-30)

### 新增功能
- 🌙 **深色模式**：一键切换，localStorage记忆，页面加载无闪烁
- 🎨 **颜色搭配建议引擎**：HSL色相分析，40+中文颜色名识别，三级评分

### 技术改进
- 🔧 CSS变量驱动主题系统
- 🔧 前端颜色引擎：colorMap + hexToHsl + calcColorHarmony

---

## v1.0.1 (2026-09-30)

### 新增功能
- 🏷️ **衣物标签系统**：自定义标签、多标签筛选、标签计数统计
- 🎨 **UI细节打磨**：卡片入场动画、悬停提升、按钮点击反馈

### 技术改进
- 🔧 数据库自动迁移：旧数据库自动添加 tags 字段

---

## v1.0.0 (2026-09-30)

### 首个正式版本
- 🎉 前后端分离架构（Node.js + Express + SQLite）
- ✅ 衣物完整 CRUD + 图片上传
- ✅ 穿搭日历记录
- ✅ 随机搭配生成器
- ✅ 穿着频次统计
- ✅ 性价比计算与五级评级系统
- ✅ 待提升衣物提醒
- ✅ PWA 支持
- ✅ 响应式设计
- ✅ 数据导出备份
