# 下一轮计划（翻译已完成，剩下的是「修缺陷 + 一致性」）

> 生成于 2026-09-12（B 期收尾后）。背景见 `RESUME.md`，翻译轮实测见 `B-PHASE-HANDOFF.md`。
> **本文件末尾有一段可直接复制给新对话的启动提示词。**
> 所有数字均为本仓库实测；命令可直接复制执行。

## 0. 一句话结论

**翻译已经全部做完**（`task-plan` 0 篇 / 0 任务）。剩下 12 项都是「已交付内容的缺陷与一致性」，
按风险从高到低排在下表。**§1-§3 是一次会话内可完成的硬缺陷修复（预计 40-60 min）**，其余为可选打磨。

| # | 事项 | 类型 | 规模 | 风险 | 建议 |
| --- | --- | --- | --- | --- | --- |
| 1 | `303liuzutanjing` ±1 错位 | crit | 删 1 块 + 译 1 块 | 低 | **本轮做** |
| 2 | `068xiangxujs` 25 块 CJK | crit | 25 块补译 | 低 | **本轮做** |
| 3 | `101yebunengxi` 8 块 CJK | crit | 8 块补译 | 低 | **本轮做** |
| 4 | 11 篇 `warn` 行内片段数不符 | warn | 12 块对齐 | 低 | **本轮做** |
| 5 | 253 篇「片段接头丢空格」 | 显示层 | 全库 | 中（需先定策略） | 定策略后再动 |
| 6 | `author` 源数据缺陷残留 | 数据 | ? 处 | 低 | meta-scan 实测后再定 |
| 7 | 音标/引号风格分叉 | 一致性 | 63 篇混合 | 中 | 先定口径，再批量 |
| 8 | `catalog-en.json` 与 `en/*` 对账 | 数据 | 1 次 | 低 | 顺手做 |
| 9 | `build/` 与 npm cache 残留 | 卫生 | — | 无 | 已完成（见 §5） |

---

## 1. `303liuzutanjing` ±1 错位 —— 删 1 块 + 补译 1 块（≈15 min）

**实测证据**（勿再按「重译 555-822」估算，那是错的）：

| 检查 | 结果 |
| --- | --- |
| 块总数 | ZH 1530 / EN 1530（相等） |
| `en[i] ↔ zh[i-1]`（t 匹配） | **551..822 全部 272/272 成立，0 例外** |
| 多余块 | `en[550]` 与 `en[551]` 都是 `zh[550]`（「问：达摩初见梁武帝…」）的译文 → **删 `blocks[551]`** |
| 缺失块 | 缺口正是 **`zh[822]`**（`善知识！自心归依自己本性（自性佛），这是归依真佛…`，单块 `p`） |
| href 症状 | 丢的 `/articles/152sizukaishifarong` 实际在 `en[672]`＝`zh[671]` 的译文 → **同一错位的症状，不用单独修** |

**做法**：`python`/node 一次脚本删 `src/content/en/303liuzutanjing.json` 的 `blocks[551]`，
把 `zh[822]` 的译文插入为新的 `blocks[822]`（结构与 `zh[822]` 同：`t` 与 `inline` 片段数照源）。
改完跑 `node scripts/validate-en.mjs`，`303liuzutanjing` 应不再出现在 `CRITICAL:` 行。

## 2. `068` / `101` 的 CJK 残留 —— 是「部分翻译」，不是脏数据（≈30 min）

| 文件 | 块数 | 含 CJK 的块（实测索引） |
| --- | --- | --- |
| `src/content/en/068xiangxujs.json` | 84 | **25 块**：`1,3,5,8,10,11,12,13,15,16,17,18,19,21,23,27,30,31,35,36,37,41,43,44,49` |
| `src/content/en/101yebunengxi.json` | 64 | **8 块**：`7,12,14,27,42,45,48,53` |

- **只改这些块**：块数不变、`t` 不变、`inline` 片段数不变、其它块的措辞**一律不动**。
- 派发前先把「索引 + 对应中文原文 + 该块现有英文」打印给子代理（**不要让它自己找哪些块要改**）。
- 两个文件可并行两个子代理（不同文件，无并发写冲突）。完成后 `validate-en` 的 crit 应降到只剩 303。

## 3. 11 篇 `warn`：行内片段数不符（≈20 min）

`validate-en` 报：`013zhufasx 032xyxing 052wangshengyuanli 088linzhongshinianxiangxu 103yjy 105wangfengyijiayanlu 151sizuanxingyaomen 186hanshandashideyisheng 193guanwuliangshoufojingjijie 204danian 240yinguangdashilunhuijiben`

**实测形态**（`013zhufasx` 共 1 块不符）：`zh` 有 11 个片段、`en` 只有 10 个 —— 英文把源文里**独立成段的标点片段**
（如单独的 `“`、`（`）合并或丢弃了。`DISPATCH.md` §2 明确要求「空的或纯标点的片段必须保留为独立片段」。

**做法**：逐篇逐块对齐 `en.blocks[i].inline` 片段数到 `zh.blocks[i].inline`（多的拆、少的补，纯标点片段保留）。
审计入口：`node -e` 打印每篇不符的块号（见下），或直接看 `validate-en` 的行内数提示。
```bash
node -e "const fs=require('fs');for(const s of ['013zhufasx','032xyxing','052wangshengyuanli','088linzhongshinianxiangxu','103yjy','105wangfengyijiayanlu','151sizuanxingyaomen','186hanshandashideyisheng','193guanwuliangshoufojingjijie','204danian','240yinguangdashilunhuijiben']){const z=JSON.parse(fs.readFileSync('src/content/articles/'+s+'.json','utf8')),e=JSON.parse(fs.readFileSync('src/content/en/'+s+'.json','utf8'));const bad=[];z.blocks.forEach((b,i)=>{if(typeof b.text==='string')return;const a=(b.inline||[]).length,c=(e.blocks[i]&&e.blocks[i].inline||[]).length;if(a!==c)bad.push(i+':'+a+'->'+c)});console.log(s,'blocks',z.blocks.length,'bad',bad.length,bad.slice(0,8).join(' '))}"
```

## 4. 253 篇「片段接头丢空格」—— **先定策略，别直接批量改**（策略 10 min / 执行看选择）

`InlineSegs` 无分隔符拼接（`src/components/reader/ArticleBody.tsx` 第 8-22 行）。
中文源自己就把 `["一、无门为法门"]["二、五法三自性"]` 存成两片段（中文无需空格故无感），
英文照抄后渲染成 `Gate2. The Five…`。**实测 253/277 篇有此类接头，多数源自既有分片**（非 B 期引入）。

三种修法（**选一个再动手**）：
1. **渲染层补空格**（推荐）：`InlineSegs` 里对相邻非 href 片段拼接时按需插空格/或渲染为 `{seg.s}` 之间加分隔。
   一处改动覆盖全部 253 篇，风险是可能给「本来不该有空格的」处也加空格（如中英混排标点）。
2. **数据层批量修**：写一次性脚本按语言规则给 `src/content/en/*.json` 的片段边界补空格（改动大、需逐篇核验）。
3. **不改**：接受现状（历史上一直如此）。

> 结论未定前**不要**在翻译轮里顺手改；定了之后**单独一轮**做（因为会动上百个文件）。

## 5. 已完成 / 已清理（本轮）

- `build/` 只保留 5 个复用脚本（`mksrc`、`recover-r9-{dispatch,assemble,scan}`、`audit-slices-runtime`），
  已删除 A/B 期全部已 merge 的 `slices/*.src.json` 与编号源/JSONL 脚手架（`build/` 现 5 文件）。
- 删除过期文档 `scripts/NEXT.md`、`scripts/PLAYBOOK.md`、`scripts/WEEKEND-PLAN.md`（git 历史仍可追）；
  仍有效的条目已并入 `RESUME.md` / 本文件。
- 删除失效脚本 19 个：`audit-slices`、`make-agent-tasks`（+`agent-tasks.json`）、`pick-next`、`prep-slices`、
  `analyze-eta`、`fix-261-boundary`、`fix-303-hanzi`、`fix-502-author`、`diag-303`、`check-parts`、`check-assets`、
  `smoke`、`serve-dist`、`overlap`、`normalize-fw`、`quote-scan`、`fix-dashes`、`reorder-photos`（共 18 个脚本 + 1 个 json）。
- ⚠ **保留 `slice-plan.json` + `slice-plan.mjs`**（虽然它们是「生成器 + 计划快照」）：
  `task-plan.mjs` / `plan-slices.mjs` / `coverage.mjs` / `merge-parts.mjs` **四个脚本都读 `slice-plan.json`**，
  删掉会让整条队列/覆盖链路报 ENOENT（本轮已实测并回滚）。**只跑审计器 `plan-slices.mjs`，不要跑生成器 `slice-plan.mjs`。**
- 删除仓库里的 `x.json`（0 字节空文件）并 untrack 误入库的 `.npm-cache/`（13.6 MB）。

## 6. 其它待办（低优先，实测定量后再说）

| 事项 | 现状 | 建议口径 |
| --- | --- | --- |
| `author` 源数据缺陷 | `meta-scan.mjs` 报出的清单需**重跑确认**（B 期已修 `187`/`025`/`043`） | 命中就删 `src/content/articles/<slug>.json` 的 `author`（不要改 en） |
| 音标/引号风格 | `name-scan.mjs`：**63 篇有混合变体**（如 `nirvana/nirvāṇa` 同篇并存） | 先定「带变音符」为唯一口径，再按篇批量替换 |
| `catalog-en.json` 对账 | 由 `en/*.json` 汇总 | 跑一次 `node scripts/build-catalog-en.mjs` 并核对差异 |
| 站点侧 | `npm run typecheck` 通过；`npm run build` 在受限沙箱 `spawn EPERM` | 本地跑 `npm run build` 出 `dist/` 后发布 |

---

## 7. 给新对话的启动提示词（复制这一段）

```
继续 huideng-chanlin 项目（D:\FengLi\Web\fou\huideng-chanlin）。翻译已完成（A+B 期 29 篇，task-plan 0 任务），
本轮只做「已交付内容的缺陷修复」。先读 scripts/RESUME.md（状态/目录/流水线/坑）与 scripts/NEXT-PLAN.md（本轮任务清单），
再读 scripts/B-PHASE-HANDOFF.md §3-§4（实测坑与收尾四步）。

本轮做 NEXT-PLAN.md 的 §1-§4：
§1 303liuzutanjing ±1 错位：删 en.blocks[551]，补译 zh[822] 插入为新 blocks[822]（结构照源；不要重译 555-822）。
§2 068xiangxujs 的 25 块、101yebunengxi 的 8 块 CJK 残留：只改这些块的 en（块数/t/inline 片段数全不变），两个文件并行派两个子代理。
§3 11 篇 warn 的行内片段数不符：把 en 的 inline 片段数对齐到 zh（纯标点片段必须保留为独立片段），先跑 NEXT-PLAN.md §3 的一行命令打出每篇不符的块号再改。
§4 253 篇片段接头空格：先给我三种修法的取舍建议（推荐渲染层修），我确认后再动手。

纪律：改完必跑 node scripts/repair-json.mjs && node scripts/validate-en.mjs，期望 crit 从 3 降到 0、warn 从 11 降到 0；
每个 slug 单独提交，提交后 git show --stat --oneline HEAD 与 git status --porcelain 双向核对；不要 push。
临时件只许放 build/ 并自删，禁止写 scripts/（除非我同意新增）；诊断只在会话末写一次。
会话末：更新 scripts/RESUME.md §1 的实测数字与 scripts/NEXT-PLAN.md（划掉已完成项），提交 docs: …
```
