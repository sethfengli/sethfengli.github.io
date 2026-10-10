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

## 2. 信息架构与路由（BrowserRouter）

| 路由 | 页面 | 内容 |
| --- | --- | --- |
| `/` | 首页 | Hero（中国佛教图版 + 每日法语）、禅院导览四卡、精选经论、互动香炉 |
| `/articles` | 经典书架 | 294 篇，按院系筛选（净修院/禅修院/修学园地）+ 标题搜索 + 分页 |
| `/articles/:slug` | 文章阅读器 | 封面图版、目录、进度条、字号/行距、5 种背景、翻译、上一篇/下一篇 |
| `/dharma` | 静心听经 | 3D 撞钟（回退 SVG）、圣号梵音持诵计数、讲经开示外链 |
| `/prayer` | 点亮心愿 | 供灯表单、3D 许愿树（回退水墨松柏 SVG）、导出/导入 JSON、仅本地存储 |
| `/lots` | 观音灵签 · 灵棋经 | 3D 签筒摇签 + 居中浮动签文弹窗；灵棋经十二棋子掷卦与卦历 |
| `/about` | 关于本院 | 缘起、一脉相承、禅院掠影、联系（GitHub Issues）、FAQ、版权声明 |

顶部导航 + 页脚（导览、仓库、联系方式、版权、免责声明）全站一致；404 页“回头是岸”。
文档 `title` / `description` / `og:*` 由 `components/ui/RouteMeta.tsx` 按路由写入（文章页由阅读器自管）。

## 3. 设计令牌

> **2026 v3 修订（新中式极简）**：本节已按现行 `src/index.css` 重写。
> 旧版曾使用「檀木棕 + 藏红 + 鎏金」的暖黄体系，已于 v3 全面废止。

### 配色（Tailwind v4 `@theme`，见 `src/index.css`）

色板令牌名称**已按实义命名**（第 7 轮改名：`sandalwood-*` → `celadon-*`、
`tibetan-*` → `cinnabar-*`，共 314 处；第 8 轮改名：`gold-*` → `brass-*`、
`moon-*` → `mist-*`，共 107 处 —— 前者实为**黄铜**（非鎏金），后者是**青雾灰蓝**
（非月白）。此前的名字与实际颜色不符，是最大的可读性债）：

| 令牌 | 意象 | 用途 |
| --- | --- | --- |
| `rice-50…300` | 宣纸 | 页面底色、浅区块（默认 `#fbfaf7`） |
| `ink-900…100` | 焦墨阶 | 正文、次要文字、说明、禁用 |
| `celadon-*` | **青瓷灰绿** | 主色：描边、次要强调、深色页脚底（`celadon-950`） |
| `cinnabar-*` | **朱砂印章红** | 唯一高饱和强调：主按钮、当前态、下划线、kicker 短线 |
| `brass-*` | **黄铜**（`#ab8940` 一族，非鎏金） | 极少量点缀（不再作按钮底或大面积色块）；签位分档与梵钟「嗡」字 |
| `mist-*` | **青雾灰蓝**（`#7b96a1` 一族） | 极少使用；仅签位分档 |
| `surface` / `paper` / `on-accent` / `hairline` | 纸面 / 恒定宣纸白 / 强调底文字 / 发丝线 | 见 `@theme` 定义 |

**硬性规定**

- 装饰性高饱和色只允许朱砂红（`cinnabar-600`），一屏内不超过 2～3 处；
- 全面禁用 `bg-gradient-*` 做装饰性渐变；发丝线统一用 `border-hairline` / `bg-hairline` / `.hairline`。

### 字体（2026 第 6 轮：标题楷 / 正文宋 / 界面黑）

全站字体按**职能**三分，而不是按"好看"随手指定。中国出版的惯例本就是「正文宋、标题楷、界面黑」：

| 角色 | 令牌 | 汉字 | 用于 |
| --- | --- | --- | --- |
| 标题 | `--font-serif`（Tailwind `font-serif`） | 霞鹜文楷（楷体） | `h1/h2/h3`、刊头、板块题、文章标题、偈颂/诗句 |
| 正文 | `--font-song`（Tailwind `font-song`） | 宋体（Noto Serif SC / Songti SC / SimSun） | 段落、列表摘要、卡片说明、释义、说明性副题 |
| 界面 | `--font-sans`（Tailwind `font-sans`） | 思源黑体 | 导航、按钮、标签、数字、表单、目录 |
| 点睛 | `--font-brush`（Tailwind `font-brush`） | 马善政 / 龙藏 | 仅签文诗句、禅语祝福 |

**`body` 的默认字体是 `--font-song`（宋体）**，因此**未加字体类的正文元素自动落在宋体上**，
不必逐个标注 `font-song`；标题显式加 `font-serif`，界面显式加 `font-sans`。

> **为什么改**（第 6 轮动因）：此前正文与标题同走 `--font-serif`（汉字回退霞鹜文楷 · 楷体），
> 而全站 `font-weight` 一律 `font-normal`（不加粗）。楷体本身笔画粗细差小，
> 层级只能靠字号撑，长文读起来发"黏"，标题与正文也拉不开对比。
> 改为「标题楷 / 正文宋」后，层级来自**"写出 vs 印出"的质感差**而非字重——
> 全站至今仍一处也不加粗（`scripts/style-audit.mjs` 的 font-weight 一节可核）。
>
> 迁移脚本：`scripts/migrate-to-song.mjs`（把语义上是正文的 `font-serif` 逐行改为 `font-song`）。
> 对比工程：`preview/FontCompare.tsx`（`?mode=font`，同页并排两版，并读 computed style 验证
> 「只有正文变了」——实测标题 font-family 链与排版宽度两版完全一致）。

- 西文与中英混排：三套栈都把 `'Noto Serif' / 'Noto Sans'` 放在**汉字字体之前**，
  让西文走真正的拉丁衬线、汉字回退到中文族；不要把 `'Noto Serif SC'` 提前，
  它的西文字形与 Noto Serif 不同，会把中英混排的西文观感拉低。
- **未内置汉字 web font**：宋体依赖系统栈（macOS 宋体-简 / Windows 中易宋体 / Linux 思源宋体）。
  好处是零体积代价；代价是 Windows 上是中易宋体，观感弱于截图中用的 Noto Serif SC。
  若要全平台统一，需引入 `@fontsource/noto-serif-sc`——汉字全量字体体积可观，
  建议按需（只给正文区域）加载，属于可选增强，见 `scripts/RESUME.md §9.3`。
- 本地自托管 unicode-range 子集。

### 形状与阴影

- 圆角：`--radius-xs: 2px`（按钮、签、小控件）、`--radius-card: 4px`（容器）；
  **取消胶囊（`rounded-full`）与 16/24px 大圆角**；
- 阴影：`--shadow-card` 近乎不可见，仅作纸面微浮；`.card` / `.card-link` 默认**无投影**，
  靠发丝描边区分层级；`--shadow-lift` 仅用于真正的浮层（弹窗/抽屉）；
- 全面移除 `backdrop-blur`（毛玻璃）与 `drop-shadow`。

### 阅读排版

- 默认 18px / 1.9 行高，两字缩进，段距 1.1em，标题下划线分界；
- 5 种阅读背景以 CSS 变量实现（`--reader-bg/ink/heading/accent/link/rule/quote-*`），一键切换整篇配色；
- 参考佛光山/法鼓山数字内容：宽松行距、宋体正文、章节呼吸感。

### 间距与节奏

- 页面横向节奏 `px-5 sm:px-6`；区块纵向 `py-16 sm:py-20`～`py-20 sm:py-28`；
  卡片网格 `gap-6`～`gap-8`，优先非对称栅格（`lg:grid-cols-12` + `col-span-5/7`）而非一律等分三列；
- 阅读列宽 ≤ 72ch，桌面三栏网格 232px(目录) + 正文，`max-w-7xl` 容器。


## 4. 组件与动效风格

### 组件类（`src/index.css` `@layer components`，v3 语汇）

| 类 | 说明 |
| --- | --- |
| `.btn-primary` | 朱砂实底、方角（`rounded-xs`）、无投影 |
| `.btn-secondary` | 发丝描边幽灵按钮 |
| `.btn-gold` | 焦墨实底按钮（深色 CTA；v3 起改墨色，不再用金色渐变底） |
| `.btn-ghost` | 纯文字链接式按钮 |
| `.card` / `.card-link` | 纸面卡片：发丝描边、**无投影**；hover 只换描边，`.card-link:hover .card-media img` 轻微放大 |
| `.chip` | 细边小签 |
| `.hairline` | 横向发丝分隔线 |
| `.seal` | 朱砂小印（栏目点题，全站唯一的「红块」） |
| `.ornament` | 细线 + 单点分隔（**取代 ❖/✦ 字符装饰**） |
| `.section-kicker` | 朱砂短横线 + 字距小标 |
| `.section-title` / `.section-sub` | 区块主/副标题（宋体，非书法体、非粗体） |
| `.vertical-label` | 竖排小标 |

> v3 起页面横幅改为 `PageBanner` 的**图文并置**版式（左题头 / 右独立成框的照片，
> 照片全明显示，不再压雾化遮罩）；并新增 `PageIntro` 与 `Ornament` 两个通用组件。
> 详见 `docs/VISUAL-SPEC-v3.md`。

### 插画与互动

- **禅意 SVG 插画 · 水墨卷 v2**（`components/zen/ZenIllustration.tsx`）：12 种场景，全部本地矢量。
  v1 是「亮蓝天空 + 荧光绿 + 橘金」的卡通风，与站点骨架冲突，v2 全面改写为中国画语汇：
  1. 底色一律宣纸（`INK.paper` + 极轻纤维纹 `pattern`），不再用彩色渐变当天空；
  2. 山石叶器用「墨分五色」（`jiao/nong/zhong/dan/qing` 五级不透明度）做远近，不用色相；
  3. 全画唯一彩色是**青瓷绿**（远树、竹叶）与**朱砂**（印章、灯焰、露珠），各不超过一处；
  4. 每幅右下钤一枚朱砂小印（`Seal`），是中式画面的收束；
  5. 留白占一半以上——「计白当黑」；
  6. 动效改为自然物缓动：`.ink-smoke` 烟升、`.ink-ripple` 水纹外扩、`.ink-swing` 钟摆、
     `.ink-drift` 云移、`.ink-glow` 灯焰明灭、`.ink-bloom` 花叶轻颤——**取消弹跳与整体缩放**。
  文章封面按 slug 关键词 + 稳定哈希分配。
- **许愿树 SVG**（`components/zen/WishTree.tsx`）：中国水墨松柏。
  1. 树干由左右两条**对称单调收敛**的轮廓写成一笔焦墨（旧版两缘各自内凹，合起来是「沙漏」形）；
  2. 枝干分主枝 / 侧枝 / 细枝三级递减以见笔意，并压在树冠之上形成「枝在叶前」的笔序；
  3. 树冠是 20 个**互相咬合的松针簇**（每簇 30 根带弧度的针叶，按黄金角散开 + 确定性抖动），
     分三色阶拉开前后，各自以不同相位微晃——取代旧版「十几个绿球等距排开」；
  4. 飘带系在**真实枝桠坐标**上（`RIBBON_SPOTS`），用 path 自身摆动，不再靠百分比定位贴图；
  5. 旧版的粉色「樱花」补点（日本意象）已删除，改为**松果**与**点苔**；
  6. 背景是两层淡墨远山 + 三道留白云气，地面前景一笔坡岸。
- **互动香炉**：点击点燃心香，香头朱砂炭火明灭、墨线青烟上升（CSS keyframes）。
- **撞钟**：点击铜钟摇摆 + 声波扩散 + Web Audio 实时合成钟声（基频 220Hz + 2.0/2.42/3.18 泛音指数衰减）。
- **摇签**：签筒抖动 + 签条浮动 + 翻牌 3D（`rotateY` 0.9s cubic-bezier）。
- 动效原则：慢、柔、克制的“禅意节奏”（3~16s 循环），`prefers-reduced-motion` 下自动降级（`animated` prop）。

### 视觉预览工具（改 SVG / 插画必用）

纯 SVG 组件没有路由依赖，可单独打包后用无头 Chrome 截图肉眼核对，**不必启动整站**：

```bash
npx vite build --config preview/vite.config.ts        # 产物 → preview-dist/
node scripts/static-server.mjs preview-dist --port=5188   # 后台起静态服务
node scripts/shoot-preview.mjs --name=tree --w=1100 --h=1500
```

`preview/preview-main.tsx` 里渲染许愿树（有心愿 / 空枝两态）与十二式插画，
改组件后重跑上面三步即可对比。`build/shots/` 下留档。

## 5. 无障碍与工程细节

- 语义标签（header/main/nav/footer/article/blockquote）、按钮 aria-label、进度条 `role="progressbar"`；
- 深色页脚对比度 ≥ 4.5:1；焦点可见（全局 `focus-visible` 为朱砂描边，组件内不再各自定义金色 ring）；
- 所有用户数据（语言、阅读偏好、心愿、签文）键名 `hdc.*`，可用浏览器开发者工具随时清除。

## 6. 全站配色主题

站点底色支持 **4 套主题**（2026 v3：建立「青瓷灰绿 + 朱砂」水墨双色骨架，取消一切土黄与甜腻粉橘），
Header 调色按钮一键切换并记忆（`hdc.siteTheme`）：

| 主题 | 意象 | 底色 / 主色 / 强调 |
| --- | --- | --- |
| 宣纸 · 青瓷（`rice`，默认） | 宣纸上的青瓷 | 宣纸 `#fbfaf7` + 青瓷绿 `#789085` + 朱砂 `#b8382e` |
| 素笺 · 朱印（`vermilion`） | 暖宣纸、印章最重 | 暖宣 `#faf6f2` + 灰褐 `#8a6e5e` + 朱砂 `#c1362b` |
| 冷瓷 · 新绿（`celadon`） | 青瓷清爽、绿意更显 | 青白 `#f8fbf9` + 松绿 `#559278` + 朱砂 `#b8382e` |
| 焦墨 · 禅夜（`night`） | 深夜禅堂 | 焦墨 `#14161a` 暗底 + 鎏金 `#ab8940` + 浅墨字 |

实现：`@theme` 中所有色板令牌指向 `--site-*` 运行时变量，`:root[data-site-theme=…]`
整体换肤（`src/index.css` + `src/lib/siteTheme.ts`）；深色主题按“用途映射”色阶以保证对比度；
深底区块的浅色文字使用恒定 `--color-paper`，朱砂/深色按钮上的文字使用恒定 `--color-ink-950`；
另新增 `--site-hairline` 供各主题分别定义发丝线色。阅读器 5 种正文背景独立于站点主题，互不干扰。

## 7. 图版与音档策略（2026 第 5 轮：全面换为中国传统佛教题材）

**动因**：上一版配图来自 Wikimedia Commons 的宽泛分类（`Statues of Guanyin`、`Temple bells`、
`Buddhist temple interiors`…），结果混入大量日本、韩国、越南、泰国、印度、尼泊尔、藏传题材，
以及欧美博物馆的异域陈设（武士刀镡、象牙雕、欧洲香炉、清真寺）——与汉传佛教的场所气质不符。

**现行口径（硬性）**：**只用中国传统佛教题材**。

| 桶 | 内容 | 来源分类（Commons，已实测） |
| --- | --- | --- |
| `paintings` | 敦煌经变、宋元明清绢画、水墨观音、台北故宫立轴 | `Buddhist paintings from China`（含各馆子类）、`Buddhist paintings of the Tang/Ming Dynasty`、`Mogao Caves`、`Paintings of Guanyin` |
| `grottoes` | 云冈 · 龙门 · 大足 · 炳灵寺 · 乐山 | `Yungang/Longmen Grottoes`、`Dazu Rock Carvings`、`Bingling Temple`、`Leshan Giant Buddha` |
| `statues` | 北魏至清造像：石雕、木雕、鎏金铜、大理石、德化白瓷 | `Buddhist sculptures from China` 及各材质子类、`Statues of Guanyin in China` |
| `halls` | 殿宇、山门、佛塔 | `Buddhist temples in China/Hong Kong/Taiwan`、`Pagodas in China`、`Mahavira Hall` |
| `sutras` | 敦煌写经、金刚经刻本、经文拓片 | `Dunhuang manuscripts`、`Diamond Sutra` |
| `landscape` | 山水、云海、松林 | `Shan shui`、`Huangshan`、`Mountains of China` |
| `lotus` | 莲池（净土意象，只取中国产地） | `Lotus ponds in China` |

**流水线**（`scripts/`，四步，可重跑）：

1. `collect-pool.mjs` → 遍历上表分类，列出全部候选到 `cn-pool.json` / `cn-pool.txt`（约 810 条，供眼筛）；
2. `curate-cn.mjs` → 人工按 ID 精选（`PICKS`）并**二次排雷**（日/韩/越/泰/印/尼泊尔/藏传/欧美本地题材一律剔除，
   但**保留现藏海外的中国文物**）→ `cn-picked.json`；
3. `fetch-cn-picked.mjs` → 下载并统一转码（Pillow：长边 ≤1600、sRGB、渐进式 JPEG q84）→
   `public/photos/cn/<桶>-NN.jpg` + `CREDITS.md` + `src/data/photos-cn.json`；
4. 具名图（Hero / 各页题头 / 关于页拼贴）在 `src/lib/content.ts` 的 `NAMED_PHOTOS` 中按固定索引取自各桶。

> **已知脆弱点**：`NAMED_PHOTOS` 目前按「桶内第 N 张」硬编码，
> 桶内容变化（增删候选）会让具名图漂移。**下一轮建议**改为在下载阶段把具名映射写进
> `photos-cn.json` 的 `named` 字段，由清单驱动而非硬编码索引。

**分配**：`src/lib/content.ts` 的 `poolFor(school)` 按院系组桶并加权（佛画/石窟权重最高），
`photoForSlug` 以目录序 ×7 步长取图，保证同院系相邻文章不同图；具名图见 `NAMED_PHOTOS`。
加载失败一律回退到水墨插画（`CoverImage`）。

> **坑（已踩）**：① Commons 上大量中国佛画是 **PNG/TIFF**，若在下载层按 JPEG 魔数过滤会整批丢弃，
> 必须把格式判定交给 Pillow；② 中国佛画多为「立轴 + 大片留白」，结构/颜色指纹高度相似，
> **任何自动判重阈值都会误杀真品**（实测把《释迦三尊图轴》与《罗汉图轴》判成同一张），
> 故人工精选清单下**默认关闭判重**（`DEDUP=1` 才开）。

- 删除配置：`scripts/probe-cats.mjs`（探测分类是否真实存在及其文件数）、
  `scripts/shoot-preview.mjs` + `scripts/static-server.mjs` + `preview/`（把纯 SVG 组件单独打包后用无头 Chrome 截图肉眼核对）。
- 音档仍取自 Commons 并本地托管（`public/audio/`，`scripts/fetch-audio.mjs`，署名 `public/audio/CREDITS.md`）；
  撞钟默认播放真实梵钟录音，未就绪时回退 Web Audio 多泛音合成。
- 站标为「印面」式方裁图版（`PhotoLogo`，细微圆角 + 发丝描边，取消圆形金环与投影）。
## 8. Three.js 3D 场景（2026 修订）

- `/dharma`：3D 铜钟（木架 + 撞木击钟 + 声波金环 + “嗡”字浮升），点击铜钟或按钮撞钟（播完前禁点）；
- `/prayer`：3D 许愿树（绿冠樱花 + 红绸飘带心愿 + 香炉烟雾粒子），点击飘带查看心愿、点击香炉供香；
- `/lots`：3D 朱漆描金签筒（回纹金带、卍字莲徽、廿四签支），点击摇签 + 一签飞升；
- 全部支持**鼠标拖拽旋转 / 滚轮缩放 / 双指捏合**，空闲自动缓慢旋转，滚动出视口自动暂停；
- three.js 以 `import('three')` 动态分包（~190KB gzip），仅这三个页面按需加载；无 WebGL 时自动回退原 2D SVG。
## 9. 第五轮精修（2026）

- **灵签页**：3D 鼎式香炉（三足双耳、回纹莲纹贴图、炉内香灰、香头灰白香灰+暗红炭火、蛇形袅袅青烟粒子）；签筒纹理加竖排金字「觀音靈籤 / 有求必應 / 慈航普渡」；观音像改用真实照片；签文改为**居中浮动弹窗**（光晕+旋转放大入场，Esc/遮罩关闭），解签由按钮展开、禅语祝福与解签一体。
- **祈福页**：千年松柏原型（虬曲老干多段锥柱 + 平展枝干 + 松针簇贴图云片冠层）；红绸飘带三段拆分逐段摆动（长短/色阶/相位随机、风起飘逸）；**取消自动旋转**，仅鼠标拖拽旋转 + 滚轮/捏合缩放（4.5~46 距离）。
- **法音页**：梵钟按真实形制改型放大（收肩、鼓腹、撇口、撞座），钟体五列竖排铭文随机轮换（佛号/吉语）、钟架匾额「慧燈禪院」+随机吉语；停自转仅鼠标操控；讲经开示改为**四家道场官方外链**（佛光山 iBuddha / 法鼓山 / 慈济大爱 / 灵鹫山）。
- **文章页**：目录智能编号（标题自带「一、/1./（一）」开头则不再前置标号）；迁移脚本删除正文开头“目录式表格”（前 8 块内、单元格半数以上为章节标题）。
- **关于页**：侧边吸附分节导航（滚动高亮）、数字带、8 张照片墙、滚动渐入动画。
- **Banner**：全部换 1600px 高清明亮照片（8 张具名图重新抓取），遮罩减淡、照片全明显示。
  → *v3 已进一步废止「照片铺满 + 雾化遮罩」的横幅做法，改为图文并置，见下节。*

## 10. v3 视觉重构（2026）· 新中式极简

**动因**：旧版存在五处明显「显旧」的观感问题 ——
① 照片铺满再压雾化遮罩，画面发灰、层次尽失；
② 处处圆角胶囊 + 投影堆叠，像 2015 年的模板；
③ 用 emoji 与 ❖/✦ 字符做装饰；
④ 书法体遍布所有标题，装饰疲劳；
⑤ 毛玻璃 `backdrop-blur` 泛滥。

**改法**：

1. **令牌重映射**（`src/index.css`）：色板名沿用，含义改为「宣纸 + 焦墨 + 青瓷灰绿 + 朱砂印章红」，
   新增 `--color-hairline` / `--site-hairline`、`--radius-xs`、`--shadow-lift`；
   4 套站点主题与 5 套阅读主题同步重配。
2. **形状语言**：`rounded-full` 胶囊 → `rounded-xs`（2px）；`rounded-2xl/3xl` → `rounded-card`（4px）；
   装饰性渐变、`backdrop-blur`、`drop-shadow`、卡片级 `shadow-*` 全部清除，
   改用发丝描边 + 大留白建立层级；`shadow-lift` 仅留给真正的浮层。
3. **横幅重构**（`PageBanner`）：改为**左题头 / 右独立成框照片**的杂志式并置，
   照片全明显示、外框错位一条青线；文字不再依赖重投影。
   新增 `PageIntro`（非照片型页头，左对齐）与 `Ornament`（细线+单点，取代 ❖/✦）。
4. **版式**：首页改为「并置题头 → 每日法语非对称并置 → 发丝网格导览 → 主推经典大图 + 次级条目列表」；
   文库由卡片网格改为**发丝线分隔的条目列表**（缩略图 + 题名 + 作者 + 阅读时长）；
   阅读器题头左对齐并加朱砂印，工具条改实底发丝线、`☰/⚙/✕` 字符换为内联 SVG。
5. **装饰清理**：全站 emoji（🪔📖✉️📚📜🔔📿🎨🪷🎲）与 `❖/✦/✧/✓/←/→` 字符装饰清零，
   一律换为同色系内联线性 SVG 或 `.seal` / `.ornament`。
   顺带删除已无 CSS 定义的 `zen-divider` 用法。
6. **字体分级**：书法体仅保留在签文诗句等点睛处，页头与区块标题统一宋体且**不再加粗**。

**规范文档**：`docs/VISUAL-SPEC-v3.md`（本轮重构的硬性约定，改版完成后可归档）。

> 注：divination 页面的分数徽章、签位棋子、卦历条目等由圆形改为方角印面；
> `ring-*` 粗描边与 `focus-visible:ring-*` 组件级覆盖已移除，统一走全局朱砂焦点环。
