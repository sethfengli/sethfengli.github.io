# 慧灯禅院 · Huideng Zen Temple

> 慧灯常照，点亮心灯。一座没有围墙的线上数字寺庙。

「慧灯禅院」是原 **“如说修行”网上佛学院**（净修院 / 禅修院 / 修学园地，309 篇 GB2312 静态 HTML）的全新在线重构版：从旧式 FrontPage 离线站点，升级为 React 18 + TypeScript + Vite + Tailwind CSS 的现代数字寺庙，纯静态托管于 GitHub Pages。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 真实照片 Hero（背景/站标均为实拍）、每日法语、禅院导览、精选经论、三大修学门径、互动香炉、4 套轻快佛教配色主题 |
| 📚 佛学文库 | 299 篇经论注疏/修学开示（已去重），院系筛选 + 搜索 + 分页，110+ 张免版权照片封面（不重复） |
| 📖 阅读器 | 目录（滚动高亮）、阅读进度条、字号/行距调节、**5 种阅读背景**（明亮/暗色/护眼米黄/羊皮纸/月光蓝），偏好与进度本地记忆 |
| 🔔 法音宣流 | 撞木击钟（真实梵钟录音 + 合成兜底，闻钟偈）、圣号梵音播放与持诵计数（免版权音档本地托管） |
| 🪔 在线祈福 | 许愿树 + 红绸飘带心愿 + 燃香香炉：localStorage 存储、删除自己的心愿、JSON 导出/导入备份 |
| ✨ 观音灵签 | 32 签（签诗+解签+禅语祝福）、观音像 + 朱漆描金签筒、摇签/飞签/翻牌动画、收藏历史 |
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
- **封面用真实照片**：约 48 张 Wikimedia Commons 免版权寺庙/佛像/风景照片本地托管（`public/photos/` + CREDITS 署名），12 种水墨风 SVG 插画作回退与装饰。
- **钟声**：真实梵钟录音（長命寺，CC BY 2.1 JP）本地托管，未就绪时回退 Web Audio 多泛音合成。

## 许可

页面代码 MIT；文章教材继承原“如说修行”网上佛学院之声明——为弘法利生，欢迎转载、演讲、翻印、出版、发行。
