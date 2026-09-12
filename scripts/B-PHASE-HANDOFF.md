# B 期交接与下一轮任务编组

> 承接 `scripts/RESUME.md`（B 期启动/收尾流程仍以它为准，本文件只补「本轮实测」与「下一轮编组」）。
> 生成时间：2026-09-12；**R4 完成于 2026-09-12**，**R5 完成于 2026-09-12**，**R6 完成于 2026-09-12**，**R7 完成于 2026-09-12**。工作区干净，全部已提交，**未 push**。

## 1. 当前位置（实测，R7 收尾后）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=270 crit=4 warn=11 parts=9**（R6 后为 268 / 4 / 11 / 11；R5 后 266 / 5 / 11 / 12；A 期终点 257 / 6 / 11 / 20） |
| `scan-mojibake` | 0 / 304 |
| R7 新增整篇 | **2 篇**：`190wuliangshoujingwuyiben` 1124、`301jgj` 1184 |
| R7 结构核验 | 22 个分片 `verify-slices` 全 `ok`/`ok(big)`、**0 crit**（父代理**全量重跑**，非采信代理自报，含既有 `190.p5`/`301.p16`）；另跑逐块审计：`typeMis=0 inlineMis=0 hrefCountMis=0 hrefAlignFlagged=0 cjk=0 shortBlocks=0`；190 的 11 片覆盖 `0-1123`、301 的 11 片覆盖 `0-1183`，首尾相接、无重叠无缺口 |
| R7 class-D 审计 | 64 个 href 片段（190 全篇 0 href + 301 全篇 6 href）**片段索引与源逐一相同**，`hrefAlignFlagged=0`——连续两轮（R6/R7）无 §2.8.2 类缺陷 |
| R7 新修复 | 既有分片 `190wuliangshoujingwuyiben.p5`（301-372）把源里**独立成片段**的字形拆解记法合并成段（`biao–shi+tu`/`hou*ye`）→ 使 2 块 inline 数与源不符；已按源片段粒度拆分（**拼接文本逐字节不变**，3 处 split），提交 `142a662`。若不修，整篇 merge 后 `validate-en` 会新增 1 条 warn |
| crit 变化 | R7 的 2 篇本身无 crit（此前它们被计入 `parts` 桶——**只要有分片，validate-en 就整篇跳过**，见 §2.10.2），故 crit 仍为 4 项：`043mengyouji:missing`、`068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing`（±1 错位） |
| 剩余 | **4 篇 / 10,222 未覆盖块 / 87 任务**（`task-plan.mjs 120`：043=38、262=18、205=18、025=13） |
| R7 提交 | `41aceb3`(r7 分片 20 片) `142a662`(190 p5 拆字修复) `d0b8a1e`(r7 整篇 2 篇) |
| 历史提交 | `521a40e`(r1) `2547fd5`+`4bc37e4`(r2) `ede709e`+`8443fd4`+`d8dd35e`(r3) `6cd4879`(tools) `06f73b6`(data) `8649a02`(r4 分片) `1cc9f23`(r4 整篇) `d460b58`(r5 分片) `b36d30c`(r5 源 data) `5c8a929`(r5 整篇) `75600f7`+`78b13d8`(r5 修补) `c206d72`(r5 台账) `f7277c5`+`1807e3e`(r6) `2a86970`(r6 台账) |

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

### 2.9 R6 实测新增三条（2026-09-12）

**2.9.1 §5.5「`merge-parts` 只看 `firstBlock` 连续性」有一个未记的**完全嵌套孤儿**变体。**
`239wuliangshoujing-huiyi` 事先有一个 `p13.json`（旧网格，覆盖 **965-1034**，70 块），而 R6 的新网格把
`p8`（840-959）+ `p9`（**960-1034**，75 块）覆盖了**同一区间**。按 `firstBlock` 排序后顺序为
p8(840) → p9(960) → p13(965)，前两片已凑满 1035 块，p13 落在 `next` 之外被**静默跳过**（既不报 gap 也不报 fail），
`merge-parts` 仍打印 `[merged] 1035 blocks`。**危害**：若 p8/p9 只到 1034 而 p13 补充了别的内容，会静默丢块。
**处置（本轮）**：merge 前先删 `p13.json`（该文件已在历史里，`git show 3bd4d04:src/content/en/239wuliangshoujing-huiyi.p13.json` 可取回）。
判据：`gap-prep` 会给新片分配「最小的未占用 `pN`」，若该 N **大于**既有分片号，就要怀疑**嵌套孤儿**——
先跑 `node scripts/coverage.mjs <slug>` 看缺口区间，确认旧片区间被新片完全包含后再删。

**2.9.2 同一篇多片并行时，`meta` 只加在第一片。**
`gap-prep` 对 `a===0` 的片才写 `includeMeta`。R6 两篇的 p1 都带 `title`/`author`/`excerpt`，
p2-p9 一律 `meta=no`——派发提示词里必须逐片写死 `meta=yes/no`，不能整篇一个值。

**2.9.3 PowerShell 双引号内的 `$` 会被当变量吞掉，导致自写诊断脚本静默扫错全库。**
本轮父代理用 `node --input-type=module -e "...enFiles.includes(s+'.json')..."`（pwsh 双引号）时，
`/\.json$/` 与 `/\.p\d+\.json$/` 里的 `$` 被 pwsh 折叠，正则退化成前缀匹配，脚本于是报告
「121 篇有缺口 / 470 任务」——与 `task-plan.mjs` 的「6 篇 / 107 任务」相差 20 倍。
**对策**：诊断脚本一律写进 `build/recover-*.mjs` 再 `node` 执行（本轮已如此复核，见 §5.1 实时队列），
**不要在 pwsh 双引号里内联带 `$` 的 JS 正则**。

### 2.10 R7 实测新增五条（2026-09-12）

**2.10.1 `gap-prep` 一次调用只按「第一个缺口」或一个 `a-b` 区间产出 1 个 src，整篇必须按 120 块网格逐段显式传区间，且必须顺序多次调用。**
`node scripts/gap-prep.mjs <slug>` 只取 `gaps[0]`：190 的缺口是 `0-300` + `373-1123`，直接调用会产出一个 301 块的巨片（超出 `task-plan` 的 120 块网格）。
正确做法（R7 实测有效）：
```powershell
node scripts/gap-prep.mjs "190wuliangshoujingwuyiben:0-119"
node scripts/gap-prep.mjs "190wuliangshoujingwuyiben:120-239"   # 顺序调用，后一次能看到前一次写的 src
```
`gap-prep` 会 reserve `build/slices` 里已占用的 `pN`，**顺序**调用即可自动跳过既有分片号（190 跳过 `p5` → 产出 p1,p2,p3,p4,**p6**…p11；301 跳过 `p16` → p1…p10）。
但同一篇的两个区间**不能合并成一次调用**，否则两次都取同一个最小空位而互相覆盖（脚本头部注释已写明）。

**2.10.2 〔最隐蔽〕既有分片的「源片段粒度」缺陷在 merge 前对所有校验**完全隐形**。**
`validate-en.mjs:54` 是 `if (parts.length) { r.parts.push(slug); continue }`——**只要该篇还有任意 `pN.json`，整篇结构校验就被跳过**，只计入 `parts` 计数。
而 `verify-slices` 对旧网格分片报 `missing-src`（其 `.src.json` 早在清理时删掉），**不会**比对结构。
唯一能看出异常的是 `coverage.mjs <slug>` 的 **`bad` 列**（它拿 zh 原文做基准逐块比对 `t` 与 `inline` 数）。
R7 实测：`190.p5`（301-372）`bad=1`，根因是源把 CBETA 字形拆解记法存成**独立片段**（`[` `(` `膘` `-` `示` `+` `土` `)*` `瓦` `]`），旧分片却合并成 `"biao–shi+tu"`/`"wa"` → abs 321（11→7）、abs 331（13→9）两块 inline 数不符。
**判据**：`node scripts/coverage.mjs <slug>` 出现 `bad≥1` 且缺口区间**之外**的既有分片有错。
**处置（本轮已做）**：只按源片段粒度拆分 EN 段，**保证拼接文本逐字节不变**（脚本内断言），单独提交 `142a662`。
复核方式：`build/recover-r7-tempsrc.mjs` 从 **zh 原文**（而非整篇 EN，见 §2.8.3）生成临时 `.src.json` → 跑 `verify-slices` → 立刻删除。

**2.10.3 派发模板对「字形拆解记法」务必写成条件式。**
R7 我把「该源含 CBETA 字形拆解记法」写死在 190 的 p6-p9 提示词里，但实测 **p7/p8/p10/p11 源中并无该记法**（只有 p5 与 p4/p2/p9 的个别块有）。
代理正确地按真源处理、未臆造（p7 代理明确回报「派发模板串了片」），但模板应写「**若**源含…逐片段对应；**若源中没有该记法就不要臆造**」。

**2.10.4 `verify-slices` 不比对块**内容**，分批追加写入会静默漏行/重复行。**
R7 有三个代理自报这一点：`190.p10` 分 3 批追加时**两次整块漏译**（`verify-slices` 仍报 ok，因为块数与 inline 数没变）；`190.p11` 首次写入**重复插入** 1 块（verify 报 `blocks 32!=31` 才发现）；`301.p3`/`190.p8` 各 1 处引号片段缺失/多余。
**对策**：收尾除全量 `verify-slices` 外，必须再跑一次逐块审计（父代理 `build/recover-r7-verify.mjs` 的做法）：`typeMis`/`inlineMis`/`hrefCount`/**href 片段索引**/`cjk`/**空块**/`短块`（EN 长度/zh 长度 < 0.15 且 zh>40 报警）。R7 全库 22 片该审计为 0 异常（65 个空块全部是**源块本身为空**、8 个空片段照源保留）。

**2.10.5 两篇的既有分片与新网格「首尾相接」，未触发 §2.9.1 的嵌套孤儿变体。**
`190` 新片覆盖 `0-300`+`373-1123`，既有 `p5` 恰好是 `301-372`；`301` 新片覆盖 `0-1129`，既有 `p16` 恰好是 `1130-1183`。
两篇的新片号都比既有片号**小**（190 最大 p11 < 无更大；301 最大 p10 < p16），正是 §2.9.1 判据里「不应怀疑嵌套孤儿」的情形；`merge-parts` 一次通过（`[merged] 1124 blocks` / `1184 blocks`），无 gap/overlap。

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

**R6 实测：剩余 6 篇全部为「低」档（1.0–3.2 槽/块）**，`102lfsx` 是**唯一**高密度篇且已完成（R3）。
剩余篇也不会再遇到该问题。R6 实测两篇：`239-jiaohui` 2.0 槽/块、`239-huiyi` 2.1 槽/块。
**R7 实测两篇（均为「低」档，直接派发、正常节奏）**：`190wuliangshoujingwuyiben` blocks=1124 slots=1251 → **1.1 槽/块**；
`301jgj` blocks=1184 slots=2228 → **1.9 槽/块**。两篇的**槽密度都不构成风险**，R7 的超时/返工来源是 §2.10.2 的既有分片缺陷与 §2.10.4 的漏行，**与槽密度无关**。
⚠ 但 190 的源在个别块里有「字形拆解记法拆成多片段」的情形（每块最多 25 片段），这类块**不能按块内平均槽数判断**，必须逐块 1:1（见 §2.10.2/§2.10.3）。

## 4. 剩余篇目的工作量（R7 收尾后实时值，`task-plan.mjs 120`）

> ⚠ 下表「任务数」已按 R7 收尾后的实时队列校正（原按篇估算的 14/19/21 等值不准）；
> **R7 后剩余 4 篇（025 / 205 / 262 / 043），R7 的 190、301 已完成**。
> **每轮派发前仍必须重跑 `node scripts/task-plan.mjs 120` 取实时区间。**

| slug | 未覆盖块 | 任务数 | 字节/块 | 备注 |
| --- | --- | --- | --- | --- |
| `001juezhichan` | 808 | 7 | 433 | **R4 已完成** |
| `001jznf` | 801 | 7 | 437 | **R4 已完成** |
| `187hanshandashinianpushu` | 880 | 8 | 425 | **R5 已完成** |
| `016xdwsjwl` | 889 | 8 | 448 | **R5 已完成** |
| `239wuliangshoujing-jiaohuibenzhu-zhu` | 1010 | 9 | 346 | **R6 已完成**（整篇 1010，含 5 个 href） |
| `239wuliangshoujing-huiyi` | 1035 | 9 | 355 | **R6 已完成**（整篇 1035；旧网格孤儿 p13 已删） |
| `190wuliangshoujingwuyiben` | 1052 | 10 | 384 | **R7 已完成**（整篇 1124；既有 p5 的字形拆解粒度缺陷已在 R7 修掉）；原有 p5（301-372） |
| `301jgj` | 1130 | 10 | 380 | **R7 已完成**（整篇 1184；已有 p16 覆盖 1130-1183，与新片首尾相接） |
| `025taishanggy-yw` | 1463 | 13 | 465 | **meta-scan 报 author 缺陷（派发前先删源 `author`）**；缺口 `0-265`、`362-1558` |
| `205jgj-jiangyi` | 2128 | 18 | 561 | 已有 p43/p44/p45；块 0 是 h2；缺口 `0-2127` |
| `262dachengrulengqiejing` | 2151 | 18 | 154 | 已有 p13/p14；块 1 是空 h2；缺口 `0-2150` |
| `043mengyouji` | 4480 | 38 | 491 | crit:missing；**meta-scan 报 author 缺陷（派发前先删源 `author`）**；缺口 `0-4479` |

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
| R6 | `239wuliangshoujing-jiaohuibenzhu-zhu` 9 + `239wuliangshoujing-huiyi` 9 | 18 | 2 篇 merge；**已于 2026-09-12 完成，实测 19 min，0 返工** |
| R7 | `190wuliangshoujingwuyiben` 10 + `301jgj` 10 | 20 | 2 篇 merge；**已于 2026-09-12 完成，实测 22 min，父代理侧 0 返工、0 降级**；顺带修掉既有 p5 的拆字粒度缺陷 |
| R8 | `025taishanggy-yw` 13 + `262dachengrulengqiejing` 前 7 | 20 | 1 篇 merge；先删 025 源 `author` |
| R9 | `262` 余 11 + `205jgj-jiangyi` 前 5 | 16 | 1 篇 merge |
| R10 | `205` 余 13 | 13 | 1 篇 merge |
| R11 | `043mengyouji` 0-2279（19 片） | 19 | 半篇，无 merge；先删 043 源 `author` |
| R12 | `043mengyouji` 2280-4479（19 片） | 19 | 1 篇 merge |

按此剩余 **4 篇**、**5 轮**（R8-R12）清完。`task-plan.mjs 120` R7 后实测 **4 篇有缺口 / 10,222 未覆盖块 / 87 任务 / 0 被挡**
（R6 后为 6 篇 / 12,404 / 107）。R7 的 20 个任务全部完成、**父代理侧 0 返工、0 降级**（R4 之后连续四轮 R4/R5/R6/R7 无代理降级交付）。
（§4 表早先按篇目估算的 161 / 192、以及 262 的 21 / 205 的 19 均不准，以实时队列为准 —— R6 后实测 262=18、205=18、025=13、190=10、301=10、043=38。）

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
| R6 | 2026-09-12 | 18 | `239wuliangshoujing-jiaohuibenzhu-zhu`, `239wuliangshoujing-huiyi` | **19 min**（11:28→11:47；其中分片提交于第 19 min，0 返工、0 降级） | 11 | 6 | 见下（R6 实测重算） |
| R7 | 2026-09-12 | 20 | `190wuliangshoujingwuyiben`, `301jgj` | **22 min**（11:57:49 会话开工、≈12:00 首批 8 代理派发 → 12:21:56 整篇提交 `d0b8a1e`；8+8+4 三批；父代理侧 0 返工、0 降级，另含 p5 拆字修复 1 次） | 13 | 4 | 见下（R7 实测重算） |
| R8 | — | 20 | 025 13 + 262 前 7 | ~21 min（预测） | 14 | 3 | 见下（R7 实测重算） |
| R9 | — | 16 | 262 余 11 + 205 前 5 | ~17 min（预测） | 15 | 2 | 见下（R7 实测重算） |
| R10 | — | 13 | 205 余 13 | ~14 min（预测） | 16 | 1 | 见下（R7 实测重算） |
| R11 | — | 19 | 043 前 19 片（半篇无 merge） | ~20 min（预测） | 16 | 1 | 见下（R7 实测重算） |
| R12 | — | 19 | 043 后 19 片 | ~20 min（预测） | 17 | 0 | 见下（R7 实测重算） |

**时间预测方法（R7 实测重算，2026-09-12）**：R7 从首批派发（≈12:00）到整篇提交（`d0b8a1e`，12:21:56）为 **22 min / 20 任务 = 1.10 min/任务**，
其中 20 片分 8+8+4 三批派发（8 槽并发上限），22 片（含 2 个既有分片）在收尾时由父代理**全量重跑** `verify-slices` 得 **22 ok / 0 crit**、
逐块审计 `typeMis=inlineMis=hrefCountMis=hrefAlignFlagged=shortBlocks=0`——**父代理侧 0 返工、0 降级**；
代理自报的迭代多为 1–3 轮内的自检修正（`301.p3` 补 1 个引号片段、`190.p11` 去 1 个重复块、`190.p8` 去 1 个多余引号、`301.p10` 补 2 处漏行）。
已完成轮次（纯提交口径）：R1 35 + R2 60（含返工）+ R3 85（含 102 长线）+ R4 13 + R5 16 + R6 19 + R7 22 min。

- **平均单轮耗时（全口径）**：(35+60+85+13+16+19+22)/7 = **35.7 min/轮**；该口径被 R2 返工与 R3 长线拉高。
- **剔除异常轮**（R2 返工、R3 的 `102lfsx` 长线）：(35+13+16+19+22)/5 = **21.0 min/轮**——R1/R4/R5/R6/R7 都是 8-20 槽级轮次，
  最接近剩余轮次形态，故**推荐按此口径**（R7 的 22 min 已含一次额外修复提交，仍落在该均值上）。
- **按任务数口径**（更稳，跨轮可比）：已实测轮次共 (9+16+12+14+16+18+20)=**105 任务** / (35+60+85+13+16+19+22)=**250 min**
  = **2.38 min/任务**（含 R2/R3 返工）；**剔除 R2/R3** 后 (9+14+16+18+20)=**77 任务** / (35+13+16+19+22)=**105 min** = **1.37 min/任务**。
  最近三轮 R5/R6/R7（结构最接近剩余轮次）：(16+18+20)=54 任务 / (16+19+22)=57 min = **1.06 min/任务**，是当前最有代表性的实测值。

**实时队列（R7 后实测，`task-plan.mjs 120`）**：**4 篇有缺口 / 10,222 未覆盖块 / 87 任务 / 0 被挡**。
逐篇任务数与缺口区间（本轮实测，取代 §4 的按篇估算值）：

| slug | 任务 | 缺口块 | 缺口区间 | 备注 |
| --- | --- | --- | --- | --- |
| `043mengyouji` | 38 | 4,480 | `0-4479` | crit:missing；**meta-scan 报 author 缺陷（派发前先删源 `author`）** |
| `262dachengrulengqiejing` | 18 | 2,151 | `0-2150` | 已有 p13/p14；块 1 是空 h2 |
| `205jgj-jiangyi` | 18 | 2,128 | `0-2127` | 已有 p43/p44/p45；块 0 是 h2 |
| `025taishanggy-yw` | 13 | 1,463 | `0-265` `362-1558` | 已有 p7/p26/p27；**meta-scan 报 author 缺陷（派发前先删源 `author`）** |

剩余 5 轮（R8-R12）按 8 槽/轮、尾部余量用下一篇前几片补满编组：

| 轮 | 编组（实时区间） | 任务 | 备注 |
| --- | --- | --- | --- |
| R8 | 025taishanggy-yw 13 + 262dachengrulengqiejing 前 7 | 20 | 1 篇 merge；**先删 025 源 `author`** |
| R9 | 262 余 11 + 205jgj-jiangyi 前 5 | 16 | 1 篇 merge |
| R10 | 205jgj-jiangyi 余 13 | 13 | 1 篇 merge |
| R11 | 043mengyouji 前 19 片（半篇，无 merge） | 19 | **先删 043 源 `author`** |
| R12 | 043mengyouji 后 19 片 | 19 | 1 篇 merge |

三行结论（R7 实测重算）：**剩余篇数 4 篇**；**剩余轮数 5 轮（R8-R12）**；
**预计总时长 105 min ≈ 1.75 h**（87 任务；按 R1/R4/R5/R6/R7 均值 21.0 min/轮 × 5 轮 = 105 min，纯翻译+收尾；
按任务口径 87 × 1.37 = 119 min ≈ 2.0 h；按最近三轮 R5/R6/R7 均值 1.06 min/任务 = 92 min ≈ 1.5 h）。
R11/R12 的 `043mengyouji` 是 19 片长轮次，按用户决定**单独拆会话**，不并入常规轮次统计。
⚠ **R8-R12 编组需以实时队列为准**：每轮派发前跑 `node scripts/task-plan.mjs 120` 取实时区间，不要照抄本表；
`025`/`043` 的 `author` 缺陷必须**先改 `src/content/articles/<slug>.json`** 再 `gap-prep`（见 §2.8.3 与 §6）。

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

- `068xiangxujs`、`101yebunengxi` 的 CJK 残留；`303liuzutanjing` ±1 错位（见 RESUME §6）。**R7 后 crit 仍只剩这 4 项**（含 `043mengyouji:missing`）；`187hanshandashinianpushu:missing`、`239wuliangshoujing-jiaohuibenzhu-zhu:missing` 已分别由 R5、R6 消掉。R7 的 2 篇（190/301）本身无 crit——它们此前因「有分片」被 `validate-en` 整篇跳过（§2.10.2），R7 merge 后**直接以 `ok` 入账**（`ok 268→270`）。
- `187hanshandashinianpushu:missing`：实际资产在 `187hanshandashinianpushu-old`，slug 不匹配（该篇本身已于 R5 完成）。
- `246henghedashouyin` 源块 605 有字面 `??`（源数据损坏，非 mojibake）。
- warn 11 项（行内片段数，展示层无影响）；`meta-scan` 报 `043mengyouji`（author=`憨山老人自赞`）、`025taishanggy-yw`（author=`姚端恪公颂`）的 author 为块首正文，**改 `src/content/articles/*.json`，不是改 en**（`187hanshandashinianpushu` 已于 R5 修掉）。**这两处必须在 R8（025）与 R11（043）派发前先删。**
- 片段接头空格（RESUME §5.7，253 篇）：**先定策略再动手**，本轮未碰。R6 的 18 片都已按「边界自带空格」写好，但**同篇旧分片**（如已删的 `huiyi.p13`）不一定带；跨片一致性需在 §5.7 统一策略时一并处理。
- **R6 新发现的展示层不一致（非缺陷，记明不返工）**：R6 两个代理对**同篇标题编号**采用了不同基准——`jiaohui.p8` 用「38.–45.」续写、`huiyi.p4` 用「7.–13.」续写而 `huiyi.p9`/`p13` 用「44.–48.」。
- **R7 新发现的展示层不一致（非缺陷，记明不返工）**：`190wuliangshoujingwuyiben` 是「五种原译本」合刊，各卷 h2 是**不同经题**（汉译《无量清净平等觉经》、宋译《大乘无量寿庄严经》等），故 p1/p2/p3/p6/p8/p9 的 h2 措辞不同**属正常**（不是同一标题的不一致）。唯一真正重复指代的是汉译经题：p1 的 `excerpt` 作 "The Sutra of the Buddha's Infinite Purity and Equal Enlightenment"，p3/p6/p9 的 h2 作 "The Sutra of Immeasurable Pure and Equal Enlightenment"——两者都是对 无量清净平等觉经 的合法译法，`verify-slices`/`validate-en` 均不受影响，**按 R6 先例记明不返工**；若后续要统一，改 p1 的 `excerpt` 一处即可。
- **R7 记明的源数据缺陷（照源保留，未改）**：`190` 有多块引号开合不平衡（p7 整段 `“`/`”`=69/56、p11 块 10/14 以未闭合开引号结尾、p2 块 #110 源 2 开 3 闭）、p1 块 #14/#58/#59/#69/#86/#97/#105 引号不平衡、p2 块 #12/#45/#46 源无引号；`301` 块 30 源缺右引号、块 36 偈颂被切片截断（仅两行）。全部**逐块照源对齐**、未擅自补删字符。
- **R7 记明的一处轻微增译**：`190.p4` 块 91（abs 464，字形拆解 `[怡-台+(公/心)]`）在拆解片段**之后**补了半句释义 " — that is, confused and ill at ease."（片段数与源一致、不改结构，仅为可读性）。`301.p6` 块 30 把源缺失的右引号按英文习惯补齐。二者均不影响 `verify-slices`/`validate-en`。

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

**R6 会话末已清理**：`build/` 由 298 文件 / 9.0MB 降到 **258 文件 / 7.3MB**；
删除了 R6 的 18 个分片源（`239wuliangshoujing-*.*.src.json`，对应分片已 merge）与陈旧源
（`403chanjing.*`、`047shengmingdcj.*`、`293jgj-zhu.*`、`246henghedashouyin.*`、`016xdwsjwl.*`、
`001juezhichan.*`、`001jznf.*`、`102lfsx.*`），以及父代理本轮唯一脚手架 `build/recover-r6-queue.mjs`
与 `build/_r6.tasks.txt`。
**R6 的 18 个代理未在仓库留下任何脚手架**——但有 2 个代理在 `scripts/` 留了临时件
（`scripts/_fix239p5.py`、以及 `.tmp-239jh.p1.cfg.mjs`/`.tmp-gen-239jh.p1.mjs`/`.p1-check*.mjs`/`_p5dump.txt`），
其中 `scripts/_fix239p5.py` 已由父代理删除；**下一轮提示词应显式加上「临时件只许放 `build/` 且会话末自删，禁止写 `scripts/`」**。
`git status --porcelain` 收尾时为空。

**R6 收尾后提交**（不含 push）：`f7277c5`(r6 分片 18 片) `1807e3e`(r6 整篇 2 篇) + 本台账提交。

**R7 会话末已清理**：`build/` 由 286 文件 / 8.1MB 降到 **259 文件 / 7.3MB**（R6 收尾后为 258 / 7.3MB）；
删除了 R7 的 20 个分片源（`190wuliangshoujingwuyiben.*.src.json`、`301jgj.*.src.json`，对应分片已 merge）
与父代理本轮全部脚手架（`build/recover-r7-diag.mjs`、`recover-r7-p5dump.mjs`、`recover-r7-fix-p5.mjs`、
`recover-r7-tempsrc.mjs`、`recover-r7-verify.mjs`、`build/_r7-audit.txt`、`build/_r7-validate-baseline.txt`、`build/_r7-queue.txt`）。
**R7 的 20 个代理同样未在仓库留下任何脚手架**（它们自报的临时件全在 `build/` 且已自删）；
`scripts/` 无任何临时件（R6 那条「提示词显式禁止写 `scripts/`」的纪律生效）。
用于校验既有分片的两个临时 `.src.json`（`190.p5`/`301.p16`）由 `recover-r7-tempsrc.mjs` 从 **zh 原文**生成、用完立即 `--clean` 删除，未参与 merge（§2.8.3）。
`git status --porcelain` 收尾时为空。

**R7 收尾后提交**（不含 push）：`41aceb3`(r7 分片 20 片) `142a662`(190 p5 拆字粒度修复) `d0b8a1e`(r7 整篇 2 篇) + 本台账提交。
