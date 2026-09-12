# 视觉重构规范 · 新中式极简（v3）

> 本文件是**本轮视觉重构的唯一权威约定**。改动前请通读；所有页面必须严格遵守，
> 以保证全站风格统一。重构完成后可删除本文件。

## 1. 设计意图

旧版问题（务必逐条消除）：

1. **照片铺满 + 雾化遮罩** → 画面发灰、层次尽失；
2. **处处圆角胶囊 + 投影堆叠** → 廉价、像 2015 年的 Bootstrap 模板；
3. **emoji 与 ❖/✦ 字符做装饰** → 非常显旧；
4. **书法体用在所有标题** → 装饰疲劳；
5. **毛玻璃 backdrop-blur 泛滥** → 花哨。

新版语汇：**宣纸底 + 焦墨字 + 青瓷灰绿 + 朱砂印章红**，
用「发丝描边 + 大留白 + 非对称栅格 + 细线」建立秩序。装饰极少、克制、清透。

## 2. 颜色令牌（名字沿用，含义已重映射）

| 令牌 | 新含义 | 用法 |
| --- | --- | --- |
| `rice-50/100/200/300` | 宣纸底（近白） | 页面底、浅区块 |
| `ink-900/700/500/300/100` | 焦墨阶 | 正文、次要文字、说明、禁用 |
| `sandalwood-*` | **青瓷灰绿**（主色） | 描边、次要强调、深色页脚底（`bg-sandalwood-950`） |
| `tibetan-*` | **朱砂印章红**（唯一高饱和强调） | 主按钮底、当前态、下划线、焦点环、kicker 短线 |
| `gold-*` | 鎏金（极少量） | 仅偶发点缀，不要大面积使用 |
| `moon-*` | 冷灰蓝 | 极少使用 |
| `surface` / `paper` / `on-accent` / `hairline` | 纸面 / 恒定宣纸白 / 强调底上的字 / 发丝线色 | 见下 |

**硬性规定**

- 装饰性高饱和色**只允许朱砂红**（`tibetan-600`），一屏内不超过 2～3 处。
- 金色不再做渐变按钮或大面积底色；`bg-gradient-*` 一律清除。
- 发丝线统一用 `border-hairline` / `bg-hairline` / `.hairline`，不要再用 `border-sandalwood-200/70` 这类半透明描边。

## 3. 组件类（`src/index.css` 已定义，直接用）

| 类 | 说明 |
| --- | --- |
| `.btn-primary` | 朱砂实底方角按钮（主 CTA） |
| `.btn-secondary` | 发丝描边幽灵按钮 |
| `.btn-gold` | 墨黑实底按钮（深色 CTA） |
| `.btn-ghost` | 纯文字链接式按钮 |
| `.card` | 纸面卡片：发丝描边，**无投影** |
| `.card-link` | 可点击卡片，hover 只换描边；`.card-link:hover .card-media img` 会轻微放大 |
| `.chip` | 细边小签（`rounded-xs`） |
| `.hairline` | 横向发丝分隔线 |
| `.seal` | 朱砂小印（栏目/标签点题，全站唯一的「红块」） |
| `.ornament` | 细线 + 单点分隔（**取代 ❖/✦**） |
| `.section-kicker` | 朱砂短横线 + 字距小标 |
| `.section-title` / `.section-sub` | 区块主/副标题（宋体，非书法体） |
| `.vertical-label` | 竖排小标（可选） |

## 4. 硬性替换清单

| 禁止 | 替换为 |
| --- | --- |
| `rounded-full`（按钮/签/徽章） | `rounded-xs`（2px）或 `rounded-card`（4px） |
| `rounded-2xl` / `rounded-3xl`（卡片） | `rounded-card` 或 `rounded-xs` |
| `shadow-md` / `shadow-lg` / `shadow-xl` / `shadow-2xl` / `shadow-sm`（卡片、弹窗） | 删除；改用 `border border-hairline`，需要浮起时用 `shadow-lift`（仅弹窗/抽屉） |
| `backdrop-blur` | 删除；改用不透明底色 |
| `bg-gradient-to-*` / `from-*` / `via-*` / `to-*` | 删除；改用实底或发丝线 |
| emoji（🪔 📖 ✉️ 📚 📜 🔔 📿 🎨 🪷 🎲） | 删除，或换成同色系内联 SVG / `.seal` |
| `❖` `✦` 字符装饰 | `.ornament` 或 `.hairline` |
| `font-brush` 大面积使用 | 仅 `PageBanner` 之外的**偶尔**点睛可保留；区块标题统一 `font-serif` |
| `text-gold-600` 小标 | `section-kicker`（朱砂） |
| 圆角胶囊容器 `rounded-full ... p-1`（分段切换器） | 方角细边容器 + `rounded-xs` 选项 |
| `ring-4` / `ring-2` 粗环 | `border border-hairline` |

## 5. 版式与节奏

- 容器：`mx-auto max-w-6xl px-5 sm:px-6`（阅读器可用 `max-w-7xl`）。
- 区块纵向间距：`py-16 sm:py-20`，重要区块 `py-20 sm:py-28`。
- 卡片网格：`gap-6`～`gap-8`；**优先非对称**（如 `lg:grid-cols-12` + `col-span-5/7`），
  避免一律等分三列。
- 标题层级：`section-kicker`（朱砂小标）→ `font-serif` 大标题（`text-2xl`～`text-4xl`）
  → `section-sub` 副题；标题**不再加粗**（`font-normal`），靠字号与留白建立层级。
- 分隔：优先用 `<hr className="hairline" />` 或 `.ornament`。

## 6. 交互与动效

- 过渡只保留 `transition-colors` / `transition-opacity`，时长 200–300ms。
- 卡片 hover：换描边色（`hover:border-sandalwood-500`）+ 图片微缩放，**不再位移抬起**。
- 链接 hover：`hover:text-tibetan-600`。
- 焦点环已全局定义为朱砂色，不要覆盖。
- `prefers-reduced-motion` 已全局处理，不要新增无限循环的大幅动效。

## 7. 无障碍（不可回退）

- 保留所有 `aria-*`、语义标签、`aria-label`、`inert`、`role`。
- 保留键盘可达性；**不要**移除 `cursor-pointer` 与 `type="button"`。
- 深色底上的文字对比度 ≥ 4.5:1；`bg-sandalwood-950` 上用 `text-paper` / `text-paper/70`。
- 仅替换 emoji 时，必须同时删除其 `aria-hidden` 包装或保留等价可读文本。

## 8. 禁止事项

- 不要改任何业务逻辑、状态管理、i18n key、路由、数据结构。
- 不要改 `src/i18n/*`、`src/data/*`、`src/content/*`、`src/lib/*`（除非纯样式相关）。
- 不要新增依赖。
- 不要删除既有功能区块（3D 场景、表单、导出/导入、计数器等）——只换皮肤。
