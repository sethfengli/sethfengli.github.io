# B 期交接（精简版）

> 启动/收尾流程照 `scripts/RESUME.md`；本文件只保留**后续轮次用得上的**实测事实。
> **每轮派发前必跑**：`node scripts/task-plan.mjs 120`（唯一权威队列）与 `node scripts/coverage.mjs <slug>`。
> 更新时间：2026-09-12（R8 收尾后）。工作区干净、全部已提交、**未 push**。

## 1. 当前状态

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=271 crit=4 warn=11 parts=8** |
| `scan-mojibake` | 0 / 309 |
| 已完成 | **15 篇**（A 期 11 + B 期 R1-R8：`047shengmingdcj` `293jgj-zhu` `246henghedashouyin` `102lfsx` `403chanjing` `001juezhichan` `001jznf` `187hanshandashinianpushu` `016xdwsjwl` `239…jiaohuibenzhu-zhu` `239…huiyi` `190wuliangshoujingwuyiben` `301jgj` **`025taishanggy-yw`**） |
| 剩余 | **3 篇 / 7,919 未覆盖块 / 67 任务 / 0 被挡**（`043=38`、`205=18`、`262=11`） |
| crit 4 项（**非 B 期，勿顺手改**） | `043mengyouji:missing`、`068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing`（±1 错位） |
| R8 提交 | `6639b67`(分片 20) `4e27574`(025 整篇 1627 块) `76490ec`(台账) |

## 2. 后续轮次编组（R9-R12）

| 轮 | 编组 | 任务 | 产出 |
| --- | --- | --- | --- |
| R9 | 262 `840-2150`（11 片）+ 205 `0-599`（前 5 片） | 16 | **1 篇 merge（262）** |
| R10 | 205 `600-2127`（余 13 片） | 13 | 1 篇 merge（205） |
| R11 | 043 `0-2279`（19 片） | 19 | 半篇，**无 merge**；**先删 043 源 `author`** |
| R12 | 043 `2280-4479`（19 片） | 19 | 1 篇 merge（043） |

**任务区间就是 120 块网格**（`task-plan.mjs 120` 输出即派发区间），R9 明细：
- 205：`0-119`(meta=yes) `120-239` `240-359` `360-479` `480-599`；已有分片 `p43/p44/p45`；缺口 `0-2127`
- 262：`840-959` `960-1079` `1080-1199` `1200-1319` `1320-1439` `1440-1559` `1560-1679` `1680-1799` `1800-1919` `1920-2039` `2040-2150`；已有分片 `p13/p14`（`2151-2441`）与 R8 交付的 `p21-p27`（`0-839`）

### ⚠ R9 的源：262 **直接用现成源**，205 **必须跑 `gap-prep`**

| 篇 | 现成源 | 操作 |
| --- | --- | --- |
| 262 | `build/slices/262….p8..p12.src.json` = `840-1439`、`262….p15..p20.src.json` = `1440-2150`（R7 遗留，区间正确） | **不要跑 `gap-prep`**，直接派发；输出写 `src/content/en/262….p8..p12.json`、`…p15..p20.json` |
| 205 | **无任何 `.src.json`** | 顺序跑 `node scripts/gap-prep.mjs "205jgj-jiangyi:0-119"` / `":120-239"` / `":240-359"` / `":360-479"` / `":480-599"` |
| 043 | 无（R11 再生成） | 先删源 `author` 再 `gap-prep`，19 次顺序调用（`0-119` … `2160-2279`） |

`gap-prep` 一次调用只按「一个 `a-b` 区间」产出一个 src（不传区间只取第一个缺口），同篇多区间**必须顺序多次调用**；它会 reserve 已占用的 `pN`，顺序调用即自动跳过。片号与 `en/` 文件名**不必**对应网格（merge 只按 `firstBlock` 排序），照源里的 `firstBlock` 写死提示词即可。**一个 `pN.json` 只派一个代理**。

`205` 的 `meta`：只有 `0-119` 那片 `meta=yes`（写 `title`/`excerpt`，源里有 `zhAuthor` 才写 `author`）；其余片 `meta=no`。`043`：`0-119` 那片 `meta=yes`，**但必须先删源 `author`**（见 §3.6）。

## 3. 必须遵守的坑（只留后续还会踩的）

**3.1 `slice-plan.mjs` 与 `plan-slices.mjs` 同名互覆。** `slice-plan.mjs` 是**生成器**（会覆盖 `slice-plan.json`）；日常要跑的是审计器 `node scripts/plan-slices.mjs`（应输出「0 篇有缺口 / 一致性问题 0 条」）。误跑生成器会把审计器覆盖掉，需 `git checkout -- scripts/plan-slices.mjs`。

**3.2 取回历史分片只能用 `Set-Content -Encoding utf8` + Node 去 BOM。** `git show <sha>:<path> > file` 在 PowerShell 里写 UTF-16，产出的 JSON 非法。

**3.3 分片必须「单独先提交一次」再 merge。** 本仓库 `git add` + 立即 commit 曾出现「blob 未落盘」；`merge-parts` **会删掉**它合并的分片，顺序错就永久丢文件。`git add A B` 里有一个路径不存在则整条失败。每次提交后 `git show --stat` + `git status --porcelain` 双向核对。

**3.4 `merge-parts` 只看 `firstBlock` 连续性，不看文件名。** 完全嵌套的孤儿分片会被**静默跳过**（`[merged] N blocks` 却漏块）→ merge 前用 `coverage.mjs <slug>` 看缺口区间，确认旧片区间被新片完全包含后再删。

**3.5 子代理自报不可信，收尾必须实跑。** R4-R8 实测：子代理报「ok」但父代理重跑 `crit`（R5 两片）、自报「临时件已删」而 `build/` 留下 40+ 个文件（R8）、自报「逐块核对无差异」而实际整片错位（R8 四片，见 3.7）。

**3.6 `author` 源数据缺陷。** `meta-scan` 只报命中行，判据是「author 值等于某块首正文」。`043mengyouji` 的 `author=憨山老人自赞` 属此类，**R11 派发前先删**（改 `src/content/articles/043mengyouji.json`，不是改 en）。`187hanshandashinianpushu`、`025taishanggy-yw` 已分别于 R5/R8 删掉。`262` 的 `author=御 制` 是**真作者**（未被报出），**不要删**（R8 已按源写入 meta）。

**3.7 〔最重〕缺陷类 E：分片内部块级错位 + 尾部丢失，所有既有校验都查不出。**
R8 实测：英文块系统性对应到**相邻**源块（如 025 `p10` 的 abs 976 装的是 abs 975 的内容、abs 993 装的是 abs 992 的内容），且片尾若干块内容缺失；`verify-slices`/`validate-en` 在**块数与片段数不变时全绿**。
**根因**：代理「按句/分块翻译再拼接」时边界漂移，且不报错。
**收尾必跑**（R9 起每轮）：
```bash
node build/audit-slices-runtime.mjs <slug> p8 p9 p10 ...        # 结构+重复+长度比一键审
node build/audit-slices-runtime.mjs <slug> p8 --dump=840        # 打印指定 abs 附近的 ZH-EN 逐块对照
```
判据：**逐块长度比**离群最灵敏（`EN/ZH` 超出同片中位数 2.5×/0.4×）；其次内容级重复与署名锚点（源 `X曰/X云` → 英文应以该人名开头）。
**已确认的合法误报（别返工）**：源文自身重复（025 序文）、叠句（025 `孝悌歌`「子养亲兮弟敬哥」）、逐月罗列（025 `On the first day of the…`）、佛经定型句与偈颂重出（262 `尔时大慧菩萨摩诃萨复白佛言…` / `Then Mahāmati…`、`云何象马兽？` 与 `象马兽何因？`）。审计脚本已剥离词级公共前缀，`nearDup` 只作 INFO；**任何报警都要回去对照 ZH 块**。

**3.8 重译/补片一律用「编号源 + JSONL 逐块回传 + 父代理确定性组装」。** R8 用此法一次修好 4 片：父代理把源转成「每行一块」的编号文本；子代理只输出 `build/<part>-out.jsonl`，每行 `{"n":<0..N-1>,"s":"<英文>"}`；父代理按源结构组装（`t`/片段数/href 一律取自源，`n` 缺失/重复/越界直接拒收）。局部补片要求子代理额外回抄 `src8`（源块前 8 字）作为锚点，父代理逐行与源比对后才覆盖。**合并 base+tail 时必须 tail 优先**，否则修好的块会被旧块覆盖。

**3.9 显示层注意事项（非缺陷，记明不返工）。** 偈颂/标题编号在不同分片可能用不同续写基准（R6）；`190` 是五种原译本合刊、各卷 h2 措辞本就不同（R7）；片段接头空格（RESUME §5.7，253 篇）**先定策略再动手**，翻译轮里不碰。

## 4. 收尾固定四步（顺序不可换）

```bash
node scripts/verify-slices.mjs <本轮全部分片>       # 必须全部 ok / ok(big)
node build/audit-slices-runtime.mjs <slug> <pN...>  # 缺陷类 E 判据（§3.7），必须 all clean
git add <本轮全部分片> && git commit -m "EN: B round N shards - <slugs>"
node scripts/merge-parts.mjs <本轮 100% 覆盖的 slug>
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en
git commit -m "EN: B round N - merge <slug>(blocks)"
git show --stat --oneline HEAD ; git status --porcelain
```
不要 push。有子代理在飞时只 `merge-parts <slug>`（指定与在飞无关的篇），**不要**跑无参数版本。

## 5. 派发提示词（6 行模板，照抄替换变量）

```
读 scripts/DISPATCH.md 与 scripts/TRANSLATION-BRIEF.md。源 build/slices/<part>.src.json
 -> 输出 src/content/en/<part>.json。firstBlock=<n> blocks=<m> meta=<yes/no>。
 片段边界要自带空格（InlineSegs 无分隔符拼接）。写完自跑
 node scripts/verify-slices.mjs <part>.json 并迭代到 ok 为止。不要碰其它文件、不要跑 git。
```
另加三条（R8 教训）：**禁止自建「片段边界空格」启发式审计脚本**；**临时件只许放 `build/` 并自删、禁止写 `scripts/`**；**逐块 1:1**（每个块的 `t` 与 inline 片段数与源逐块一致，空/纯标点片段保留为独立片段）。同一片 verify 迭代 ≥3 轮仍不过，按 DISPATCH「上下文将尽」降级交付连续块并在报告里写明完成到第 N 块。

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
| R9 | — | 16 | 262 + 205 前 5 片 | 预测 ~21 min | 15 | 2 |
| R10 | — | 13 | 205 | 预测 ~21 min | 16 | 1 |
| R11 | — | 19 | 043 前 19 片（半篇） | 预测 ~25 min | 16 | 1 |
| R12 | — | 19 | 043 后 19 片 | 预测 ~25 min | 17 | 0 |

**实测均值**：全口径 8 轮 = 284 min / **35.5 min/轮**（被 R2 返工、R3 长线、R8 重译拉高）；
**剔除含返工/长线的 R2/R3/R8** = (35+13+16+19+22)/5 = **21.0 min/轮**（正常期望值）；
按任务数：剔 R2/R3/R8 后 **1.37 min/任务**，最近四轮纯翻译口径 **1.07 min/任务**。
**三行结论（R8 实测重算）**：剩余 **3 篇**（262/205/043）；剩余 **4 轮**（R9-R12）；**预计总时长 ≈84-93 min（约 1.4-1.55 h）**，若再遇 R8 式整片重译则约 136 min（2.27 h）。

## 7. 清理与保留

- R8 会话末已把 `build/` 由 362 文件 / 9.3MB 清到 **256 文件 / 7.4MB**（删了 R8 的 20 个分片源、025 陈旧源，以及子代理遗留的 40+ 个 `p14-*`/`fix-p14-*` 脚手架）。
- **保留**：`build/audit-slices-runtime.mjs`（§3.7 判据入口）、`build/slices/262….p8-p12/p15-p20.src.json`（R9 直接用）。
  `205` 与 `043` **目前没有任何 `.src.json`**：R9 要跑 `gap-prep` 生成 205 的 5 个源，R11 要生成 043 的 19 个源（043 记得先删源 `author`）。**对应分片 merge 后即可删该片源**。
- 诊断脚本一律写 `build/` 前缀 `recover-*`/`audit-*`，会话末清理；**下轮不要再累积历史**：只保留上列可复用件。
