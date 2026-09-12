# B 期交接与下一轮任务编组

> 承接 `scripts/RESUME.md`（B 期启动/收尾流程仍以它为准，本文件只补「本轮实测」与「下一轮编组」）。
> 生成时间：2026-09-12；**R4 完成于 2026-09-12**，**R5 完成于 2026-09-12**。工作区干净，全部已提交，**未 push**。

## 1. 当前位置（实测，R5 收尾后）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=266 crit=5 warn=11 parts=12**（R4 后为 264 / 6 / 11 / 13；A 期终点 257 / 6 / 11 / 20） |
| `scan-mojibake` | 0 / 303 |
| R5 新增整篇 | **2 篇**：`187hanshandashinianpushu` 880、`016xdwsjwl` 889（含修掉 `016` 源重复块覆盖的 p14 区间 855-888） |
| R5 结构核验 | 两篇均 `blockMis=0 typeMis=0 inlineMis=0 cjk=0`，href 集合与源**逐条相同**（187 各 16 个）；16 个分片 `verify-slices` 全 `ok`/`ok(big)` |
| crit 变化 | R5 消掉 2 项（`187hanshandashinianpushu:missing`、`239wuliangshoujing-jiaohuibenzhu-zhu` 尚存），剩 5 项：`043mengyouji:missing`、`239wuliangshoujing-jiaohuibenzhu-zhu:missing`、`068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing`（±1 错位） |
| 剩余 | **8 篇 / 14,379 未覆盖块 / 125 任务**（`task-plan.mjs 120`，R5 的 16 个已完成 → **剩余 109 任务 / 7 轮 R6-R12**） |
| R5 提交 | `d460b58`(r5 分片) `b36d30c`(r5 源 author 数据修正) `5c8a929`(r5 整篇) |
| 历史提交 | `521a40e`(r1) `2547fd5`+`4bc37e4`(r2) `ede709e`+`8443fd4`+`d8dd35e`(r3) `6cd4879`(tools) `06f73b6`(data) `8649a02`(r4 分片) `1cc9f23`(r4 整篇) |

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

### 2.8 R5 实测新增四条（2026-09-12）

**2.8.1 子代理的「verify 通过」报告，不能代替收尾时对全部分片的重跑。**
R4 的结论「代理零缺陷」在 R5 被推翻：16 片里有 **2 片**（`187hanshandashinianpushu.p7`、`016xdwsjwl.p3`）
代理**明确报告** `ok`/`ok(big)`，但父代理收尾重跑时是 `crit`——p7 报 5 块 inline 数不符 + 丢 1 个 href，
p3 报 5 块 inline 数不符。两片都在定向返工一轮后通过。
**根因**：`verify-slices` 对同一文件**反复跑**会因写入竞态/自检时点不同而不一致，代理的「最后一次自检」与交付态可能不同。
**对策**：§5 固定四步第一步（全部分片重跑 verify）**不可省**，且**不能**只看代理的完成报告。

**2.8.2（新缺陷类 D）`verify-slices` / `validate-en` 查不出 href 的「片段切分不对齐」。**
`187hanshandashinianpushu` 有 **3 个块**（abs 54、470、783）英文文本**完整无误**，但块内片段切分与源不对齐，
导致 href 片段把**整段叙述**包进超链接：abs 783 的 href 段长 470 字符而源链接文字仅 8 字；abs 54 第 2 个
href 段长 972 字符；abs 470 的 `《梦游集·春秋左氏心法序》` 两段链接文字与正文边界错位。
`verify-slices` 只比对「href 个数」（`enHref < srcHref` 才报错），`validate-en` 只比对 href 的**集合**，
两者都**不看 href 落在哪个片段**，所以这类缺陷可以整篇通过校验、只在渲染层才暴露。
**R5 已修**（`build/fix-187-href.mjs` + `build/fix-187-b54.mjs` + `build/fix-187-b783.mjs`，均保留块的拼接文本逐字节不变）：
783 的链接现在恰好覆盖 `(A Detailed Explanation of the Platform Sutra of the Sixth Patriarch)`；
470 的两个链接段只含标题文字；54 的两个链接段只含 `Dream Roam Collection`（源里两个 href 值与锚文本都相同，
故索引由 1/7 位移到 2/7，渲染结果与源一致）。
**对策**：新增审计脚本 `build/audit-href-align.mjs <slug>`，判据为「href 段 EN/ZH 比值相对整块平均比值偏差
> 2.0 且 EN 长度 > 60」，并用「后一段是否以收尾标点开头 + 前一段是否以 `(`/`see` 结尾」排除
`《大念住经注》` 这类**合法**的长标题展开（实测 `001juezhichan`/`001jznf` 各 2 处即为误报，人工确认边界正确）。
下一轮派发提示词里应要求子代理**逐块核对 href 落在正确片段**。
⚠ 残余：`54`/`783` 的 href **索引**与源差 1（锚文本已正确），系「把链接文字独立成段」的必然结果，
`verify-slices`/`validate-en` 均不因此报警。

**2.8.3 跨 agent 的「擅自恢复」污染工作区。**
`016xdwsjwl.p4` 的代理在合并/清理发生后**自行重建**了 `src/content/en/016xdwsjwl.p4.json`（未跟踪文件）
与 `build/slices/016xdwsjwl.p4.src.json`（它用整篇+源反推出来的「源」，并非真源）。
**危害**：重建的「源」会污染后续 `verify-slices` 的比对基准（拿错误基准去校验）。
**对策**：收尾清理后 `git status --porcelain` 必须为空；发现 `??` 的新分片一律**删除**、不要拿去 merge；
`build/slices/*.src.json` 只能由 `gap-prep` 生成。若确需恢复某片源，用 §2.2 的 `git show` 流程并核对 `firstBlock+块数`。

**2.8.4 源数据缺陷（照源保留，不改）**：`187hanshandashinianpushu` 源块 229/246 有一处未闭合的 `《`（`刺血书《华严经`），
全篇 `《`/`》` 计数 319/318 不平衡；`016xdwsjwl` 源 `《`/`》` 计数 50/51（多一个 `》`）。
两处均为源数据自身缺陷，1:1 结构下**不得**擅自补字符，已在报告里记明。

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
| R5 | `187hanshandashinianpushu` 8 + `016xdwsjwl` 8 | 16 | 2 篇 merge；**已于 2026-09-12 完成，实测 16 min**；先删 187 源 `author` |
| R6 | `239wuliangshoujing-jiaohuibenzhu-zhu` 9 + `239wuliangshoujing-huiyi` 9 | 18 | 2 篇 merge；同系列术语互参 |
| R7 | `190wuliangshoujingwuyiben` 10 + `301jgj` 10 | 20 | 2 篇 merge；均已有分片，注意区间 |
| R8 | `025taishanggy-yw` 13 + `262dachengrulengqiejing` 前 7 | 20 | 1 篇 merge；先删 025 源 `author` |
| R9 | `262` 余 11 + `205jgj-jiangyi` 前 5 | 16 | 1 篇 merge |
| R10 | `205` 余 13 | 13 | 1 篇 merge |
| R11 | `043mengyouji` 0-2279（19 片） | 19 | 半篇，无 merge |
| R12 | `043mengyouji` 2280-4479（19 片） | 19 | 1 篇 merge |

按此剩余 **8 篇**、**7 轮**（R6-R12）清完。`task-plan.mjs 120` R5 后实测 **8 篇有缺口 / 14,379 未覆盖块 / 125 任务**，
其中 R5 的 16 个已完成（`016xdwsjwl` 实测 8 任务而非 §4 的 8、`187` 8 任务），**剩余 109 个任务**。
（§4 表早先按篇目估算的 161 / 192、以及 262 的 21 / 205 的 19 均不准，以实时队列为准 —— 实测 262=18、205=18。）

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
| R5 | 2026-09-12 | 16 | `187hanshandashinianpushu`, `016xdwsjwl` | **43 min**（10:53→11:36；其中整篇提交于第 16 min，后续 20 min 为 D 类 href 返工与复核） | 9 | 8 | 见下（R5 实测重算） |
| R6 | — | 18 | 239 两篇 | ~16 min（预测） | 11 | 6 | 见下（R5 实测重算） |
| R7 | — | 20 | 190 + 301 | ~18 min（预测） | 13 | 4 | |
| R8 | — | 20 | 025 13 + 262 前 7 | ~18 min（预测） | 15 | 3 | |
| R9 | — | 16 | 262 余 11 + 205 前 5 | ~15 min（预测） | 16 | 3 | |
| R10 | — | 13 | 205 余 13 | ~12 min（预测） | 17 | 2 | |
| R11 | — | 19 | 043 前 19 片（半篇无 merge） | ~17 min（预测） | 17 | 2 | |
| R12 | — | 19 | 043 后 19 片 | ~17 min（预测） | 18 | 1 | |

**时间预测方法（R5 实测重算，2026-09-12）**：R5 整篇提交耗时 **16 min / 16 任务 = 1.0 min/任务**（10:53 派发 → 11:09 提交），
但**含 D 类 href 返工与复核的完整会话为 43 min**（11:36 结束）。两笔账要分开看：
**下轮容量按「翻译+收尾 ≈ 1.0 min/任务」算**，**会话预算按「1 轮 ≈ 20-45 min」算**（取决于是否踩到缺陷类）。
已完成轮次：R1 35 + R2 60（含返工）+ R3 85（含 102 长线）+ R4 13 + R5 16 min（纯提交口径）。

- **平均单轮耗时（全口径）**：(35+60+85+13+16)/5 = **41.8 min/轮**；该口径被 R2 返工与 R3 长线拉高。
- **剔除异常轮**（R2 返工、R3 的 `102lfsx` 长线）：(35+13+16)/3 = **21.3 min/轮**——R1、R4、R5 都是 8 槽级轮次，
  最接近剩余轮次形态，故**推荐按此口径**；R5 若按含 D 类返工的 43 min 计，则 (35+13+43)/3 = **30.3 min/轮**。
- **按任务数口径**（更稳）：剩余 **109 任务 × 1.0 min ≈ 109 min ≈ 1.8 h** 纯翻译+收尾。

**实时队列（R5 后实测，`task-plan.mjs 120`）**：8 篇有缺口 / **14,379 未覆盖块 / 125 任务 / 0 被挡**。
逐篇任务数：`239-jiaohui` 9、`239-huiyi` 9、`190` 10、`301` 10、`025` 13、`205` 18、`262` 18、`043` 38。
剩余 7 轮（R6-R12）按 8 槽/轮、尾部余量用下一篇前几片补满编组：

| 轮 | 编组（实时区间） | 任务 |
| --- | --- | --- |
| R6 | 239 两篇（jiaohui 9 + huiyi 9） | 18 |
| R7 | 190wuliangshoujingwuyiben 10 + 301jgj 10 | 20 |
| R8 | 025taishanggy-yw 13 + 262dachengrulengqiejing 前 7 | 20 |
| R9 | 262 余 11 + 205jgj-jiangyi 前 5 | 16 |
| R10 | 205jgj-jiangyi 余 13 | 13 |
| R11 | 043mengyouji 前 19 片（半篇，无 merge） | 19 |
| R12 | 043mengyouji 后 19 片 | 19 |

三行结论：**剩余篇数 8 篇**；**剩余轮数 7 轮（R6-R12）**；
**预计总时长 109 min ≈ 1.8 h**（纯翻译+收尾，按 1.0 min/任务），
**会话预算保守口径 21.3-30.3 min/轮 × 7 轮 ≈ 2.5-3.5 h**（含可能的缺陷返工）。
R11/R12 的 `043mengyouji` 是 19 片长轮次，按用户决定**单独拆会话**，不并入常规轮次统计。
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

**R5 会话末已清理**：`build/` 由 565 文件 / 12.4MB（R4 遗留）降到 **298 文件 / 9.0MB**；
删除了 R5 的 16 个分片源（`187hanshandashinianpushu.*`、`016xdwsjwl.*` 的 `.src.json`，对应分片已 merge）、
R3/R4 的陈旧源（`001juezhichan.*`、`001jznf.*`、`102lfsx.*`），以及本轮所有脚手架
（`build/audit-href-align.mjs`、`fix-187-*.mjs`、`fix-016-spaces.mjs`、`ledger-r5.mjs`、
`diag-rogue-p4.mjs`、`prep-p7-brief.mjs`、`tmp-187-*`、`recover-*`）。
**注意**：`016xdwsjwl.p4` 的代理曾擅自重建 `src/content/en/016xdwsjwl.p4.json`（未跟踪）与
`build/slices/016xdwsjwl.p4.src.json`，两者均已删除（见 §2.8.3）。

**R5 收尾后提交**（不含 push）：`d460b58`(分片) `b36d30c`(源 author) `5c8a929`(整篇)
`75600f7`(016 边界空格) `78b13d8`(187 href 对齐) + 本台账提交。
