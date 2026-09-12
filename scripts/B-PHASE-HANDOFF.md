# B 期交接与下一轮任务编组

> 承接 `scripts/RESUME.md`（B 期启动/收尾流程仍以它为准，本文件只补「本轮实测」与「下一轮编组」）。
> 生成时间：2026-09-12 会话末。工作区干净，全部已提交，**未 push**。

## 1. 当前位置（实测）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=262 crit=6 warn=11 parts=15**（A 期终点为 257 / 6 / 11 / 20） |
| `scan-mojibake` | 0 |
| 本轮新增整篇 | **5 篇**：`047shengmingdcj` 1246、`293jgj-zhu` 1129、`246henghedashouyin` 695、`102lfsx` 371、`403chanjing` 952 |
| 五篇结构核验 | `typeMis=0 inlineMis=0`（逐块 `t` 与 `inline` 片段数全对齐） |
| 剩余 | **12 篇 / 17,723 未覆盖块 / 161 个 120 块任务** |
| 提交 | `521a40e`(round1) `2547fd5`+`4bc37e4`(round2) `ede709e`+`8443fd4`+`d8dd35e`(round3) `6cd4879`(tools) `06f73b6`(data) |

## 2. 本轮新增的坑（RESUME §5 之外，务必先读）

### 2.1 `slice-plan.mjs` 与 `plan-slices.mjs` 同名互覆（最危险，已发生）

RESUME §3 第 2 步写的 `node scripts/slice-plan.mjs` 是**生成器**（按 28KB 重切并覆盖 `slice-plan.json`）；
而 §3 第 1 步要改的 `scripts/plan-slices.mjs:63` 是**审计器**（plan vs zh 一致性检查，`--fix` 才修）。
运行生成器会把审计器**整个覆盖掉**。本轮已发生并已 `git checkout -- scripts/plan-slices.mjs` 还原。

**正确启动顺序（B 期已解锁，下一轮通常不需要重跑）：**

```bash
# 0) 只在确实需要重新切片时才跑生成器；不要用 slice-plan.mjs 当审计
node scripts/plan-slices.mjs            # 审计（只读）：应输出「0 篇有缺口 / 一致性问题 0 条」
# 若确需重切（会覆盖 slice-plan.json，慎用）：
#   node scripts/slice-plan.mjs && node scripts/plan-slices.mjs
node scripts/coverage.mjs               # 剩余篇与覆盖%
node scripts/task-plan.mjs 120          # 唯一权威队列
```

**已解锁项（本轮已改并提交 `6cd4879`）**：300KB 上限 → 30MB，共 **6** 处——
`coverage.mjs:31`、`plan-slices.mjs:63`、`make-agent-tasks.mjs:22`、`analyze-eta.mjs:25`，
外加 RESUME 漏列的 **`task-plan.mjs:34`** 与 **`pick-next.mjs:38`**（漏改这两个，队列会永远返回 0 任务）。

### 2.2 `git show <commit>:<path> > file` 在 PowerShell 里写 UTF-16

会静默产出 `��{` 开头的非法 JSON。取回历史分片必须：

```powershell
git show 4bc37e4:src/content/en/<slug>.pN.json | Set-Content -Encoding utf8 build\x.raw
node -e "const fs=require('fs');let s=fs.readFileSync('build/x.raw','utf8');if(s.charCodeAt(0)===0xFEFF)s=s.slice(1);fs.writeFileSync('src/content/en/<slug>.pN.json',JSON.stringify(JSON.parse(s),null,1)+'\n','utf8')"
```

### 2.3 §5.1「先 `git add` 再 merge」在本仓库**不可靠**

Round 1 实测：`git add` 报告成功、`git status` 显示 9 个 `A`，但 commit 后这 9 个 blob
在 object store 里**根本不存在**（`git fsck` 无对应 dangling blob），即分片既没进提交也没留底。
**改用「分片单独先提交一次」**（本轮 Round 2/3 采用，已验证有效）：

```bash
git add <本轮全部分片> && git commit -m "EN: B round N shards - ..."
git ls-tree -r --name-only HEAD -- src/content/en | Select-String '<slug>'   # 必须能看到分片
node scripts/merge-parts.mjs <slug...>          # merge 会删分片，但已在历史里
git add <slug>.json && git add -u src/content/en && git commit -m "EN: B round N - merge ..."
```

### 2.4 并发子代理会互相覆盖同名输出，且无法中途撤回

本轮实测：两个代理同时写 `293jgj-zhu.p8.json`；一个代理把已存在且**唯一**覆盖 622-683 的
`293jgj-zhu.p10.json`（旧网格）覆盖成新网格 1091-1123，导致 622-683 一度丢失（已从 git 取回）。
另一个代理在写入中途被打断后，留下 80/120 的截断文件，被误当成「缺 40 块」。
**对策**：一个 `pN.json` 只派一个代理，输出文件名即任务标识；派发前记录该文件名是否已存在。

### 2.5 删「孤儿分片」前必须核区间

本轮把 `102lfsx.p24.json` 当孤儿删掉，实际它覆盖 **362-370**，是 `102lfsx` 的最后 9 块，
merge 因此卡在 `[fail] merged 362/371`。
**对策**：`node scripts/coverage.mjs <slug>` 看缺口区间；`p24` 这类旧网格文件名（>计划片数）
往往是**唯一**覆盖该区间的分片，删除前先确认新网格是否真的覆盖了同一区间。

### 2.6 高槽密度分片是本轮超时的唯一根因（详见 §3）

`102lfsx` 每 120 块有 **6,078–6,716** 个 inline 槽（每块最多 281 槽、每块约 2,000 字节），
而正常篇为 **140–461** 槽。该篇 p1+p2 单线跑了 **~45 分钟**，代理自建「等分回填 + 空格边界
启发式审计」流水线，`build/_work/` 留下 **232 个文件 / 2.7MB** 脚手架，并在
`audit → fix → 再 audit` 之间往复不收敛；最终把 5 个块的整段文字塞进首片段、其余片段留空
（`p1` 811 个 + `p2` 300 个空白片段），结构仍是 1:1、`verify-slices` 为 `ok(big)`。

## 3. 派发前必算的一个指标：槽/块

```bash
node -e "
const fs=require('fs');const s=process.argv[1];
const zh=JSON.parse(fs.readFileSync('src/content/articles/'+s+'.json','utf8'));
const slots=zh.blocks.reduce((a,b)=>a+((b.inline||[]).length),0);
console.log(s,'blocks='+zh.blocks.length,'slots='+slots,'slots/block='+(slots/zh.blocks.length).toFixed(1));
" <slug>
```

| 档位 | 槽/块 | 处置 |
| --- | --- | --- |
| 低 | ≤ 5 | 直接派发，正常节奏 |
| 中 | 5–50 | 每轮 ≤ 8 片，提示词加「逐块 1:1，不做边界审计」 |
| **高** | **> 50** | **单独限流**：一篇一次只派 1–2 片；提示词明确「块内允许整段文字落在首片段、其余片段留空」；禁止自建启发式审计脚本 |

**剩余 12 篇全部为「低」档（1.0–3.2 槽/块）**，`102lfsx` 是**唯一**高密度篇且已完成。
剩余篇也不会再遇到该问题。

## 4. 剩余 12 篇的工作量（按 120 块/任务）

| slug | 未覆盖块 | 任务数 | 字节/块 | 备注 |
| --- | --- | --- | --- | --- |
| `001juezhichan` | 814 | 7 | 433 | 已有 1 片 |
| `001jznf` | 859 | 8 | 437 | 已有 1 片 |
| `187hanshandashinianpushu` | 880 | 8 | 425 | crit:missing；meta-scan 报 author 缺陷（派 p1 前先删源 `author`） |
| `016xdwsjwl` | 889 | 8 | 448 | 源含 12 处 byte-identical 重复块（照源保留，勿去重） |
| `239wuliangshoujing-jiaohuibenzhu-zhu` | 1010 | 9 | 346 | crit:missing；块 0 是 h2 |
| `239wuliangshoujing-huiyi` | 1035 | 9 | 355 | 源含 5 处重复块 |
| `190wuliangshoujingwuyiben` | 1124 | 10 | 384 | 已有 p5（301-372）；缺口 0-300 与 373-1123 |
| `301jgj` | 1184 | 10 | 380 | 已有末片 |
| `025taishanggy-yw` | 1627 | 14 | 465 | meta-scan 报 author 缺陷；缺口 0-265、362-1558 |
| `205jgj-jiangyi` | 2224 | 19 | 561 | 块 0 是 h2；缺口 0-2127 |
| `262dachengrulengqiejing` | 2442 | 21 | 154 | 块 1 是空 h2；缺口 0-2150 |
| `043mengyouji` | 4480 | 38 | 491 | crit:missing；meta-scan 报 author 缺陷；缺口 0-4479 |

## 5. 推荐的任务编组（下一轮起）

**编组原则**

1. **整篇优先**：merge 需要 100% 覆盖，半篇产出不产生可交付物。按「本篇任务数」由小到大排序推进。
2. **每轮填满 8 个槽**：小篇按篇整取；尾部余量用**下一篇的前几片**补满（记在轮次记录里）。
3. **同一 slug 的多片可同轮并行，但一个 `pN.json` 只能一个代理**（见 §2.4）。
4. **meta=yes 的片必须含 `title`/`excerpt`；源里有 `zhAuthor` 才写 `author`**；meta-scan 命中就先改源（见 §4 备注）。
5. 派发前跑 §3 的槽/块检查；grep 一遍该篇源里是否有 `\?\?` 字面损坏（`246henghedashouyin` 块 605 有一处，
   属源数据缺陷，照源保留并在报告里记明）。

**轮次建议（每轮 8 槽；尾部余量用下一篇的前几片补满）**

| 轮 | 编组 | 任务 | 预期 |
| --- | --- | --- | --- |
| R4 | `001juezhichan` 7 + `001jznf` 8 | 15 | 2 篇 merge；先打通一轮完整流程 |
| R5 | `187hanshandashinianpushu` 8 + `016xdwsjwl` 8 | 16 | 2 篇 merge；先删 187 源 `author` |
| R6 | `239wuliangshoujing-jiaohuibenzhu-zhu` 9 + `239wuliangshoujing-huiyi` 9 | 18 | 2 篇 merge；同系列术语互参 |
| R7 | `190wuliangshoujingwuyiben` 10 + `301jgj` 10 | 20 | 2 篇 merge；均已有分片，注意区间 |
| R8 | `025taishanggy-yw` 14 + `262dachengrulengqiejing` 前 6 片 | 20 | 1 篇 merge；先删 025 源 `author` |
| R9 | `262` 余 15 + `205jgj-jiangyi` 前 5 | 20 | 1 篇 merge |
| R10 | `205` 余 14 | 14 | 1 篇 merge |
| R11 | `043mengyouji` 0-2279（19 片） | 19 | 半篇，无 merge |
| R12 | `043mengyouji` 2280-4479（19 片） | 19 | 1 篇 merge |

按此剩余 12 篇约 **9 轮**（R4–R12）清完。合计 161 个任务。

## 5.1 时间台账（每轮会话末必须回填）

每个会话**结束时**（写完诊断后）在 `scripts/B-PHASE-HANDOFF.md` 追加一行到下面的表，
并据此更新「剩余预测」。计时口径：从本轮第一个子代理派发到本轮整篇提交完成为止，
不含会话中的人工等待；有跨轮补片时按实际归属轮次记。

| 轮 | 日期 | 任务数 | 完成篇 | 单轮耗时 | 累计篇 | 剩余篇 | 剩余预测 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | 2026-09-12 | 9 | `047shengmingdcj` | ~35 min | 1 | 16 | — |
| R2 | 2026-09-12 | 16 | `293jgj-zhu`, `246henghedashouyin` | ~60 min（含返工） | 3 | 14 | 17 轮 / ~9 h |
| R3 | 2026-09-12 | 12 | `102lfsx`, `403chanjing` | ~85 min（含 102 长线） | 5 | 12 | 9 轮 / ~6 h |
| R4 | | | | | | | |

**时间预测方法**：单轮耗时 ≈ `max(该轮最慢分片的翻译用时) + 收尾 5 min`；
按 R4–R12 的编组，低密度篇（≤5 槽/块、≈120 块/片）实测约 **8–12 min/片**，
故一轮 15–20 个任务、8 槽并行约 **20–30 min**；`043mengyouji` 块数最多（4,480），
其两轮各按 **40–50 min** 估。每轮结束后用实测值替换预测值并重算剩余总时长。

**每轮收尾固定四步**（顺序不可换，替换 RESUME §4 的收尾）：

```bash
node scripts/verify-slices.mjs <本轮全部分片>            # 全部 ok / ok(big)
git add <本轮全部分片> && git commit -m "EN: B round N shards - <slugs>"
node scripts/merge-parts.mjs <本轮 100% 覆盖的 slug>
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en
git commit -m "EN: B round N - merge <slug>(blocks) ..."
git show --stat --oneline HEAD ; git status --porcelain  # 双向核对
```

## 6. 已知非 B 期缺陷（勿在翻译轮里顺手改）

- `068xiangxujs`、`101yebunengxi` 的 CJK 残留；`303liuzutanjing` ±1 错位（见 RESUME §6）。
- `187hanshandashinianpushu:missing`：实际资产在 `187hanshandashinianpushu-old`，slug 不匹配（本文件 §4 的 187 是新缺口篇）。
- `246henghedashouyin` 源块 605 有字面 `??`（源数据损坏，非 mojibake）。
- warn 11 项（行内片段数，展示层无影响）；`meta-scan` 报 `043mengyouji`、`187hanshandashinianpushu`、`025taishanggy-yw` 的 author 为块首正文，**改 `src/content/articles/*.json`，不是改 en**。
- 片段接头空格（RESUME §5.7，253 篇）：**先定策略再动手**，本轮未碰。

## 7. 清理项

`build/` 已被 `.gitignore` 忽略，但本轮遗留 **565 个文件 / 12.4MB**（其中 `build/_work/` 232 个 / 2.7MB
来自 `102lfsx` 那条长线）。这些只是脚手架，可整目录删；`build/slices/*.src.json` 是 `verify-slices`
的比对基准，**只在对应分片已 merge 后可删**。
我自己产生的临时件（`build/recover-*.json|raw`）已删除；下一轮同样只用 `build/recover-*` 前缀，
便于会话末一次清理。
