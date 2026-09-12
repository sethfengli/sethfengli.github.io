# B 期交接（精简版）

> 启动/收尾流程照 `scripts/RESUME.md`；本文件只保留**后续轮次用得上的**实测事实。
> **每轮派发前必跑**：`node scripts/task-plan.mjs 120`（唯一权威队列）与 `node scripts/coverage.mjs <slug>`。
> 更新时间：2026-09-12（R9 收尾后）。工作区干净、全部已提交、**未 push**。

## 1. 当前状态

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=272 crit=4 warn=11 parts=7** |
| `scan-mojibake` | 0 / 306 |
| 已完成 | **16 篇**（A 期 11 + B 期 R1-R9：`047shengmingdcj` `293jgj-zhu` `246henghedashouyin` `102lfsx` `403chanjing` `001juezhichan` `001jznf` `187hanshandashinianpushu` `016xdwsjwl` `239…jiaohuibenzhu-zhu` `239…huiyi` `190wuliangshoujingwuyiben` `301jgj` `025taishanggy-yw` **`262dachengrulengqiejing`**） |
| 剩余 | **2 篇 / 6,008 未覆盖块 / 51 任务 / 0 被挡**（`043=38`、`205=13`） |
| 205 进度 | 已交付 `p1-p5`（`0-599`）+ 既有 `p43/p44/p45`（`2128-2223`）；R10 做 `600-2127` 13 片 |
| crit 4 项（**非 B 期，勿顺手改**） | `043mengyouji:missing`、`068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing`（±1 错位） |
| R9 提交 | `4a3e15d`(262 x10 + 205 x5) `778f811`(262 p15 补跑) `2b02183`(262 整篇 2442 块) |

## 2. 后续轮次编组（R10-R12）

| 轮 | 编组 | 任务 | 产出 |
| --- | --- | --- | --- |
| R10 | 205 `600-2127`（13 片） | 13 | **1 篇 merge（205）** |
| R11 | 043 `0-2279`（19 片） | 19 | 半篇，**无 merge**；**先删 043 源 `author`** |
| R12 | 043 `2280-4479`（19 片） | 19 | 1 篇 merge（043） |

R10 明细（120 块网格）：`600-719` `720-839` `840-959` `960-1079` `1080-1199` `1200-1319` `1320-1439` `1440-1559` `1560-1679` `1680-1799` `1800-1919` `1920-2039` `2040-2127`；全部 `meta=no`（`0-119` 那片已由 R9 交付并带 meta）；已有分片 `p43/p44/p45`（`2128-2223`）。
R11/R12 的 043 缺口 `0-4479`，**无任何现成 `.src.json`**，19 片需 `gap-prep` 顺序生成（`0-119` 那片是 `meta=yes`，且**必须先删源 `author=憨山老人自赞`**）。

### ⚠ R10 的源：205 的 6-13 片**必须跑 `gap-prep`**（顺序调用）
```bash
node scripts/gap-prep.mjs "205jgj-jiangyi:600-719"
node scripts/gap-prep.mjs "205jgj-jiangyi:720-839"     # 顺序，勿合并成一次调用
# … 依次到 "205jgj-jiangyi:2040-2127"
```
`gap-prep` 会 reserve 已占用的 `pN`（205 已有 `p1-p5`），顺序调用自动续号；片号与 `en/` 文件名不必对应网格（merge 只按 `firstBlock` 排序），照源里的 `firstBlock` 写死提示词。**一个 `pN.json` 只派一个代理**。
⚠ R9 教训：**R9 漏跑了 262 `p15`（1440-1559）**，收尾 `coverage.mjs` 才发现缺口（`parts=19 / uncovered=120`）→ 补派一片后才 merge。**每轮 merge 前必须跑 `coverage.mjs <slug>` 确认 `uncovered_blocks=0` 且 `bad=0`**。


## 3. 必须遵守的坑（只留后续还会踩的）

**3.1 `slice-plan.mjs` 与 `plan-slices.mjs` 同名互覆。** `slice-plan.mjs` 是**生成器**（会覆盖 `slice-plan.json`）；日常要跑的是审计器 `node scripts/plan-slices.mjs`（应输出「0 篇有缺口 / 一致性问题 0 条」）。误跑生成器会把审计器覆盖掉，需 `git checkout -- scripts/plan-slices.mjs`。

**3.2 取回历史分片只能用 `Set-Content -Encoding utf8` + Node 去 BOM。** `git show <sha>:<path> > file` 在 PowerShell 里写 UTF-16，产出的 JSON 非法。

**3.3 分片必须「单独先提交一次」再 merge。** 本仓库 `git add` + 立即 commit 曾出现「blob 未落盘」；`merge-parts` **会删掉**它合并的分片，顺序错就永久丢文件。`git add A B` 里有一个路径不存在则整条失败。每次提交后 `git show --stat` + `git status --porcelain` 双向核对。

**3.4 `merge-parts` 只看 `firstBlock` 连续性，不看文件名。** 完全嵌套的孤儿分片会被**静默跳过**（`[merged] N blocks` 却漏块）→ merge 前用 `coverage.mjs <slug>` 看缺口区间，确认旧片区间被新片完全包含后再删。

**3.5 子代理自报不可信，收尾必须实跑。** R4-R8 实测：子代理报「ok」但父代理重跑 `crit`（R5 两片）、自报「临时件已删」而 `build/` 留下 40+ 个文件（R8）、自报「逐块核对无差异」而实际整片错位（R8 四片，见 3.7）。

**3.6 `author` 源数据缺陷。** `meta-scan` 只报命中行，判据是「author 值等于某块首正文」。`043mengyouji` 的 `author=憨山老人自赞` 属此类，**R11 派发前先删**（改 `src/content/articles/043mengyouji.json`，不是改 en）。`187hanshandashinianpushu`、`025taishanggy-yw` 已分别于 R5/R8 删掉。`262` 的 `author=御 制` 是**真作者**（未被报出），**不要删**（R8 已按源写入 meta）。

**3.7 〔最重〕缺陷类 E：分片内部块级错位 / 占位符 / 内容缺失，`verify-slices` 与 `validate-en` 都查不出。**
R8/R9 实测的三种形态：
- **漂移**：英文块系统性对应到相邻源块（025 `p10` abs 976 装的是 975 的内容；205 `p1/p2/p4` 整片漂移，且源里 `h3` 标题落到英文的普通段落块位上），片尾若干块内容缺失。
- **占位符**：205 `p1` 出现 9 个块的英文是字面 `"undefined"`（结构 1:1，`verify-slices` 报 `ok(big)`）。
- **空块**：205 `p5` 的 4 个 `h3` 章节题空了（源有中文标题），`verify-slices` 同样 `ok(big)`。
**根因**：代理「按句/分块翻译再拼接」时边界漂移，且几乎必然自报「逐块核对无差异」。R9 实测 16 片里 **4 片**（205 p1/p2/p4/p5）有此缺陷。
**收尾必跑**（R10 起每轮，顺序即判据强弱）：
```bash
node scripts/coverage.mjs <slug>                                 # 1) uncovered=0 且 bad=0 才能 merge（R9 靠它发现漏派一片）
node build/audit-slices-runtime.mjs <slug> p6 p7 p8 ...          # 2) 结构+重复+长度比一键审
node build/audit-slices-runtime.mjs <slug> p6 --dump=6144        # 3) 打印指定 abs 附近的 ZH-EN 逐块对照
node build/recover-r9-scan.mjs <slug>                            # 4) 占位符/空块扫描（"undefined"/空翻译）
```
判据：**逐块长度比**离群最灵敏（`EN/ZH` 超出同片中位数 2.5×/0.4×）；其次内容级重复、署名锚点（源 `X曰/X云` → 英文应以该人名开头）。
**已确认的合法误报（别返工）**：源文自身重复（025 序文）、叠句（025 `孝悌歌`）、逐月罗列（025 `On the first day of the…`）、佛经定型句与偈颂重出（262 `尔时大慧菩萨摩诃萨复白佛言…`、`云何象马兽？` 与 `象马兽何因？`）。审计脚本已剥离词级公共前缀，`nearDup` 只作 INFO；**任何报警都要回去对照 ZH 块**。
**R9 的处置**：205 p2/p4 用 §3.8 的 JSONL 重译一次修好（锚点 0 不符、长度比 0 离群）；p5 仅 4 个 h3 标题，用一次极小任务取译文后按**源形态**补回（源是 `t=h3` + `text`，不要写成 `inline: []`）；p1 因两个代理**并发写同一文件**反复闪回错位版本，最终 `interrupt_agent` 停掉原代理、用重译 JSONL 组装（含一个 4×8 表格块，单元格按源 `rows` 结构回填）。**教训：同一分片绝不允许两个代理同时写**（§3.10）。


**3.8 重译/补片一律用「编号源 + JSONL 逐块回传 + 父代理确定性组装」。**
R8/R9 用此法修好 7 片，做法固定：
1. 父代理把源转成「每行一块」的编号文本：`<n>\t<该块源文>`（`build/recover-r9-mksrc.mjs <slug.pN> <out.txt>`）；
2. 提示词要求子代理只输出 `build/<part>-out.jsonl`：每行 `{"n":<0..N-1>,"src8":"<源块正文前 8 字>","en":"<英文>"}`，`n` 不重不漏；
3. 父代理组装：`node build/recover-r9-assemble.mjs <slug.pN> <jsonl> --anchors` —— **结构（`t`/片段数/href）一律取自源**，`src8` 逐行与源比对，缺失/重复/越界/片段数不符直接**抛错拒收**；
4. 局部补片（只重做某段）：要求回抄 `src8` 作锚点，父代理逐行校验后才覆盖，**合并时 tail 优先**，否则修好的块会被旧块覆盖。
**坑（R9 实测）**：① 表格块（`t=table`）的 JSONL 用 `\n` 分格、列组间空行，组装时要按源 `rows` 结构回填、并**跳过空行**（`recover-r9-assemble-p1.mjs` 是可用范例）；② `src8` 对表格/标题块可能边界差 1 字，校验时允许「前缀相等且长度差 ≤1」；③ `meta=yes` 的片，JSONL 只含正文，**meta 三字段要父代理补**——直接抄中文源会触发 CJK crit，取 `src/content/catalog-en.json` 里该 slug 的既有 `title`/`author`/`excerpt`（R9 `205jgj-jiangyi.p1` 即如此）。

**3.9 显示层注意事项（非缺陷，记明不返工）。** 偈颂/标题编号在不同分片可能用不同续写基准（R6）；`190` 是五种原译本合刊、各卷 h2 措辞本就不同（R7）；262 的偈颂偶句会被切片边界切开（`p15` 末块「三世悉无有，常无常亦无；」+ `p16` 首块「作业及果报，皆如梦中事。」），两片各译各的半句即正确；片段接头空格（RESUME §5.7，253 篇）**先定策略再动手**，翻译轮里不碰。

**3.10 同一分片绝不允许两个代理同时写（R9 实测严重）。** R9 的 205 `p1`/`p2` 各有两个代理（原派发 + 补派重译）同时写同一 `src/content/en/*.json`，结果是两套译文互相覆盖：`p1` 反复闪回错位版本（含 `"undefined"`），`p2` 出现「前半段一套译法、后半段另一套标号（(C)/(D) vs (K)/(L)/(R)）」的混合体。**处置**：确定重译后立刻 `interrupt_agent` 停掉原代理，并只以「JSONL + 父代理组装」的产物为准。


## 4. 收尾固定四步（顺序不可换）

```bash
node scripts/verify-slices.mjs <本轮全部分片>       # 必须全部 ok / ok(big)
node scripts/coverage.mjs <本轮要 merge 的 slug>    # uncovered_blocks=0 且 bad=0（R9 靠它发现漏派一片）
node build/audit-slices-runtime.mjs <slug> <pN...>  # 缺陷类 E 判据（§3.7），必须 all clean
node build/recover-r9-scan.mjs <slug>               # 占位符/空块扫描，必须 clean
git add <本轮全部分片> && git commit -m "EN: B round N shards - <slugs>"
node scripts/merge-parts.mjs <本轮 100% 覆盖的 slug>
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en
git commit -m "EN: B round N - merge <slug>(blocks)"
git show --stat --oneline HEAD ; git status --porcelain
```
不要 push。有子代理在飞时只 `merge-parts <slug>`（指定与在飞无关的篇），**不要**跑无参数版本。

## 5. 派发提示词（照抄替换变量）

```
读 scripts/DISPATCH.md 与 scripts/TRANSLATION-BRIEF.md。源 build/slices/<part>.src.json
 -> 输出 src/content/en/<part>.json。firstBlock=<n> blocks=<m> meta=<yes/no>。
 片段边界要自带空格（InlineSegs 无分隔符拼接）。写完自跑
 node scripts/verify-slices.mjs <part>.json 并迭代到 ok 为止。不要碰其它文件、不要跑 git。
```
每条再追加下面**防漂移三行**（R9 实测：不加时 4/16 片出缺陷类 E）：
```
 逐块 1:1：只按源 blocks[i] 的顺序译，不许合并或拆分块；h2/h3/quote/table/空块按原类型原位置保留。
 报告里必须写：第 0 块与最后一块的「源文前 8 字 → 你的英文开头 40 字符」，供父代理抽验。
 禁止为「片段边界空格」自建审计脚本；临时件只许放 build/ 并自删，禁止写 scripts/。
```
**风险提示**：若某片 `verify-slices` 首轮就报 `blocks N!=M`、大批 `t` 不符、或 `coverage.mjs` 有缺口 → 就是缺陷类 E（§3.7），**不要打补丁**，直接按 §3.8 用编号源 + JSONL 重译。
**更稳的做法（R10-R12 推荐直接采用，尤其 ≥100 块的片）**：派发时就要求子代理产出 `build/<part>-out.jsonl`（每行 `{"n":<序号>,"src8":"<源块前 8 字>","en":"<英文>"}`），由父代理用 `node build/recover-r9-assemble.mjs <slug.pN> <jsonl> --anchors` 落成 `src/content/en/<part>.json`；结构取自源文件、`src8` 锚点逐行校验，**错位在构造上不可能发生**。R9 实测该流程 4 片一次通过、0 返工。



## 6. 时间台账（每轮会话末回填本表）

计时口径：从本轮第一个子代理派发到本轮整篇提交完成。

| 轮 | 日期 | 任务 | 完成篇 | 单轮耗时 | 累计篇 | 剩余篇 |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | 2026-09-12 | 9 | `047shengmingdcj` | ~35 min | 1 | 16 |
| R2 | 2026-09-12 | 16 | `293jgj-zhu`, `246henghedashouyin` | ~60 min（含返工） | 3 | 14 |
| R3 | 2026-09-12 | 12 | `102lfsx`, `403chanjing` | ~85 min（含 102 长线） | 5 | 12 |
| R4 | 2026-09-12 | 14 | `001juezhichan`, `001jznf` | ~13 min | 7 | 10 |
| R5 | 2026-09-12 | 16 | `187…pushu`, `016xdwsjwl` | 43 min（含 20 min href 返工） | 9 | 8 |
| R6 | 2026-09-12 | 18 | `239…jiaohuibenzhu-zhu`, `239…huiyi` | 19 min | 11 | 6 |
| R7 | 2026-09-12 | 20 | `190wuliangshoujingwuyiben`, `301jgj` | 22 min | 13 | 4 |
| **R8** | 2026-09-12 | 20 | `025taishanggy-yw`（262 前 7 片未 merge） | **34 min**（含 4 片缺陷类 E 重译；纯翻译口径 ≈22 min） | 14 | 3 |
| **R9** | 2026-09-12 | 16 | `262dachengrulengqiejing`（整篇 2442 块） | **41 min**（13:20:05 首批派发 → 13:59:46 整篇提交 `2b02183`；含返工：205 `p2/p4` JSONL 重译、`p5` 4 个 h3 补译、`p1` 并发写冲突后重组装、262 `p15` 漏派补跑） | 16 | 2 |
| R10 | — | 13 | 205 余 13 片 | 预测 ~18 min | 17 | 1 |
| R11 | — | 19 | 043 前 19 片（半篇） | 预测 ~26 min | 17 | 1 |
| R12 | — | 19 | 043 后 19 片 | 预测 ~26 min | 18 | 0 |

**实测均值（R9 实测重算）**：全口径 9 轮 = 315 min / **35.0 min/轮**（被 R2 返工、R3 长线、R5 href 返工、R8/R9 缺陷类 E 返工拉高）；
**剔除含返工/长线的 R2/R3/R5/R8/R9** = (35+13+16+19+22)/5 = **21.0 min/轮**（正常期望值，与 R8 时重算一致）；
按任务数：剔返工轮后 (9+14+16+18+20)=77 任务 / 105 min = **1.37 min/任务**；
**最近五轮 R5/R6/R7/R8/R9**（结构最接近剩余轮次，含各轮返工）：(16+18+20+20+16)=90 任务 / (43+19+22+34+41)=159 min = **1.77 min/任务**。
**三行结论（R9 实测重算）**：剩余 **2 篇**（205/043）；剩余 **3 轮**（R10-R12）；**预计总时长 ≈63-70 min（约 1.1 h）**（51 任务；按最近五轮 1.33-1.4 min/任务；若按正常轮次均值 21.0 min/轮 × 3 = 63 min）；
⚠ 若再出现 R8/R9 式缺陷类 E 返工，按 40 min/轮 × 3 = **120 min（2 h）** 计。

## 7. 清理与保留

- R9 会话末删了本轮 61 个脚手架（≈2.2MB）：205 p1 代理遗留的 `mk-skeleton-p1.mjs`/`p1-part*.json`/`SKEL-p1.json`/`_tmp_*.cjs`/`fix-block89.mjs` 等、本轮生成的全部编号源与 JSONL（`r9-*`），以及 `build/` 下其它一次性诊断脚本。清理后 **build/ 261 文件 / 7.7MB**（含 262 的 25 个已 merge 源与 205 的 5 个已 merge 源）。
- **保留**：`build/audit-slices-runtime.mjs`（§3.7 判据入口）、`build/slices/262….p*.src.json`（262 已 merge，可随时删）、`build/slices/205….p1-p5.src.json`（已 merge，可删）。
- R10 要跑 `gap-prep` 生成 205 的 13 个源；R11 生成 043 的 19 个源（**先删源 `author`**）。**对应分片 merge 后即可删该片源**。
- 本轮把可复用的三个脚本留在了 `build/`（`recover-r9-mksrc.mjs`、`recover-r9-assemble.mjs`、`recover-r9-scan.mjs`）——**文档里引用的就是它们**；若下轮会话开头发现不存在，用 §3.8 的三步重建即可（各约 30 行）。
- 诊断脚本一律写 `build/` 前缀 `recover-*`/`audit-*`，会话末清理；**不要再累积历史**。

**R9 收尾后提交**（不含 push）：`4a3e15d`(r9 分片 15 片) `778f811`(262 p15 补跑) `2b02183`(262 整篇 2442 块) + 本台账提交。

