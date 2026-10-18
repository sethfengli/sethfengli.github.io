---
name: huideng-chanlin
description: Change and verify the 慧灯禅院 / Huideng Zen Temple site (D:\FengLi\Web\fou\huideng-chanlin — Vite + React 19 + Tailwind v4 + three.js r185) with a "compute first, screenshot later" loop, no browser, no permission escalation. USE FOR editing any page or section, any 3D scene (zen3d/stage.ts, censer, bell, tree, lamp), copy and i18n (zh.ts / en.ts), photos and banners, design tokens, bundle size, or running the repo audits (audit:framing, audit:banners, check-buckets, style-audit, check-font-coverage, verse-audit, probe-route-cost). Covers the workspace-write limits (spawn EPERM, Chrome crashpad), the hand-off screenshot command, and the framing contract that keeps 3D subjects inside the canvas.
---

# 慧灯禅院 — change & verify (no browser)

## 0. 先算再拍（本 skill 的核心）

改任何「看得见的东西」之前，先问：**这件事能不能算？**

| 问题 | 能算吗 | 怎么算 |
| --- | --- | --- |
| 3D 主体是否出画 / 香头是否贴边 / 取景距离 | ✅ | `npm run audit:framing`（NDC 投影） |
| 图版是否在声明的桶里、裁切后还剩多少 | ✅ | `npm run audit:banners` |
| 文案是否漏了中文键、类型是否对 | ✅ | `npm run typecheck`（键由 tsc 对齐） |
| 新字是否在字体子集里 | ✅ | `node scripts/check-font-coverage.mjs` |
| 令牌改名是否生效 | ✅ | `probe-colors.mjs`（读 computed，别 grep 产物） |
| 造型对不对、光照好不好、零件是否穿模/悬空 | ❌ 必须渲染 | 交给用户跑截图（§4.3） |
| 材质、bloom、遮挡关系 | ❌ | 同上 |

**成本顺序**：纯 Node 判据（0.1–2 s）→ 类型检查/构建（5–10 s）→ 用户本机截图（分钟级，且要一次说清三件事：路由、选择器/锚点、看什么）→ 才考虑升级权限。

第 14 轮的教训：一个「3D 香炉太大、看不到燃烧的香」的问题，`tsc` + `vite build` + 全部既有 audit 全绿，我却先开了浏览器、反复截图，还为此要了完整权限。其实「主体上沿投影 ndc > 1」当场就能算出来。

## 1. 30 秒摸清仓库

```powershell
npm run typecheck              # tsc，永远先跑
npm run audit:framing          # 3D 取景（纯 Node）
npm run build                  # tsc + vite build（要子进程权限，见 §4）
```

- 页面：`src/pages/{Home,About,Dharma,PrayerWall,Lots,Articles,Article}.tsx`
- 3D：`src/components/zen3d/`，底座是 `stage.ts`（相机/交互/阴影/**取景**），模子是 `censer.ts` / `Bell3D.tsx` / `Tree3D.tsx` / `Lamp3D.tsx`
- 2D 回退：`src/components/zen/`（`--disable-webgl` 时用，别顺手删）
- 文案：`src/i18n/{zh,en}.ts`（键由 tsc 对齐）；正文 `src/content/`
- 图版：`src/data/photos-cn.json`（清单）+ `public/photos/cn/`
- 状态与坑的权威文档：`scripts/RESUME.md`（≤300 行；逐轮明细在 git 历史里）

## 2. 改一个段落的标准动作

1. `grep` 文案/类名定位文件，**读整段**再改（页面里 3D 段落通常带 `Contained3D` 视口门控）。
2. 文案改 `zh.ts` + `en.ts`（两边键必须同时有，`tsc` 会抓）；文章/数据改 `content/` 的**中文源**。
3. 动 3D ⇒ 改完立刻 `npm run audit:framing`；动图版 ⇒ `npm run audit:banners`。
4. 动文案 ⇒ `check-font-coverage.mjs`（**扫描包含注释**：别在注释里写生僻字）。
5. 提交信息写清「真因 + 判据」，不要写过程叙事（RESUME 不再收它）。

## 3. 3D：取景是最容易错的地方

约定（`stage.ts` + `censer.ts`）：
- 模型自己声明 `bounds: { top, bottom, halfWidth }`，`top` 要**含香头之上的青烟**；
- 相机 `targetY = (top + bottom) / 2`（**不许盯 y=0**，主体中心不在原点）；
- 距离用 `fitDistance(bounds, { aspect })`，**页面不许写死 `distance`**（`audit:framing` 会拦）；
- 用户可拉近：`minDistance = max(4, fit × 0.45)`，起始就是最远。

其它实测坑：
- **发光件（香头/灯芯）必须在几何最外层**：炭火球埋在香灰筒里时，构图再对也看不出「在燃烧」。
- **纸底上的烟/雾不能用 `AdditiveBlending`**：白上加白 = 一颗颗硬边白球。普通混合 + 冷灰 + 低不透明度。
- 浅色纸底 + `addInkGround` = 方形灰边；单件小物只铺 `addCatchShadow`。
- `PCFSoftShadowMap` 在 r185 已弃用 → `PCFShadowMap`。
- 3D 枝干接缝别用「套袖/树瘤」：退起点、抬出干角、收梢部半径。

## 4. 权限：workspace-write 里能做什么

**能**：读写仓库、起 `node:http`/静态服务、跑 `tsc`、所有 `scripts/*.mjs` 判据（除了要 spawn 的）。

**不能**（不要反复试）：
- 任何 `stdio:'pipe'` 的 spawn（`spawnSync(..., {encoding})`、`exec`、`execFile`）→ 裸 `EPERM`。
  `vite build` 的 `optimizeSafeRealPathSync` 用 `exec`，所以它会报「failed to load config」+ `spawn EPERM`，看着像配置坏了。
  `stdio:'ignore'` / `'inherit'` 的 spawn 能跑。
- 无头 Chrome：crashpad `OpenProcess: Access denied` →「crash server failed to launch」→ 自终止。这是**进程权限**，不是浏览器开关；`--no-sandbox` 之类不值得试。

### 4.3 需要像素时：交给用户，一行命令

```powershell
# 视口门控后的场景（首页香炉、关于页慧灯）：先按文案滚到段落再等 canvas
node scripts/shot-gated.mjs --base=http://127.0.0.1:5193 --out=build/shots/x
node scripts/shot-gated.mjs --route=/lots --anchor=我的签文 --out=build/shots/lots-cone
# 已在首屏的场景（梵钟 / 许愿树 / 签筒）
node scripts/shot-3d.mjs --route=/dharma --out=build/shots/bell --drag=100,0 --page
```

- 截图脚本用 `os.tmpdir()` 的 profile + `stdio:'ignore'`，**在用户本机一定跑得动**。请用户跑之前先确认 dev server 在跑。
- **先确认打的是哪个服务器**：`http://127.0.0.1:PORT/src/...` 返回 `text/javascript` 才是 vite dev；返回 `text/html`（SPA fallback）说明是 `vite preview`/`static-server` 在服务**旧 `dist/`**，这时改代码看不到变化。
- 用户跑完，用 `read_image` 看 `build/shots/*.png`，并把「看什么」说具体（香头是否在画内、烟是不是白球、零件有没有悬空）。

## 5. 文案 / 图版 / 字体 / 体积

- **含中文的文件禁止 PowerShell 回写**（`Set-Content -Encoding utf8` 双重编码）。用 `edit` 工具或 Node `writeFileSync(p, s, 'utf8')`。
- **命令行不要内联复杂 JS**；PowerShell 还会吃掉反引号（写成文件再跑）。
- 图版：`named(key, bucket)` 的第二个参数是**校验桶**，指错会静默退回该桶第一张；换图后先 `audit:banners`。
  改 `PICKS` 是两步（`curate-cn.mjs` → `fetch-cn-webp.mjs`），且换 id 必须换同一位置。
- 字体子集按「当前全站用字」生成：改完文案跑 `check-font-coverage.mjs`，判据是 `6962/6963` 这类逐字结果，不看 mtime。
- 体积：主包 286.96 KB；`three.js` 是独立 724 KB chunk，只许在 3D 段落 `lazy()` + 视口门控。改完用 `probe-route-cost.mjs` 对比。

## 6. 判据速查

| 命令 | 失败意味着 |
| --- | --- |
| `npm run audit:framing` | 3D 主体出画 / 香头贴边 / 页面写死过近的 `distance` |
| `npm run audit:banners` | 具名图不在声明桶内、裁切保留面积过低 |
| `node scripts/check-buckets.mjs` | 清单 ≠ 磁盘 ≠ PICKS，或编号不连续 |
| `node scripts/style-audit.mjs` | 装饰符/圆角/投影/旧令牌/svg 缺 aria/img 缺 alt |
| `node scripts/check-font-coverage.mjs` | 有新字掉出字体子集 |
| `node scripts/verse-audit.mjs` | 每日法语重复 / 缺英文 / 英文夹汉字 / 过长 |
| `node scripts/probe-route-cost.mjs` | 首屏体积回退 |

## 7. 纪律

- 先把改动做对，再一次性验证；不要每改一行就开一轮浏览器。
- 提交信息 = 真因 + 判据 + 实测数字（这是唯一该记过程的地方）。
- `scripts/RESUME.md` 只留「下一轮还会踩的」，**≤300 行**；过程叙事进提交信息，不进文档。
- 会话末：`npm run typecheck` + 相关 audit 全绿，再报「改了什么 / 怎么验的 / 还剩什么」。

## 8. 安装（这个 skill 的源在仓库里）

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.dsh\skills\huideng-chanlin" | Out-Null
Copy-Item 'D:\FengLi\Web\fou\huideng-chanlin\docs\skill\huideng-chanlin\SKILL.md' "$env:USERPROFILE\.dsh\skills\huideng-chanlin\SKILL.md" -Force
```

仓库里的是源（`docs/skill/huideng-chanlin/SKILL.md`），`~\.dsh\skills\` 是安装副本；学到新东西先改仓库那份。
