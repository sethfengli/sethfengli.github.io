# 慧灯禅院 · Huideng Zen Temple

> 慧灯常照，点亮心灯。一座没有围墙的线上数字寺庙。

「慧灯禅院」是原 **“如说修行”网上佛学院**（净修院 / 禅修院 / 修学园地，309 篇 GB2312 静态 HTML）的全新在线重构版：从旧式 FrontPage 离线站点，升级为 React 19 + TypeScript + Vite 8 + Tailwind CSS 4 的现代数字寺庙，纯静态托管于 GitHub Pages。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 🏠 首页 | 佛殿金身 Hero、每日法语（**77 条**，按日 + 时辰轮换）+ **一分钟静坐**、四门导览、精选经典、互动香炉（起始即全景），4 套水墨配色主题 |
| 📚 经典书架 | 294 篇经论注疏/修学开示，院系筛选 + 搜索 + 分页；封面按院系语义分池（佛画·经变 / 石窟·造像 / 山水·殿宇），意境相符、同屏不重复 |
| 📖 阅读器 | 目录（滚动高亮）、阅读进度条、字号/行距调节、**5 种阅读背景**（宣纸/焦墨/米黄/羊皮纸/月光蓝），偏好与进度本地记忆 |
| 🔔 静心听经 | **3D 梵钟**（v3：双壳钟身 + 外撇钟唇、莲座龙钮、两排乳钉、双面阴刻铭文、木架匾额；起始即全景、打开即播放）、真实梵钟录音、圣号梵音与持诵计数 |
| 🪔 点亮心愿 | **3D 千年松柏**（v3：Frenet 变径管树干、层叠松云冠、红绸金环、树脚碎石与香炉；起始即全景）；无 WebGL 时回退**水墨松柏 SVG**（松针簇笔意、点苔、松果、红绸系于真实枝桠）：localStorage 存储、删除自己的心愿、JSON 导出/导入备份 |
| ✨ 观音灵签 · 灵棋经 | 双法门切换页：32 签 **3D 鼎式香炉 + 3D 金字签筒**（起始即可见签支）、居中浮动签文弹窗；**灵棋经** 十二棋子掷卦（125 卦全文本地数据，四家注疏）、卦历收藏 |
| 🌐 中英双语 | 全站 UI 中/EN 切换 + Google 翻译小组件（“翻译本文”，零密钥、零后端）；中英文案按「雅信达」分别撰写，非直译 |
| 🖼 图版 | 239 张 Wikimedia Commons 免版权图版，**只取中国传统佛教题材**（佛画/石窟/造像/殿宇/写经/山水/莲），已剔除日韩越泰印与藏传题材；水墨 SVG 十二式作回退与装饰 |
| 📱 页面元信息 | 一二级页面各自写入 `title` / `description` / `og:*`（`RouteMeta`），不再是千篇一律的通用摘要 |

## 快速开始

```bash
npm install
npm run dev        # 本地开发（http://localhost:5173）
npm run build      # 构建到 dist/
npm run preview    # 本地预览构建产物
npm run migrate    # 重新执行旧站 HTML → JSON/Markdown 迁移（含自动去重）
```

> ⚠️ 本机的 `vite build` / `vite dev` / `npm run migrate` 需要**子进程权限**：
> 若在受限沙箱里跑会直接失败（`spawn EPERM`，Vite 用管道读子进程输出）。
> 图片抓取同理，需要联网权限。详见 `docs/DESIGN.md` 第 7 节。

### 图版与预览工具

```bash
# 图版：Commons 分类 → 候选池 → 人工精选 → 下载转码（四步，可重跑）
node scripts/collect-pool.mjs            # 分类候选 → scripts/cn-pool.json / cn-pool.txt
node scripts/curate-cn.mjs               # 人工精选 + 二次排雷 → scripts/cn-picked.json
node scripts/fetch-cn-picked.mjs         # 下载 + Pillow 转码 → public/photos/cn/ + src/data/photos-cn.json
node scripts/probe-cats.mjs "Category:…" # 探测某分类是否存在、有多少文件、前几张叫什么

# 视觉预览：纯 SVG 组件单独打包 + 无头 Chrome 截图（改 SVG/插画必用）
npx vite build --config preview/vite.config.ts
node scripts/static-server.mjs preview-dist --port=5188
node scripts/shoot-preview.mjs --name=tree --w=1100 --h=1500

# 3D 场景截图（SwiftShader 软件 WebGL；dev 或 static-server 均可）
node scripts/shot-3d.mjs --route=/dharma --out=build/shots/bell --drag=100,0
node scripts/shot-3d.mjs --route=/prayer --out=build/shots/tree --wishes=8
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
├── preview/                       # 纯 SVG 组件的视觉预览工程（不参与正式构建）
├── scripts/
│   ├── collect-pool.mjs           # 图版①  分类 → 候选池
│   ├── curate-cn.mjs              # 图版②  人工精选 + 二次排雷
│   ├── fetch-cn-picked.mjs        # 图版③  下载 + Pillow 转码 + 清单
│   ├── probe-cats.mjs             # 探测 Commons 分类是否真实存在
│   ├── static-server.mjs          # 零依赖静态服务器（截图/冒烟用）
│   ├── shoot-preview.mjs          # 无头 Chrome 截图（纯 SVG 预览工程）
│   ├── shot-3d.mjs                # 3D 场景截图（SwiftShader，可按路由/拖拽角度拍）
│   ├── verse-candidates.mjs       # 每日法语①  从 294 篇正文挖候选短句
│   ├── verse-audit.mjs            # 每日法语②  重复/缺英文/超长体检
│   ├── migrate.mjs                # 旧 HTML → JSON(+Markdown) 批量迁移
│   └── fetch-audio.mjs            # 梵呗 / 梵钟音档抓取
├── public/
│   ├── photos/cn/                 # 中国传统佛教图版 + CREDITS.md
│   └── audio/                     # 梵呗 / 梵钟音档 + CREDITS.md
└── src/
    ├── i18n/                      # 中英词典 + Provider（零依赖，离线可用）
    ├── data/                      # 32 签数据、每日法语、photos-cn.json
    ├── content/                   # 迁移生成的 catalog.json + articles/*.json + en/*.json
    ├── lib/                       # 内容与配图分配、阅读偏好、祈福仓储接口、存储工具
    ├── components/
    │   ├── layout/                # Header / Footer / Layout
    │   ├── ui/                    # PageBanner / Reveal / RouteMeta
    │   ├── zen/                   # 12 种水墨 SVG 插画、许愿树、互动香炉、撞钟
    │   ├── zen3d/                 # Three.js 场景（梵钟 / 香炉 / 许愿树 / 签筒）
    │   └── reader/                # 正文渲染器、Google 翻译集成
    └── pages/                     # 首页 / 书架 / 阅读器 / 听经 / 祈福 / 灵签 / 关于
```

## 技术要点

- **BrowserRouter**：`/articles/<slug>` 干净 URL（无 `#`）；构建时把 index.html 复制为 404.html，GitHub Pages 刷新直达不 404。
- **内容即数据**：旧文转成结构化 JSON（标题/作者/院系/正文块/表格/站内链接），经 Vite `import.meta.glob` 按需分包——只有点开的文章才产生网络请求。
- **无后端**：心愿、签文、阅读偏好全部 localStorage；数据层采用 Repository 接口，为未来 GitHub Issues 共享预留切换点。
- **图版只用中国传统佛教题材**：Commons 分类 → 候选池 → 人工精选 + 二次排雷（剔除日韩越泰印/尼泊尔/藏传/欧美本地题材，但保留现藏海外的中国文物）→ Pillow 统一转码为长边 ≤1600 的渐进式 JPEG。12 种水墨 SVG 插画作回退与装饰。
- **钟声**：真实梵钟录音（長命寺，CC BY 2.1 JP）本地托管，未就绪时回退 Web Audio 多泛音合成；钟声播完前禁止再次撞钟。
- **Three.js 3D（v3）**：法音 / 祈福 / 灵签三页为可鼠标操控的 3D 场景，three 按需分包（约 707KB / 184KB gzip），无 WebGL 自动回退 SVG。**打开即播放，没有「开启 3D」按钮**（第 11 轮按用户要求移除；代价是三页首屏会下载 three，属视觉优先的取舍）。场景公共设施（`stage.ts`）统一提供轨道操控 / 点击拾取 / 软阴影接地 / 淡墨地台 / 自适应 DPR / 暖主光 + 冷轮廓光 / `prefers-reduced-motion` 降级。v3 梵钟为双壳钟身 + 莲座龙钮 + 阴刻铭文；v3 许愿树树干为沿 Frenet 帧生成的变径管、树冠为层叠针叶云片，树脚为**坡脚 + 根盘**（高度场土坡 + 板根 / 长根 / 苔点 / 半埋石，取消原先的水平切面与围石）。
- **设计系统（2026 v3 · 新中式极简）**：宣纸底 + 焦墨字 + 青瓷灰绿 + 朱砂印章红的水墨双色骨架；
  发丝描边 + 大留白 + 非对称栅格取代圆角卡片与投影堆叠，清除装饰性渐变、毛玻璃与 emoji/字符装饰；
  书法体收敛为点睛用途。统一 PageBanner（图文并置题头）/PageIntro/SectionHeading/Ornament/Reveal 组件、
  卡片分层阴影令牌、全局朱砂焦点环、View Transitions 页面切换动画（渐进增强）、滚动进度条、
  移动菜单滑下动画、`fetchpriority=high` 首屏关键图。详见 [docs/DESIGN.md](docs/DESIGN.md) 第 10 节。
- **水墨插画 v2**：十二式禅意 SVG 全部改为中国画语汇——宣纸底 + 墨分五色 + 单点朱砂印 + 计白当黑，动效改为自然物缓动（烟升/水纹/钟摆/云移/灯焰），取消弹跳与缩放。
- **古意字体**：霞鹜文楷正文 + 马善政/龙藏书法标题，本地托管 unicode-range 子集。

## 许可

页面代码 MIT；文章教材继承原“如说修行”网上佛学院之声明——为弘法利生，欢迎转载、演讲、翻印、出版、发行。
