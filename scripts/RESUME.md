# 慧灯禅院 · 工程状态 / 流程 / 坑

> `D:\FengLi\Web\fou\huideng-chanlin` · Vite + React 19 + React Router 7 + Tailwind v4 + three.js r185。
> 本文件是**唯一入口**：现状、命令、判据、坑。逐轮的实测明细**不再留在这里**（见 §7 的提交索引，
> 需要时 `git show <sha>`）。
>
> **维护纪律：本文件目标 ≤ 300 行。** 一轮做完，只把「下一轮还会踩的」写进 §5，
> 其余写进提交信息。不要回灌过程叙事——第 13 轮它曾长到 108 KB / 1319 行，读它比干活还贵。

## 0. 先看这五条（第 14 轮踩出来的）

1. **改 3D 画面先跑 `npm run audit:framing`**（纯 Node，不开浏览器）。它把「主体是否完整入画、
   香头有没有贴边」算成 NDC 断言。第 14 轮首页香炉「放太大、看不到燃烧的香」正是
   `tsc` / `vite build` / 所有既有 audit 全绿、只有截图能看出来的那类问题——现在一半能先算出来。
2. **不要为了截图升级权限。** 受限沙箱里无头 Chrome 一定起不来（crashpad `OpenProcess: Access denied`），
   `vite build` 也可能 `spawn EPERM`。顺序是：**先算 → 再让用户在本机跑一行截图 → 最后才谈权限**（§3.3）。
3. **含中文的文件禁止用 PowerShell 回写**（`Set-Content -Encoding utf8` 会双重编码）。用 `edit` 工具
   或 Node `writeFileSync(p, s, 'utf8')`。
4. **命令行里不要内联复杂 JS**：PowerShell 会吃掉单双引号。一次性脚本写成 `scripts/*.mjs` 再跑。
5. **改过文案/正文必须重跑字体子集**（`scripts/make-song-subset.mjs`），否则新字静默掉回系统字体。

## 1. 当前状态（实测）

| 项 | 值 |
| --- | --- |
| 内容 | **294 篇**文章（`articles/*.json` 中文源 + `en/*.json` 英文全文）· `catalog-en.json` 294 · 灵棋经 125 卦 + 观音签 32 支 · 每日法语 77 条 |
| 图版 | 7 桶 **239 张**（WebP）· 清单 == 磁盘 · 孤儿 0 · 缺口 0 |
| `npm run typecheck` | 通过 |
| `npm run build` | 通过（7.5s，第 14 轮实测） |
| `npm run audit:framing` | 通过（第 14 轮新增） |
| `npm run audit:banners` | 0 error · 0 warn |
| 首屏体积（第 12/13 轮实测，改完用 `probe-route-cost.mjs` 重测） | `/` 624.8 · `/articles` 605.2 · `/about` 645.4 · `/dharma` 1341.9 · `/prayer` 1358.2 · `/lots` 1371.3 KB |
| 主包 | `index` 286.96 KB / gzip 92.97 · `three` 724.16 / 184.42（只在 3D 页下载） |
| 字体 | Noto Serif SC 项目子集 **1.39 MB** + 马善政子集 **382 KB** + latin 0.18 MB |
| git | 已提交、**未 push**（push 由用户做，GitHub Pages 有 ~10 分钟缓存，看线上要硬刷新） |

## 2. 目录与产物

```
src/pages/            路由页（Home · About · Dharma · PrayerWall · Lots · Articles · Article）
src/components/zen3d/ three.js 场景（stage.ts 是共用底座：相机/交互/阴影/取景）
src/components/zen/   SVG 回退件（TempleBell · WishTree · IncenseBurner · LotCylinder · HuiLamp）
src/data/             verses.ts（每日法语）· lots.ts（签）· photos-cn.json（图版清单）
src/content/          articles/*.json（中文源，权威）· en/*.json（英文）· catalog*.json · lingqi*.json
public/photos/cn/     图版成品（WebP）；_raw/ 不入库
scripts/*.mjs         全部工具（26 个可复用工具已从 build/ 搬来）
scripts/*.md.archived 已执行完的历史计划，**不要当待办读**
docs/                 DESIGN.md（设计系统）· VISUAL-SPEC-v3.md
dist/ build/          gitignore：构建产物 / 临时区（只放生成物，自删）
```

## 3. 流程

### 3.1 日常核对（按改动类型挑，不必全跑）

```powershell
npm run typecheck                  # 永远跑
npm run audit:framing              # 动过 zen3d/ 或页面里的 3D 段落
npm run audit:banners              # 动过具名图 / 横幅
npm run build                      # 要出 dist 时（需子进程权限，见 §3.3）
node scripts/style-audit.mjs       # 动过样式/令牌/插画
node scripts/check-buckets.mjs     # 动过 PICKS（图版选图）
node scripts/check-font-coverage.mjs  # 动过文案/正文（新字是否在子集里）
node scripts/validate-en.mjs       # 动过文章正文/英文
node scripts/verse-audit.mjs       # 动过 verses.ts
```

### 3.2 判据脚本（看什么 / 什么时候算失败）

| 脚本 | 判据 |
| --- | --- |
| `check-framing.mjs`（`audit:framing`） | 3D 主体投影 NDC ≤ 0.97、香头有余量、包围盒含青烟；页面写死 `distance` 不得小于自动取景。exit 1 = 构图回退 |
| `audit-banners.mjs` | 具名图必须在声明的桶里、按 16:10 / 4:3 cover 的保留面积、人工禁用清单（文字标牌/色卡/电线）。exit 1 = 有 error |
| `check-buckets.mjs` | 清单条数 == 磁盘张数 == PICKS 条数，且 `slot == 下标+1` |
| `pool-drift.mjs` | `cn-picked.json` 每条与 pool 同 id 的 title **全等**（⚠ 池子自身选错时也「全等」，见 §5.4） |
| `check-font-coverage.mjs` | 逐字查 woff2 的 cmap（纯 Node，不需要 fonttools）；扫 `src/**` **含注释** |
| `style-audit.mjs` | 装饰符 / 圆角与投影 / 旧令牌 / svg 缺 aria / img 缺 alt 全为 0 |
| `verify-3d-gate.mjs` | 三个 3D 页的 canvas 都挂载 |
| `probe-route-cost.mjs` | 各路由首屏字节数（体积回退的唯一判据） |
| `verse-audit.mjs` | 法语条目：重复 / 缺英文 / 英文夹汉字 / 过长 |

### 3.3 权限：什么必须完整权限，怎么绕

受限沙箱（`workspace-write`）里**必然失败**的三件事：

- **任何 `stdio:'pipe'` 的 spawn**（`spawnSync(..., {encoding})`、`exec`、`execFile`）→ 裸 `EPERM`。
  vite 的 `optimizeSafeRealPathSync` 内部用 `exec`，所以 `vite build` 会报
  「failed to load config from vite.config.ts」+ `spawn EPERM` —— 看着像配置坏了，其实是沙箱。
  `stdio:'ignore'` / `'inherit'` 的 spawn **能跑**。
- **无头 Chrome**：crashpad `OpenProcess: Access denied` →「crash server failed to launch」→ 自终止。
  默认参数下必崩（第 14 轮实测）。`--no-sandbox` / `--disable-crash-reporter` / 临时 profile 这几条
  **没有逐一试过**，但不值得试：crashpad 是被「禁止 OpenProcess」卡住的，属进程权限，不是浏览器开关。
  真要再试，只试一条：`--headless=old`（老实现不起 crashpad handler；本机 155 上仍能 `--dump-dom`，
  但是否真是老实现、沙箱下能否起来，都**没有验证**）。
- **写工作区**（视策略）：`writeFileSync` / `renameSync` 可能裸 `EPERM`，`dist/` 会静默变陈旧。

所以按这个顺序走：

1. **先算。** 几何 / 布局 / 取景 / 文案一致性都能在 Node 里判定（`check-framing.mjs` 是模板）。
2. **再让用户跑截图。** 需要像素级判断时，把一行命令交给用户（他有完整权限）：
   ```powershell
   node scripts/shot-gated.mjs --base=http://127.0.0.1:5193 --out=build/shots/x
   ```
   截图脚本本来就用 `os.tmpdir()` 的 profile + `stdio:'ignore'`，在本机能跑。
3. **最后才谈升级权限**，并且先说清「为什么非看不可」。

## 4. 内容与数据

- **正文不在 `blocks[].text` 里**，在 `blocks[].inline[].s`（`text` 多为空串）。取法：
  `Array.isArray(b.inline) ? b.inline.map(s => s.s ?? '').join('') : (b.text ?? '')`。
- **中文源是权威**，改 `articles/<slug>.json`。但英文页署名读 `en/*.json`（再汇总进
  `catalog-en.json`）→ **改 author 必须同时决定 en 侧**，否则英文留错署名。
- **单字段改动用行级外科编辑**：`en/*.json` 的缩进与行尾不统一（1/2 空格、LF/CRLF 并存），
  整体重序列化会把一篇变成「全文重排」的巨型 diff。要求 diff 恰为 1 行，改完 `JSON.parse` 回验。
- **`git status` 有 CRLF 噪声**（`core.autocrlf=true`，工作区 LF / blob CRLF）：判据用
  `git diff --numstat` 或 `git hash-object <f> == git rev-parse HEAD:<f>`，不要只看 `git status`。
- 每日法语（`src/data/verses.ts`，77 条）：流程见下，判据跑 `verse-audit.mjs`。

  ```powershell
  node scripts/verse-candidates.mjs --top=200 --json=build/verse-candidates.json  # 挖候选
  node scripts/verse-audit.mjs                                                     # 机械体检
  ```
  口径：正文 3–44 字；`source` / `en.text` / `en.source` 齐全；英文是雅信达重写、不逐字直译、
  不夹汉字；去标点后不得重复；单一出处别超过 10 条。**出处不要臆造**：查不到就写「禅门古德」或不用。

## 5. 坑（按主题，全部实测）

### 5.1 文件与编码

- **PS `Set-Content -Encoding utf8` 会双重编码**（`行` → `è¡Œ`，无 BOM、仍是合法 UTF-8，
  所以 `tsc` / JSON 解析都不报错）。回写用 `edit` 或 Node，自检 `(s.match(/\uFFFD/g)||[]).length === 0`。
- **here-string 写补丁脚本会把中文变 `?`**（`Out-File -Encoding ascii`）：补丁脚本只放 ASCII。
- **PS 5.1 的 `[IO.File]` 相对路径跟着进程 CWD 走**，`cd` 不改变它 → 用绝对路径（或 `edit` 工具）。
- 脚本行尾 CRLF / LF 并存（`curate-cn.mjs` 是 CRLF）→ 写正则改文件一律 `\r?\n`。

### 5.2 Shell 与脚本

- 命令行**不要内联复杂 JS**（引号会被吃：`Expected ident` / `Unmatched )`）。写 `scripts/*.mjs`。
- PowerShell 脚本里的字符串常量只用 ASCII，中文只放注释。
- `fs.rmSync(p, {recursive:true, force:true})` 在「什么都没删」时也返回成功：判据要前后各 `existsSync` 一次。
- 槽位号正则别写死位宽：`grottoes-01` 是两位数字，`[0-9]{3}` 对它必然 false（用 `[0-9][0-9][0-9]?`）。

### 5.3 沙箱

- 见 §3.3。补充：**策略层拒绝**会打印 `[sandbox: file access denied under <mode> mode]`，
  **OS 层**只有裸 `EPERM`（无标记）——后者要自己定位，别误判成「脚本坏了」。
- `dist/` 是否新鲜**不要只看 mtime**：验产物里是否含当前源码的特征串。

### 5.4 图版管线

- **`named(key, bucket)` 的第二个参数是「校验桶」**：`named.<key>` 指的文件不在该桶内会**静默**退回
  该桶第一张（第 13 轮「关于本院」横幅变成石窟浮雕就是这个）。换图后**先跑 `audit:banners`**。
- **改 `PICKS` 是两步**：`curate-cn.mjs`（PICKS → `cn-picked.json`）再 `fetch-cn-webp.mjs`。
  只改 PICKS 就抓图会照旧按旧 id 下载，日志还打印旧标题。
- **换 id 必须换同一位置**（编号恒等于下标+1）；换之前用 `screen-cands.mjs` 过一遍 `TITLE_REJECT`，
  被剔的 id 不进清单会让后面下标整体前移。
- **`--only=<桶>` 曾把其余桶从清单静默删掉**（已修，`persist()` 带 `carry`）；若清单被删过键，
  必须跑一次不带 `--only` 的全量才能重建。
- **`photos-status` 退出码 0 ≠ 桶内齐了**（只看空桶/具名图损坏）。真判据是 `check-buckets.mjs`。
- **别用缩略图拼 contact sheet 核对题材**：会错位（把石窟看成停车场）。逐张看全尺寸；
  池子标题也可能与画面不符。
- 白瓷/白底图不能做 4:3 缩略图（跟纸底糊成一片）——同一语义可以有两个具名键（`guanyin` / `guanyinArt`）。

### 5.5 3D 场景

- **取景不许页面猜数字**：主体不在 y=0 的场景（香炉、灯、树）走 `bounds → targetY → fitDistance`
  （`stage.ts` / `censer.ts`）。页面写死 `distance=10` 就是第 14 轮香头出画的直接原因。
- **发光件必须露在最外层**：香头炭火球原来埋在香灰筒里，构图对了也看不出「在燃烧」。
- **纸底上的青烟不能用 `AdditiveBlending`**：白上加白 = 一颗颗硬边白球。普通混合 + 冷灰
  （`0x74827d`）+ 峰值 0.24 + `sin(πk)` 生命周期。
- 浅色纸底 + `addInkGround` = 方形灰边；单件小物只铺 `addCatchShadow`。
- 3D 枝干接缝别用「套袖/树瘤」：把枝的起点退到干内、出干角度 ~40°、树干半径收到梢部。
- SVG 回退树的白缝：先铺完整 `TRUNK_BASE` 再叠明暗。
- `PCFSoftShadowMap` 在 three r185 已弃用 → `PCFShadowMap`。
- **Chrome 临时 profile 必须放 `os.tmpdir()`**：放仓库里会被 vite dev 的 watch 锁成 `EBUSY`，dev server 直接崩。
- CDP 截图 `clip` 是**文档坐标**（要加 `scrollY`），不是视口坐标。
- **`Contained3D` 视口门控后的场景在 DOM 里没有 canvas**：截图要先滚到那一段
  （`scripts/shot-gated.mjs` 就是干这个的；`shot-3d.mjs` 对这类页面永远「未找到 canvas」）。

### 5.6 文案、字体与体积

- 字体覆盖扫描**包含注释**：写「蘑菇 / 铝桶」这类注释会凭空多出未覆盖字，被误判成子集过期。
- Tailwind v4 把 `@theme` 的值**内联进工具类**，产物 CSS 里搜不到 `--color-*` →
  令牌判据读 `probe-colors.mjs` / `probe-lot-badges.mjs` 的 computed 值，不要 grep 产物。
- 令牌改名用**令牌-数字边界**正则（`\b(gold|moon)-(\d{2,3})\b`），散文词天然不受影响。
- 3D 一律 `lazy()` + 视口门控：`three.js` 是独立的 724 KB chunk，首页那一段首屏不下载。
- 文案位置：中文界面文案在 `src/i18n/zh.ts` + `en.ts`（键由 `tsc` 对齐），文章正文在 `content/`。

## 6. 剩余项（全部可选，非缺陷）

| 项 | 规模 | 建议 |
| --- | --- | --- |
| (a) 音标/专名第二轮 | ASCII → 变音符 ~2,905 处 / ~169 文件 | **不做**。两套拼写都合法，是唯一有回归风险的改动。若做：只统一变音符、保留原有大小写、href 硬守卫 |
| (b) `meta-scan` 归零 | 13 条 | **不做**：13 条全是真署名，扫描器口径问题 |
| (c) 每日法语扩容 | 每轮 20–40 条 | 想做就做，判据见 §4 |
| (d) 发布 | — | 本机 `npm run build` → push；线上有 ~10 分钟缓存 |

## 7. 历史（提交索引）

逐轮明细（改了什么、测了多少、当时的坑）在提交信息里，需要时 `git show <sha>`。
更早的轮次（翻译工程 A/B 期、缺陷修复 1–3 轮、第 6–8 轮站点改造）：`git log --oneline`。

| commit | 一句话 |
| --- | --- |
| `3c7e06b` | 第 14 轮：首页「一炷心香」取景修正（相机看主体中心 + 距离自适应 + 香头光晕 + 青烟改普通混合） |
| `a159413` | 第 13 轮：关于页重排 + 图片灯箱 + 慧灯 3D；修横幅具名桶错配 |
| `c33eeab` | 首页重排与图版换新；许愿树树脚改坡脚根盘 |
| `63891a2` | 三页 3D 改为直接播放；梵钟 / 许愿树 v3；每日法语 31→77 |
| `c83c88d` | `/dharma` `/prayer` `/lots` 的 3D 改按需开启（后被 `63891a2` 按用户要求改回直接播放） |
| `ae7e263` | 路由级懒加载 + three.js 视口门控（首屏 1824.5 → 615.6 KB） |
| `5118e86` | `build/` 的 26 个可复用脚本搬进 `scripts/` |
| `d7b9c70` | 补满图版 7 桶 + 修 landscape 题材错误 + 修 `--only` 删桶缺陷 |

**归档**（`scripts/*.md.archived`，不要当待办读）：B 期翻译手册、缺陷修复轮 2 计划、翻译规范。
`scripts/DISPATCH.md` **仍有效**（补片派发的子代理提示词）。

> 本文件 2026-10-18 从 108 KB / 1319 行压到 15 KB / 212 行。长版（含第 1–14 轮全部实测明细）：
> `git show 3c7e06b:scripts/RESUME.md`。
