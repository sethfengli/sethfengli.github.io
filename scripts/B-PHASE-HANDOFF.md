# B 期交接（精简版）

> 启动/收尾流程照 `scripts/RESUME.md`；本文件只保留**后续轮次用得上的**实测事实。
> **每轮派发前必跑**：`node scripts/task-plan.mjs 120`（唯一权威队列）与 `node scripts/coverage.mjs <slug>`。
> 更新时间：2026-09-12（R10-R12 收尾后，**B 期全部完成**）。工作区干净、全部已提交、**未 push**。

## 1. 当前状态

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=274 crit=3 warn=11 parts=6**（043 的 `missing` crit 已消除，只剩非 B 期 3 项） |
| `scan-mojibake` | 0 / 306 |
| 已完成 | **18 篇 / B 期全部完成**（A 期 11 + B 期 R1-R12，末两篇 `205jgj-jiangyi`、`043mengyouji`） |
| 剩余 | **0 篇 / 0 未覆盖块 / 0 任务 / 0 被挡** |
| crit 3 项（**非 B 期，勿顺手改**） | `068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing`（±1 错位） |
| R9 提交 | `4a3e15d`(262 x10 + 205 x5) `778f811`(262 p15 补跑) `2b02183`(262 整篇 2442 块) |
| R10 提交 | `62ff13e`(205 p6-p18 13 片 1528 块) `0c9d46f`(205 整篇 2224 块) |
| R11/R12 提交 | `74da528`(043 p1-p19 半篇，无 merge) `debed21`(043 p20-p38) `6d34fc3`(删 043 源 author) `5598042`(043 整篇 4480 块) |


## 2. 编组执行记录（R10-R12，全部完成）

| 轮 | 编组 | 任务 | 产出 |
| --- | --- | --- | --- |
| R10 | 205 `600-2127`（13 片 `p6-p18`） | 13 | **整篇 merge（205，2224 块）** |
| R11 | 043 `0-2279`（19 片 `p1-p19`） | 19 | 半篇，**无 merge**（已删源 `author`，提交 `6d34fc3`） |
| R12 | 043 `2280-4479`（19 片 `p20-p38`） | 19 | **整篇 merge（043，4480 块）** |

R10 明细：`p6`(600) `p7`(720) `p8`(840) `p9`(960) `p10`(1080) `p11`(1200) `p12`(1320) `p13`(1440) `p14`(1560) `p15`(1680) `p16`(1800) `p17`(1920) `p18`(2040-2127, 88 块)，全部 `meta=no`。
R11/R12 明细：043 的 38 片（`p1`=`meta=yes`，`p38` 仅 40 块）由 `gap-prep` 顺序生成；**每片 `firstBlock` 见 `build/slices/043mengyouji.pN.src.json`**。
⚠ B 期已收尾：`build/slices/` 与 `build/*.src.txt` / `*-out.jsonl` 已在下节清理中删除；**若还要复跑某片，先 `node scripts/gap-prep.mjs "<slug>:<a>-<b>"` 重新生成源**。

### ⚠ R10-R12 定式：一律走 §3.8 的 JSONL + src8 锚点流程（父代理组装）
R10 13 片一次通过；R11/R12 共 38 片全量走此法，**错位（类型/块数/片段/href）零发生**，缺陷只剩「块内截断」与「源数据坏文本」两类（见 §3.11-§3.13）。派发时要求子代理只写 `build/<part>-out.jsonl`（每行 `{"n","src8","en"}`），父代理用：
```bash
node build/mksrc.mjs <slug.pN>                      # 生成编号源 build/<slug.pN>.src.txt
node build/recover-r9-dispatch.mjs <slug.pN>        # 打印首/末块 src8 供子代理对照
node build/recover-r9-assemble.mjs <slug.pN> build/<slug.pN>-out.jsonl [--anchors]
```
- ⚠ 锚点校验失败会**拒收且不写文件**。若只是某一块返工后 `src8` 过期（内容已对），先把该行 `src8` 对齐源文再重跑组装器（R10 `p6` n=24 即如此）。
- ⚠ 043 的多片段块很多（`p1` 就有 10 个）：JSONL 只给**整块单一英文**，组装时把整段放进第一个无 `href` 的片段、其余片段置空（`InlineSegs` 无分隔符拼接，渲染等价），片段数与 href 全部保留。
- `meta=yes` 的片（043 `p1`）组装器自动从 `src/content/catalog-en.json`（**对象按 slug 索引**）取既有 `title/author/excerpt`。


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
1. 父代理把源转成「每行一块」的编号文本：`<n>\t<该块源文>`（**R10 起用 `node build/mksrc.mjs <slug.pN>`**，默认输出 `build/<slug.pN>.src.txt`，非 `p` 块带 `[t=..]`/`[segs=N]`/`[HREF]` 标记）；
2. 提示词要求子代理只输出 `build/<part>-out.jsonl`：每行 `{"n":<0..N-1>,"src8":"<源块正文前 8 字>","en":"<英文>"}`，`n` 不重不漏；
3. 父代理组装：`node build/recover-r9-assemble.mjs <slug.pN> <jsonl> --anchors` —— **结构（`t`/片段数/href）一律取自源**，`src8` 逐行与源比对，缺失/重复/越界/片段数不符直接**抛错拒收**；
4. 局部补片（只重做某段）：要求回抄 `src8` 作锚点，父代理逐行校验后才覆盖，**合并时 tail 优先**，否则修好的块会被旧块覆盖。
**坑（R9 实测）**：① 表格块（`t=table`）的 JSONL 用 `\n` 分格、列组间空行，组装时要按源 `rows` 结构回填、并**跳过空行**（`recover-r9-assemble-p1.mjs` 是可用范例）；② `src8` 对表格/标题块可能边界差 1 字，校验时允许「前缀相等且长度差 ≤1」；③ `meta=yes` 的片，JSONL 只含正文，**meta 三字段要父代理补**——直接抄中文源会触发 CJK crit，取 `src/content/catalog-en.json` 里该 slug 的既有 `title`/`author`/`excerpt`（R9 `205jgj-jiangyi.p1` 即如此）。

**3.9 显示层注意事项（非缺陷，记明不返工）。** 偈颂/标题编号在不同分片可能用不同续写基准（R6）；`190` 是五种原译本合刊、各卷 h2 措辞本就不同（R7）；262 的偈颂偶句会被切片边界切开（`p15` 末块「三世悉无有，常无常亦无；」+ `p16` 首块「作业及果报，皆如梦中事。」），两片各译各的半句即正确；片段接头空格（RESUME §5.7，253 篇）**先定策略再动手**，翻译轮里不碰。

**3.10 同一分片绝不允许两个代理同时写（R9 实测严重）。** R9 的 205 `p1`/`p2` 各有两个代理（原派发 + 补派重译）同时写同一 `src/content/en/*.json`，结果是两套译文互相覆盖：`p1` 反复闪回错位版本（含 `"undefined"`），`p2` 出现「前半段一套译法、后半段另一套标号（(C)/(D) vs (K)/(L)/(R)）」的混合体。**处置**：确定重译后立刻 `interrupt_agent` 停掉原代理，并只以「JSONL + 父代理组装」的产物为准。

**3.11 R10 实测：走 §3.8 后，唯一还会漏的缺陷是「块内截断」。** 13 片 1528 块里只有 205 `p6` 一块（abs 624，源 414 字）英文只译了开头 182 字符就停笔（"…unmoving and such."），结构完全对、`verify-slices`/`cjk`/`emptyEN`/`src8` 全部看不出，**只有逐块长度比离群（r=0.44，同片中位 5.55）能抓**。
处置：只重译该块（§3.8 局部补片），把该行 `en` 换掉、`src8` 对齐源文后重跑组装器。**收尾判据以 `audit-slices-runtime` 的 `ratioOut` 为准，`nearDup` 只作 INFO。**

**3.12 长度比离群 ≠ 缺陷的唯一判据，报出后必须回看 ZH 块。** R10 的 p6 与 043 `p8` 同一判据一个真一个假：前者源文完好而英文缺失（真缺陷，见 §3.11），后者源文本身是坏文本、英文含必要的损坏说明（合法误报）。
**已知合法误报（别返工）**：043 `p14` 的 `nearDup=45` 是「赞/铭」类短标题大量同形，不构成缺陷（同片 `dup=0`，即无「英文同形而中文不同」的块）。

**3.13 R11/R12 实测三种新坑（都靠长度比抓出）**：
1. **源文重叠残迹**：043 `p29` 的源行 102/103/104 = 同一首组诗被 OCR 切成 2/4/8 章，且 103 的末 2 章在 104 开头**原样重复**。**正确做法是按源块自身的章句边界切开英文（重复照译，忠于源）**，不要为了「不重复」把整首诗塞进第一块——那会让 102 的 `EN/ZH` 冲到 49×。R12 实测按边界重装后 `ratioOut=0`。
2. **坏文本说明要够长**：043 `p8` abs 890（867 字源文，约 600 字可读 + 300 字 GBK→UTF-8 坏字节）的英文若只给一句「此段损坏」的短注，`r=1.19` 会低于同片中位 ×0.4（2.43）而被判离群。**处置：把可辨内容用较详的英文概述写足**（R12 把它写到 2716 字符，`r≈3.13`，`ratioOut=0`）——既忠于原文的体量，也让判据保持灵敏。
3. **`audit` 必须在最终组装之后跑**：043 `p29` 曾因「先组装、后译者又改了 JSONL」而报出过期快照的假离群（组装件 2376 字符 vs 新 JSONL 348 字符）。**任一 JSONL 改动后必须重跑 `recover-r9-assemble.mjs`，再跑 `audit-slices-runtime`。**
**另一条流程坑**：子代理可能在**只写了部分块**时就正常结束回合（R12 `p27` 只写了 n=0..15）。父代理**必须逐块核对 `n` 覆盖**（`lines/min/max/uniq` 不够，要查 missing 集合），缺块时让它续写**新文件**（`<part>-tail.jsonl`/`-tail2.jsonl`，避免与已交付文件并发写），父代理按 `n` 合并去重后再组装。



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
| R10 | 2026-09-12 | 13 | `205jgj-jiangyi`（整篇 2224 块） | **20 min**（14:08:01 首批派发 → 14:20:16 整篇提交 `0c9d46f`；含 1 处块内截断返工：`p6` n=24 局部补译） | 17 | 1 |
| R11 | 2026-09-12 | 19 | 043 前 19 片（半篇，无 merge） | **~37 min**（14:12 首批派发 → 14:48:49 分片提交 `74da528`；两波 8+11；含 `p27` 被截成 16 行后拆 tail/tail2 补跑） | 17 | 1 |
| R12 | 2026-09-12 | 19 | `043mengyouji`（整篇 4480 块） | **~33 min**（14:16 首批派发 → 14:49:07 整篇提交 `5598042`；含 `p37` n=106 块内截断补译、`p29` 过期快照重装、`p8` 坏段说明扩写） | 18 | 0 |

**R10-R12 三轮合计**：51 任务 / **~60 min**（一次会话内并发跑完；R11 与 R12 交错派发，故单轮耗时含重叠）。

**实测均值（R12 实测重算，B 期收尾版）**：全口径 12 轮 = 395 min / **32.9 min/轮**（被 R2 返工、R3 长线、R5 href 返工、R8/R9 缺陷类 E 返工拉高）；
**剔除含返工/长线的 R2/R3/R5/R8/R9** = (35+13+16+19+22+20+37+33)/8 = **24.4 min/轮**；
按任务数：剔返工轮 (9+14+16+18+20+13+19+19)=128 任务 / 195 min = **1.52 min/任务**；
**最近五轮 R8/R9/R10/R11/R12**（含各轮返工）：(20+16+13+19+19)=87 任务 / (34+41+20+37+33)=165 min = **1.90 min/任务**（单任务耗时被 R8/R9/R11 的重译与补跑拉高）。
**三行结论（R12 实测重算，B 期收尾）**：剩余 **0 篇**（B 期 18 篇全部 merge）；剩余 **0 轮**；**B 期总时长实测 395 min ≈ 6.6 h**（24,491 块 / 205 任务的预估为 4-6 h，实际落在区间上沿，主因是 R8/R9 缺陷类 E 重译与 R11 的截断补跑）。
⚠ **R8-R12 五轮共同教训**：`verify-slices` + `coverage` 全绿**不等于**译完——块内截断、占位符、空块只有 `audit-slices-runtime` 的**逐块长度比**能抓（R10 `p6`、R12 `p37` 各 1 处），且 `coverage.mjs` 只看分片区间、不看整篇内容。**每轮 merge 前必须三步全跑**（§4）。

## 7. 清理与保留

- **可复用脚本（文档引用的就是它们，会话开头若不存在就按 §3.8 重建，各约 30-60 行）**：
  - `build/mksrc.mjs` → 编号源 `build/<part>.src.txt`（**R10 起用它生成锚点清单**）；
  - `build/recover-r9-dispatch.mjs <part...>` → 打印首/末块 `src8` 与 `multiSeg/table` 计数（派发前给子代理核对锚点）；
  - `build/recover-r9-assemble.mjs <part> <out.jsonl> [--parts=p1,p2] [--anchors]` → 按源结构确定性落成 `src/content/en/<part>.json`（锚点/块数/片段数/href/CJK/空译/占位符全部校验，失败**拒收且不留文件**）；
  - `build/recover-r9-scan.mjs <slug> [pN...]` → 占位符/空块/无字母块扫描；
  - `build/audit-slices-runtime.mjs <slug> <pN...> [--dump=abs]` → §3.7 判据入口（长度比离群 + 重复 + 结构）。
- **R10 会话末清理**：删除本轮全部 `205*-out.jsonl`、`205*.src.txt`、`build/slices/205*.src.json`（已 merge），以及子代理遗留的 `_tmp_*`/`_p*`/`tmp-*` 脚手架；`build/` 前缀只保留 `recover-*`/`audit-*` 与 `mksrc.mjs`。
- **R10-R12 会话末清理（实测）**：删除本轮全部 `205*-out.jsonl`/`205*.src.txt`/`205*.p*.src.json`、`043mengyouji.*-out.jsonl`/`.src.txt`/`build/slices/043mengyouji.p*.src.json`（均已 merge），以及子代理遗留的 `_*`/`tmp*`/`p*-*.mjs` 脚手架。**清理后 `build/` = 260 文件 / 7.36 MB**（余量为前几轮 A/B 期已 merge 的 `build/slices/*.src.json`；`build/` 在 `.gitignore` 第 11 行，不进版本库）。
- **保留**：`mksrc.mjs`、`audit-slices-runtime.mjs`、`recover-r9-dispatch.mjs`、`recover-r9-assemble.mjs`、`recover-r9-scan.mjs`（§7 第 1 条）。**B 期已全部 merge，若要复跑任一篇，先 `gap-prep` 重新生成源。**
- 诊断脚本一律写 `build/` 前缀 `recover-*`/`audit-*`，会话末清理；**不要再累积历史**。

**R9 收尾后提交**（不含 push）：`4a3e15d`(r9 分片 15 片) `778f811`(262 p15 补跑) `2b02183`(262 整篇 2442 块) + 本台账提交。
**R10 收尾后提交**（不含 push）：`62ff13e`(205 p6-p18 13 片 1528 块) `0c9d46f`(205 整篇 2224 块) + 本台账提交。
**R11/R12 收尾后提交**（不含 push）：`74da528`(043 p1-p19 半篇) `debed21`(043 p20-p38) `6d34fc3`(删 043 源 author) `5598042`(043 整篇 4480 块) + 本台账提交。
**B 期总计**：A 期 11 篇 + B 期 12 轮 18 篇 = **29 篇**；`validate-en` crit 仅剩 3 项非 B 期遗留（`068xiangxujs`、`101yebunengxi`、`303liuzutanjing`），见 §1。

