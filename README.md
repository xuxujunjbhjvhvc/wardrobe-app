# 我的衣橱 · 电子穿搭管家 👔

> 一个简洁、高功能性的个人衣橱管理应用，帮你记录每一件衣服的穿着频次，计算真实性价比。

![Version](https://img.shields.io/badge/version-1.0.1-brightgreen)
![Node](https://img.shields.io/badge/node-%3E%3D18-blue)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ 核心功能

### 📦 衣物管理
- 衣物全生命周期管理：添加、编辑、删除、软删除
- 详细属性：名称、分类、季节、颜色、价格、品牌、材质、购买日期、备注、标签
- 照片上传（自动压缩优化）
- 分类筛选 + 季节筛选 + 标签筛选 + 关键词搜索
- 多种排序：最新添加、穿得最多、价格高低

### 📅 穿搭日历
- 日历视图记录每天穿了什么
- 支持多选衣物组合
- 记录天气和穿搭感受
- 点击任意日期查看/编辑当天穿搭

### 🎲 智能搭配
- 一键随机生成穿搭方案（上衣+裤子+鞋子+配饰）
- 满意后直接记录为当天穿搭

### 📊 数据统计与性价比分析
- **总览看板**：衣服总数、穿搭记录、累计穿次、平均单次成本
- **分类分布**：各类衣物数量占比
- **季节分布**：春夏秋冬衣物分布
- **穿着频率 Top 10**：哪些衣服穿得最多
- **性价比排行**：单次穿着成本最低的衣物（价格 ÷ 穿着次数）
- **待提升衣物**：贵但穿得少的衣服，提醒你多穿或谨慎购买
- **衣物详情页**：单次穿着成本、性价比评级（极佳/优秀/良好/一般/待提升）、穿着历史

### 📱 PWA  Progressive Web App
- 可安装到手机桌面，像原生APP一样使用
- 支持离线访问（Service Worker 缓存）
- 响应式设计，手机/平板/桌面全适配
- 安全区域适配（iPhone 刘海屏）

### 💾 数据安全
- SQLite 本地数据库，数据完全在你自己的设备上
- 一键导出 JSON 备份
- 软删除机制，防止误删

## 🏗️ 技术架构

```
wardrobe/
├── backend/                 # 后端服务
│   ├── server.js           # Express 入口
│   ├── db/
│   │   └── database.js     # SQLite 数据库初始化
│   ├── routes/
│   │   ├── clothing.js     # 衣物 CRUD API
│   │   ├── outfits.js      # 穿搭记录 API
│   │   └── stats.js        # 统计分析 API
│   ├── middleware/
│   │   └── errorHandler.js # 统一错误处理
│   ├── utils/
│   │   └── helpers.js      # 性价比计算工具
│   ├── data/               # SQLite 数据库文件
│   └── uploads/            # 图片上传目录
├── frontend/                # 前端 PWA
│   ├── index.html          # 主页面
│   ├── css/style.css       # 样式
│   ├── js/
│   │   ├── api.js          # API 封装层
│   │   └── app.js          # 主应用逻辑
│   ├── manifest.json       # PWA 清单
│   └── sw.js               # Service Worker
├── package.json
├── .gitignore
└── README.md
```

### 技术栈
| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| 数据库 | SQLite (sql.js) |
| 前端 | 原生 HTML/CSS/JS（零框架依赖） |
| PWA | Service Worker + Web App Manifest |
| 图片处理 | Canvas 客户端压缩 |

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm >= 8

### 安装与运行

```bash
# 1. 进入项目目录
cd wardrobe

# 2. 安装后端依赖
cd backend
npm install

# 3. 启动服务
npm start
```

启动后访问：
- **应用首页**：http://localhost:3000
- **健康检查**：http://localhost:3000/api/health

### 手机访问（同一WiFi下）
1. 查看电脑IP：`ipconfig`（Windows）或 `ifconfig`（Mac/Linux）
2. 手机浏览器访问 `http://<电脑IP>:3000`
3. 在浏览器菜单选择「添加到主屏幕」，即可像APP一样使用

## 📡 API 接口

### 衣物管理
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/clothing` | 获取衣物列表（支持 category/season/search/sort/tag 参数） |
| GET | `/api/clothing/:id` | 获取衣物详情（含穿着历史） |
| POST | `/api/clothing` | 添加衣物（支持 tags 字段） |
| PUT | `/api/clothing/:id` | 更新衣物（支持 tags 字段） |
| DELETE | `/api/clothing/:id` | 删除衣物（软删除） |
| POST | `/api/clothing/:id/wear` | 记录穿着一次 |
| GET | `/api/clothing/tags/all` | 获取所有标签（含计数） |

### 穿搭记录
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outfits` | 获取穿搭记录（支持 month 参数） |
| GET | `/api/outfits/date/:date` | 获取指定日期穿搭 |
| POST | `/api/outfits` | 创建/更新穿搭记录 |
| DELETE | `/api/outfits/:id` | 删除穿搭记录 |

### 统计分析
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/overview` | 总览统计 |
| GET | `/api/stats/categories` | 分类分布 |
| GET | `/api/stats/seasons` | 季节分布 |
| GET | `/api/stats/most-worn` | 穿着频次排行 |
| GET | `/api/stats/best-value` | 性价比排行 |
| GET | `/api/stats/underutilized` | 待提升衣物 |
| GET | `/api/stats/monthly-trend` | 月度穿搭趋势 |

## 🧮 性价比算法

```
单次穿着成本 = 衣物价格 ÷ 累计穿着次数

性价比评级：
  ¥0-5/次   → 极佳 ★★★★★
  ¥5-15/次  → 优秀 ★★★★
  ¥15-30/次 → 良好 ★★★
  ¥30-60/次 → 一般 ★★
  ¥60+/次   → 待提升 ★
```

## 📝 更新日志

### v1.0.1 (2026-09-30)
- 🏷️ **衣物标签系统**：支持自定义标签（逗号分隔），多标签筛选栏，标签计数统计
- 🎨 **UI细节打磨**：卡片入场动画、悬停提升效果、按钮点击反馈
- 🔧 **数据库自动迁移**：旧数据库自动添加 tags 字段，无需手动操作
- 🔍 搜索范围扩展到标签字段
- 🐛 修复统计页空数据显示

### v1.0.0 (2026-09-30)
- 🎉 首个正式版本发布
- ✅ 前后端分离架构（Node.js + Express + SQLite）
- ✅ 衣物完整 CRUD + 图片上传
- ✅ 穿搭日历记录
- ✅ 随机搭配生成器
- ✅ 穿着频次统计
- ✅ 性价比计算与评级系统
- ✅ 待提升衣物提醒
- ✅ PWA 支持（可安装到手机桌面）
- ✅ 响应式设计（手机/平板/桌面）
- ✅ 数据导出备份

## 🗺️ 路线图

- [x] 衣物标签系统（自定义标签）
- [ ] 颜色搭配建议
- [ ] 天气联动穿搭推荐
- [ ] 洗衣提醒（基于穿着次数）
- [ ] 衣物折旧与淘汰建议
- [ ] 购物清单与愿望单
- [ ] 多用户/家庭共享衣橱
- [ ] 数据导入（从其他APP迁移）
- [ ] 深色模式
- [ ] 桌面端 Electron 打包

## 📄 许可证

MIT License

---

*用数据管理你的衣橱，让每一件衣服都物尽其用。*
