# 设计系统 · 慧灯禅院

## 1. 网站名称

### 候选与选定

| 候选 | 意象 | 落选原因 |
| --- | --- | --- |
| **慧灯禅院** ✅ | 「慧灯」出自“慧灯常照”，喻般若智慧如灯；「禅院」具寺院庭院之实感，既是线上“院”，又有归属感 | —— 最终选定 |
| 云上般若 | 云上 = 云端，般若 = 智慧；现代感强 | 偏“产品名”，缺寺庙的场所感 |
| 净心佛学院 | 继承“佛学院”学制基因 | 学院味过重，与“数字寺庙”体验目标略有出入 |

- 中文名：**慧灯禅院**；英文名：**Huideng Zen Temple**
- 标语：**慧灯常照，点亮心灯** / *The lamp of wisdom ever shines — light the lamp within*
- 域名：sethfengli.github.io（用户根站点）；仓库：`sethfengli/sethfengli.github.io`

## 2. 信息架构与路由（HashRouter）

| 路由 | 页面 | 内容 |
| --- | --- | --- |
| `#/` | 首页 | Hero（禅意插画+每日法语）、禅院导览四卡、精选经论、三大修学门径、互动香炉 |
| `#/articles` | 佛学文库 | 309 篇，按院系筛选（净修院/禅修院/修学园地）+ 标题搜索 + 分页 |
| `#/articles/:slug` | 文章阅读器 | 封面插画、目录、进度条、字号/行距、5 种背景、翻译、上一篇/下一篇 |
| `#/dharma` | 法音宣流 | 互动撞钟（Web Audio）、圣号持诵计数、讲经音档预留位 |
| `#/prayer` | 在线祈福 | 供灯表单、愿望灯海、导出/导入 JSON、仅本地存储 |
| `#/lots` | 观音灵签 | 摇签动画、翻牌揭签、解签+禅语、收藏历史 |
| `#/about` | 关于本院 | 缘起、一脉相承、联系（GitHub Issues）、FAQ、版权声明 |

顶部导航 + 页脚（导览、仓库、联系方式、版权、免责声明）全站一致；404 页“回头是岸”。

## 3. 设计令牌

### 配色（Tailwind v4 `@theme`，见 `src/index.css`）

| 令牌 | 主色 | 用途 |
| --- | --- | --- |
| 檀木棕 sandalwood | `#6b4425`（700） | 主色调：标题、框架、页脚深底 |
| 藏红 tibetan | `#8c2f39`（600） | 强调色：CTA、签级徽章、链接 |
| 金 gold | `#c9a227`（500） | 点缀：分隔符、灯焰、进度条、徽记描边 |
| 米白 rice | `#fbf8f0`（50） | 页面底色 |
| 墨 ink | `#2b2620`（900） | 正文文字 |
| 月光蓝 moon | `#e9f0f8` | 夜间阅读主题、宁静区块 |

### 字体

- 正文/标题：思源宋体系（Noto Serif SC → Source Han Serif SC → Songti SC → SimSun 降级栈）
- UI：思源黑体系（Noto Sans SC → Source Han Sans SC → PingFang SC → Microsoft YaHei）
- 不引入网络字体，保证纯静态/弱网可用；如需自托管 Noto 字体，把 woff2 放入 `public/fonts/` 并在 CSS 中 `@font-face` 即可。

### 阅读排版

- 默认 18px / 1.9 行高，两字缩进，段距 1.1em，标题下划线分界；
- 5 种阅读背景以 CSS 变量实现（`--reader-bg/ink/heading/accent/link/rule/quote-*`），一键切换整篇配色；
- 参考佛光山/法鼓山数字内容：宽松行距、宋体正文、章节呼吸感。

### 间距与圆角

- 页面横向节奏 4/6（px），区块纵向 12/14/16；卡片 2xl（16px）圆角、按钮全圆角（佛珠意象）；
- 阅读列宽 ≤ 72ch，桌面三栏网格 232px(目录) + 正文，`max-w-7xl` 容器。

## 4. 组件与动效风格

- **禅意 SVG 插画**（`components/zen/ZenIllustration.tsx`）：12 种水墨/扁平风场景，全部本地矢量：
  莲花（涟漪+绽放）、香炉（青烟袅袅）、铜钟（摇摆+声波）、竹林（叶影）、远山（雾带+飞鸟）、
  明月（倒影波光）、禅圆（旋转虚线）、菩提叶（叶脉露珠）、经卷（木鱼敲击）、锦鲤（游动）、
  禅坐（光晕）、云海（浮云宝塔）。文章封面按 slug 关键词+稳定哈希分配。
- **互动香炉**：点击点燃心香，烟粒子升起（CSS keyframes）。
- **撞钟**：点击铜钟摇摆 + 声波扩散 + Web Audio 实时合成钟声（基频 220Hz + 2.0/2.42/3.18 泛音指数衰减）。
- **摇签**：签筒抖动 + 签条浮动 + 翻牌 3D（`rotateY` 0.9s cubic-bezier）。
- 动效原则：慢、柔、克制的“禅意节奏”（3~11s 循环），`prefers-reduced-motion` 下自动降级（`animated` prop）。

## 5. 无障碍与工程细节

- 语义标签（header/main/nav/footer/article/blockquote）、按钮 aria-label、进度条 `role="progressbar"`；
- 深色页脚对比度 ≥ 4.5:1；焦点可见（focus-visible ring 金色）；
- 所有用户数据（语言、阅读偏好、心愿、签文）键名 `hdc.*`，可用浏览器开发者工具随时清除。

## 6. 全站配色主题（佛教配色）

站点底色支持 **4 套主题**（2026 修订：整体告别土黄，改为轻快、积极的正能量色系），Header 调色按钮一键切换并记忆（`hdc.siteTheme`）：

| 主题 | 意象 | 底色/主色 |
| --- | --- | --- |
| 素白 · 清净（默认） | 米白宣纸 | 米白 `#fbf8f0` + 檀木棕 + 藏红 |
| 藏红 · 庄严 | 袈裟赤金 | 暖杏 `#fbf5ee` + 深赭 + 藏红 |
| 青瓷 · 琉璃 | 佛寺琉璃瓦 | 青白 `#f3f7f4` + 松石绿 + 藏红印章 |
| 黛青 · 禅夜 | 深夜禅堂 | 黛青 `#22252d` 暗底 + 金 + 浅檀 |

实现：`@theme` 中所有色板令牌指向 `--site-*` 运行时变量，`:root[data-site-theme=…]`
整体换肤（`src/index.css` + `src/lib/siteTheme.ts`）；深色主题按“用途映射”色阶以保证对比度；
深底区块的浅色文字使用恒定 `--color-paper`，金色按钮文字使用恒定 `--color-ink-950`。
阅读器 5 种正文背景独立于站点主题，互不干扰。

## 7. 真实照片与音档策略

- 文章封面/灵签页头图等使用 **Wikimedia Commons 免版权真实照片**（CC0/公有领域/CC BY*），
  本地托管 `public/photos/`（约 48 张，按目录序稳定分配、相邻文章不重复），
  抓取脚本 `scripts/fetch-photos2.mjs`，署名清单 `public/photos/CREDITS.md`；
  加载失败自动回退到禅意 SVG 插画（`CoverImage`）。`n- **站标与页面背景全部改用真实照片**：logo 为莲花照片（圆形描金裁切，`PhotoLogo`），`n  首页 Hero/文库横幅/关于/祈福页头均使用专用照片（lotus/hero/gate/lantern/garden/blossom/guanyin/bell），`n  且专用图会从文章封面池中排除，保证 UI 与封面不重复用图。
- 法音页梵呗与梵钟音档同样取自 Commons 并本地托管（`public/audio/`，
  `scripts/fetch-audio.mjs`，署名 `public/audio/CREDITS.md`）；撞钟默认播放真实梵钟录音，
  未就绪时回退 Web Audio 多泛音合成。