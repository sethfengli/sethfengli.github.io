# 慧灯禅院 · Huideng Zen Temple

> 慧灯常照，点亮心灯。一座没有围墙的线上数字寺庙。

「慧灯禅院」是原 **“如说修行”网上佛学院**（净修院 / 禅修院 / 修学园地，309 篇 GB2312 静态 HTML）的全新在线重构版：从旧式 FrontPage 离线站点，升级为 React 19 + TypeScript + Vite 8 + Tailwind CSS 4 的现代数字寺庙，纯静态托管于 GitHub Pages。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 明亮明快的照片 Hero（浅色调 + 深墨文字，不再压抑）、每日法语、轻松入门导览、精选经典、互动香炉（起始即全景），4 套轻快佛教配色主题 |
| 📚 佛学书架 | 299 篇经论注疏/修学开示（已去重、开头目录表已清除），院系筛选 + 搜索 + 分页；封面按院系语义分池（净土·莲池 / 禅门·梵钟 / 随笔·寺院），意境相符、同屏不重复 |
| 📖 阅读器 | 目录（滚动高亮）、阅读进度条、字号/行距调节、**5 种阅读背景**（明亮/暗色/护眼米黄/羊皮纸/月光蓝），偏好与进度本地记忆 |
| 🔔 静心听经 | **3D 梵钟**（经典梵钟形制：乳钉两圈、撞座、池ノ間铭文、龙钮挂环、凹凸铸痕，起始即全景）、真实梵钟录音、圣号梵音与持诵计数 |
| 🪔 点亮心愿 | **3D 千年松柏**（深皴树皮凹凸贴图、板根露根、树瘤结节、飘落松针，起始即全景）：localStorage 存储、删除自己的心愿、JSON 导出/导入备份 |
| ✨ 观音灵签 · 灵棋经 | 双法门切换页：32 签 **3D 鼎式香炉 + 3D 金字签筒**（起始即可见签支）、居中浮动签文弹窗；**灵棋经** 十二棋子掷卦（125 卦全文本地数据，四家注疏）、卦历收藏 |
| 🌐 中英双语 | 全站 UI 中/EN 切换 + Google 翻译小组件（“翻译本文”，零密钥、零后端） |

## 快速开始

```bash
npm install
npm run dev        # 本地开发（http://localhost:5173）
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
npm run migrate    # 重新执行旧站 HTML → JSON/Markdown 迁移（含自动去重）`nnode scripts/fetch-photos2.mjs  # 抓取免版权真实照片（public/photos/）`nnode scripts/fetch-audio.mjs   # 抓取免版权梵呗音档（public/audio/）
```

> 旧站原文位于仓库外的 `../My Web Sites/`，迁移脚本默认从该目录读取；如需换源，改 `scripts/migrate.mjs` 顶部的 `OLD` 路径。

## 部署

推送到 `main` 分支即由 [.github/workflows/deploy.yml](.github/workflows/deploy.yml) 自动构建并部署到 GitHub Pages（详见 [docs/DEPLOY.md](docs/DEPLOY.md)）。

## 文档

- [docs/DESIGN.md](docs/DESIGN.md) — 设计系统（名称、配色、字体、间距、组件风格）
- [docs/MIGRATION.md](docs/MIGRATION.md) — 旧站内容迁移方案与脚本说明
- [docs/DEPLOY.md](docs/DEPLOY.md) — GitHub Pages + GitHub Actions 部署步骤
- [docs/WISH-SHARING.md](docs/WISH-SHARING.md) — 祈福墙共享化（GitHub Issues 等免费方案）思路与限制

## 目录结构

```
├── .github/workflows/deploy.yml   # 自动部署工作流
├── docs/                          # 设计 / 迁移 / 部署 / 共享方案文档
├── scripts/
│   ├── migrate.mjs                # 旧 HTML → JSON(+Markdown) 批量迁移
│   ├── smoke.mjs                  # 构建产物冒烟测试
│   └── serve-dist.mjs             # 无依赖本地静态服务器（测试用）
├── public/                        # favicon、404 等静态资源
└── src/
    ├── i18n/                      # 中英词典 + Provider（零依赖，离线可用）
    ├── data/                      # 32 签数据、每日法语
    ├── content/                   # 迁移生成的 catalog.json + articles/*.json
    ├── lib/                       # 内容加载、阅读偏好、祈福仓储接口、存储工具
    ├── components/
    │   ├── layout/                # Header / Footer / Layout
    │   ├── zen/                   # 12 种禅意 SVG 插画、互动香炉、撞钟
    │   └── reader/                # 正文渲染器、Google 翻译集成
    └── pages/                     # 首页 / 文库 / 阅读器 / 法音 / 祈福 / 灵签 / 关于
```

## 技术要点

- **BrowserRouter**：`/articles/<slug>` 干净 URL（无 `#`）；构建时把 index.html 复制为 404.html，GitHub Pages 刷新直达不 404。
- **内容即数据**：旧文转成结构化 JSON（标题/作者/院系/正文块/表格/站内链接），经 Vite `import.meta.glob` 按需分包——只有点开的文章才产生网络请求。
- **无后端**：心愿、签文、阅读偏好全部 localStorage；数据层采用 Repository 接口，为未来 GitHub Issues 共享预留切换点。
- **封面用真实照片**：64 张 Wikimedia Commons 免版权照片（按类别交错分配 + 步长取图，同屏相邻卡片不重复；`public/photos/` + CREDITS 署名），12 种水墨风 SVG 插画作回退与装饰。
- **钟声**：真实梵钟录音（長命寺，CC BY 2.1 JP）本地托管，未就绪时回退 Web Audio 多泛音合成；钟声播完前禁止再次撞钟。
- **Three.js 3D（v2）**：法音/祈福/灵签三页为可鼠标操控的 3D 场景，three 按需分包（约 185KB gzip），无 WebGL 自动回退 SVG。场景公共设施（`stage.ts`）统一提供轨道操控/点击拾取/软阴影接地/自适应 DPR/`prefers-reduced-motion` 降级；梵钟以冠钮为轴晃荡、香炉青烟加色混合 + 炭火闪烁、许愿树飘落松针、签筒底座接地阴影。
- **设计系统（2026 v3 · 新中式极简）**：宣纸底 + 焦墨字 + 青瓷灰绿 + 朱砂印章红的水墨双色骨架；
  发丝描边 + 大留白 + 非对称栅格取代圆角卡片与投影堆叠，清除装饰性渐变、毛玻璃与 emoji/字符装饰；
  书法体收敛为点睛用途。统一 PageBanner（图文并置题头）/PageIntro/SectionHeading/Ornament/Reveal 组件、
  卡片分层阴影令牌、全局朱砂焦点环、View Transitions 页面切换动画（渐进增强）、滚动进度条、
  移动菜单滑下动画、`fetchpriority=high` 首屏关键图。详见 [docs/DESIGN.md](docs/DESIGN.md) 第 10 节。
- **古意字体**：霞鹜文楷正文 + 马善政/龙藏书法标题，本地托管 unicode-range 子集。

## 许可

页面代码 MIT；文章教材继承原“如说修行”网上佛学院之声明——为弘法利生，欢迎转载、演讲、翻印、出版、发行。
