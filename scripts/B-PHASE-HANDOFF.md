# B 期交接与下一轮任务编组

> 承接 `scripts/RESUME.md`（B 期启动/收尾流程仍以它为准，本文件只补「本轮实测」与「下一轮编组」）。
> 生成时间：2026-09-12 会话末；**R4 完成于 2026-09-12**。工作区干净，全部已提交，**未 push**。

## 1. 当前位置（实测）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=264 crit=6 warn=11 parts=13**（R4 前为 262 / 6 / 11 / 15；A 期终点 257 / 6 / 11 / 20） |
| `scan-mojibake` | 0 / 316 |
| R4 新增整篇 | **2 篇**：`001juezhichan` 814、`001jznf` 859 |
| R4 结构核验 | 两篇均 `typeMis=0 inlineMis=0 cjk=0`；14 个分片 `verify-slices` 全 `ok` / `ok(big)` |
| 剩余 | **10 篇 / 17,723 - 1,609 = 16,114 未覆盖块**；按 `task-plan.mjs 120` 实数 **155 - 14 = 141 个任务** |
| 提交 | `521a40e`(r1) `2547fd5`+`4bc37e4`(r2) `ede709e`+`8443fd4`+`d8dd35e`(r3) `6cd4879`(tools) `06f73b6`(data) `8649a02`(r4 分片) `1cc9f23`(r4 整篇) |

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

### 2.7 R4 实测新增两条（2026-09-12）

**2.7.1 §4/§5 里 `001jznf` 的「8 片 / 859 未覆盖块」两个数都偏大。**
`task-plan.mjs 120` 与块数计算一致给出 **7 片**：未覆盖块实为 **801**（缺口 `[0-800]`），
`p1-p6` 各 120 块 + `p7` 81 块；`859` 是整篇块数（含既有分片 `p13` 覆盖的 801-858）。
**留意**：`coverage.mjs <slug>` 在整篇 merge 之后必然显示 `parts=0 / cover 0%`，因为它只扫
`en/<slug>.pN.json` 分片、不读整篇文件。**不能**用它判断某篇是否已交付；判断交付看
`validate-en` 的 `ok` 计数 + `src/content/en/<slug>.json` 是否存在（本轮两篇均如此）。

**2.7.2 子代理写文件时会遇到工具侧 `ReplaceFileW EIO` 故障。**
R4 有 1 个代理（`001jznf.p4`）中途报此错：文件被写坏并一度截断，代理自行按批次数据重建后复验通过。
**对策**：收尾第一步 `verify-slices` 跑**全部分片**（不能只信代理的完成报告），并在
`git add` 之前用 `firstBlock + 块数` 与源逐一核对（见 §5 四步第一步）。R4 收尾时另清掉了
`build/slices/_merge4.mjs`、`_p4c.json`、`_tmp_dup.txt`、`_tmp_p3_index.txt`（R2 遗留）
与 `build/_work/`（R3 遗留 265 文件 / 2.8MB）——**R4 的 14 个代理未留下任何脚手架**，
说明「提示词里明确禁止自建审计脚本」是有效的。

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
| `001juezhichan` | 808 | 7 | 433 | 整篇 814 块；已有 p13（808-813）；R4 已完成 |
| `001jznf` | 801 | 7 | 437 | 整篇 859 块；已有 p13（801-858）；R4 已完成 |
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
| R4 | `001juezhichan` 7 + `001jznf` 7 | 14 | 2 篇 merge；**已于 2026-09-12 完成，实测 12.6 min** |
| R5 | `187hanshandashinianpushu` 8 + `016xdwsjwl` 8 | 16 | 2 篇 merge；先删 187 源 `author` |
| R6 | `239wuliangshoujing-jiaohuibenzhu-zhu` 9 + `239wuliangshoujing-huiyi` 9 | 18 | 2 篇 merge；同系列术语互参 |
| R7 | `190wuliangshoujingwuyiben` 10 + `301jgj` 10 | 20 | 2 篇 merge；均已有分片，注意区间 |
| R8 | `025taishanggy-yw` 14 + `262dachengrulengqiejing` 前 6 片 | 20 | 1 篇 merge；先删 025 源 `author` |
| R9 | `262` 余 15 + `205jgj-jiangyi` 前 5 | 20 | 1 篇 merge |
| R10 | `205` 余 14 | 14 | 1 篇 merge |
| R11 | `043mengyouji` 0-2279（19 片） | 19 | 半篇，无 merge |
| R12 | `043mengyouji` 2280-4479（19 片） | 19 | 1 篇 merge |

按此剩余 **10 篇**、约 **8 轮**（R5-R12）清完。`task-plan.mjs 120` 实测总队列 **155 个任务**，
其中 R4 的 14 个已完成，**剩余 141 个任务**（本表早先按篇目估算出的 161 / 192 均不准，以实时队列为准）。

## 5.1 时间台账（每轮会话末必须回填）

每个会话**结束时**（写完诊断后）在 `scripts/B-PHASE-HANDOFF.md` 追加一行到下面的表，
并据此更新「剩余预测」。计时口径：从本轮第一个子代理派发到本轮整篇提交完成为止，
不含会话中的人工等待；有跨轮补片时按实际归属轮次记。

| 轮 | 日期 | 任务数 | 完成篇 | 单轮耗时 | 累计篇 | 剩余篇 | 剩余预测 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | 2026-09-12 | 9 | `047shengmingdcj` | ~35 min | 1 | 16 | — |
| R2 | 2026-09-12 | 16 | `293jgj-zhu`, `246henghedashouyin` | ~60 min（含返工） | 3 | 14 | 17 轮 / ~9 h |
| R3 | 2026-09-12 | 12 | `102lfsx`, `403chanjing` | ~85 min（含 102 长线） | 5 | 12 | 9 轮 / ~6 h |
| R4 | 2026-09-12 | 14 | `001juezhichan`, `001jznf` | ~13 min（0 返工） | 7 | 10 | 见下（实测重算） |
| R5 | | 16 | 187 + 016 | ~16 min（预测） | | | |
| R6 | | 18 | 239 两篇 | ~18 min（预测） | | | |
| R7 | | 20 | 190 + 301 | ~20 min（预测） | | | |
| R8 | | 20 | 025 14 + 262 前 6 | ~20 min（预测） | | | |
| R9 | | 20 | 262 余 15 + 205 前 5 | ~20 min（预测） | | | |
| R10 | | 14 | 205 余 14 | ~14 min（预测） | | | |
| R11 | | 19 | 043 前 19 片 | ~45 min（预测，半篇无 merge） | | | |
| R12 | | 19 | 043 后 19 片 | ~45 min（预测） | | | |

**时间预测方法（R4 实测重算）**：R4 实测 **12.6 min**（14 个任务全并行、0 返工、收尾约 1 min），
即低密度篇在「全并行派发」下的经验值约 **0.9 min/任务**（含收尾）。已完成轮次耗时均值
**44.3 min/轮**（R1 35 + R2 60 + R3 85，含 R2 返工与 R3 的 `102lfsx` 长线）；剔除这两项异常
则为 **(35+85)/2 = 60 min/轮**。两种口径重算剩余 **10 篇 / 8 轮（R5-R12）/ 141 任务**：

- **乐观**（按 R4 实测 0.95 min/任务）：141 × 0.95 ≈ **134 min ≈ 2.2 h**
- **保守**（用「实测均值 44.3 min/轮 + R11/R12 各 45 min」口径）：**≈ 3.5 h**
- **推荐口径**（R4 实测 0.95 min/任务）：R5-R10 逐轮 16/18/20/20/20/14 = 108 任务 ≈ 103 min，
  R11-R12 是 043 的长块篇（约 41 任务）另有上限，合计仍落 **2.5–3.5 h**

⚠ **R8-R10 编组需以实时队列为准**：§4 表按篇目估算 `262dachengrulengqiejing` 21 任务、
`205jgj-jiangyi` 19 任务，而 §5 表只写了「262 余 15」「205 余 14」，两处对不上；
`025taishanggy-yw` 14 任务则与队列一致。**每轮派发前跑 `task-plan.mjs 120` 取实时区间，不要照抄本表。**

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
