# 英文翻译续作指南（下星期继续）

> **★ 最新检查点（2026-09-13 · A 期收尾完成 · 本会话末）**
> - **成果：`validate-en` 由 `ok=251 crit=6 warn=11 parts=26` → `ok=257 crit=6 warn=11 parts=20`**，
>   本会话**新合并 6 篇完整英文文章**（14 个并行任务，分 2 批 × 8/6，零 crit 新增、零孤儿分片）：
>   `204ssydj`(234b) / `251zhenqiyunxingfa`(130b) / `502xiuxinjue`(271b)（批次 1）
>   + `187hanshandashinianpushu-old`(449b) / `261lengqiejing`(1050b) / `502zhenxinzhishuojingjie`(315b)（批次 2）。
>   提交：`b3e9c12`、`2afcf09`（未 push）。
> - **★ A 期队列已归零**：`task-plan.mjs 120` = **0 篇有缺口 / 0 未覆盖块 / 0 任务（可派 0、被挡 0）**。
>   `scan-mojibake` = **0/307**（乱码保持清零）。**A 期主体（≤300KB）翻译工作全部完成**，
>   剩余 890 → 0 块（本次实译 886 块，原报告 890 为估算）。
> - **修订预计时间**：A 期已无剩余翻译任务（0 分钟）。**接下来只剩周末专项**（见下「本会话新增的坑」4）：
>   303 的 ±1 错位（272 块）、068（25 块）/101（8 块）的 CJK、warn 11 项、音标统一、
>   `author` 源数据缺陷（meta-scan 21 处）、**以及本会话新发现的「片段拼接丢空格」语料级问题**。
>   预计 **周末 1 个工作段（约 2–3 小时）**可清完非 B 期项目。**B 期（>300KB）仍需单独排期 ≥6 小时。**
> - **本会话新增的坑 / 待办（务必遵守）**
>   1. **【新·最危险】`merge-parts` 会删除它合并掉的分片，所以「先合并、后提交」会永久丢失分片文件**。
>      **本会话照做**：批次 1/2 都是「先 `git add` 全部新分片 → 再 `merge-parts <slug>` → 再提交」，
>      提交里同时含「新增整篇」与「删除分片」，无丢失。这是已验证的正确顺序，照抄即可。
>   2. **【新】`p8` 分片「多 1 块」会把 `merge-parts` 卡在 100% 前一块**：实测
>      `261lengqiejing.p8` 覆盖 [919-1042]（124 块）而 `p9` 从 1042 起，**边界重叠 1 块**，
>      `merge-parts` 报 `[gap] expect block 1043, got 1042` → `[fail] merged 1043/1050`。
>      **块数看似只差 7 块，根因是重叠**。判定方法：列各分片 `firstBlock+块数` 找重复块（脚本见
>      `scripts/fix-261-boundary.mjs`）。修法：按**官方 `slice-plan` 边界**删掉重复块
>      （`p8` 该为 123 块 = [919-1041]），再 merge → `[merged] 261lengqiejing: 1050 blocks`。
>      **注意**：两个文件在重叠块上译文不同（`p8`「abides in the kind mind…feels disgust」vs
>      `p9`「dwells in loving-kindness…turns away」），**以对齐 `zh[1042]` 原文者为准**（此例是 `p9`）。
>   3. **【新】`gap-prep` 的「重复源」不是 bug，不要删**（延续上会话 #3）：本会话实测
>      `502xiuxinjue.p7/p8`、`187…-old.p12/p13`、`204ssydj.p2/p5`、`261lengqiejing.p4/p12`、
>      `502zhenxinzhishuojingjie.p2/p7` 各自 byte-identical，均为「本轮未派发的备用源」，可后续复用；
>      **派发前按 `firstBlock+块数` 去重**。
>   4. **【新·语料级发现，未修，留周末】片段边界「丢空格」是源数据属性，不是翻译缺陷**：
>      `ArticleBody.tsx` 的 `InlineSegs` 是无分隔符拼接，但**中文源本身**就把
>      `["一、无门为法门"]["二、五法三自性"]` 存成两个 inline 片段，拼接后即
>      `一、无门为法门二、五法三自性`（中文无需空格，故源数据无感）。EN 照抄结构后变成
>      `"…Is the Dharma Gate" + "2. The Five Dharmas…"` → 渲染为 `Gate2. The Five…`。
>      实测 **253/277 篇**（41584 个接头）存在此类接头，**绝大多数源自既有分片，非本会话引入**
>      （本会话 6 篇的接头经 `doubleSpace`/`orphanPunct` 检查均为 0–1 处）。
>      **修法建议**：要么在 `InlineSegs` 渲染层对「段首为字母数字而前段尾非空格」补空格（改 1 处代码），
>      要么写 `fix-joins.mjs` 逐块给 EN 段首补空格（253 篇，风险中等）。**先决定策略再动手。**
>   5. **`meta-scan` 命中的是「源文章 `author` 字段」，且必须改 `src/content/articles/*.json`**：
>      上会话记录的「已预先删除 502xiuxinjue 的 zhAuthor」**实际未落地**（源文件仍含
>      `author:"普照国师简介"`），本会话已用 `scripts/fix-502-author.mjs` 删除并重新 `gap-prep`
>      生成 head 分片（`zhAuthor` 消失、`includeMeta` 仍为 true → 只写 title/excerpt，不写 author）。
>      **纪律：派 head 分片前，先 `node -e` 读该篇 `src/content/articles/<slug>.json` 确认无 `author`。**
>   6. **子代理会踩到的两个真陷阱（本会话实测）**：
>      - `write` 工具在「字符串以弯引号 `”` 结尾」时**可能静默吞掉收尾的 JSON 双引号**，
>        产出 `Bad control character in string literal`；**读回渲染正常、肉眼看不出**。
>        子代理用字符码 diff 才定位到。**故 `verify-slices` 必须真的 `JSON.parse`（它会），不能只看渲染。**
>      - 大 `write` 可能**静默少写/多写数组元素**（两例子代理报告「我写了 57 项，回来 90 项」/「漏了第 16、17 块」）。
>        对策：**分小批写 + 每步跑 `verify-slices`**，不要最后一次性自检。
>   7. **`p8` 译文风格分叉（供周末统一时参考）**：`502zhenxinzhishuojingjie` 同篇内
>      `p5/p7/p9` 用 **ASCII 直引号**，而 `p8` 自己归一化成 **U+2019 弯引号**；`261lengqiejing`
>      同理（`p2` 直引号 vs `p10/p12` 弯引号）。本轮 `verify`/`validate` 不查引号风格，
>      但周末统一音标/标点时必须把这两篇算进 `quote-scan.mjs` 复查范围。
>
> **上一检查点（2026-09-12 · 5 轮 × 8 并行 · 历史）**
> - **成果：`validate-en` 由 `ok=242 crit=6 warn=6 parts=40` → `ok=251 crit=6 warn=11 parts=26`**，
>   即本会话**新合并 9 篇完整英文文章**（40 个并行任务，零 crit 新增、零孤儿分片）：
>   `022taishanggy-3` / `102lengqiejingxuanzhu` / `105wangfengyijiayanlu` / `204danian` /
>   `002baiyunxy` / `017jdwsswl` / `021taishanggy-2` / `023taishanggy-4` / `104ganyingp`（第 1–4 轮）
>   + 第 5 轮 `103yjy` / `171nianfoshishui` / `186hanshandashideyisheng` / `193guanwuliangshoufojingjijie` /
>   `258quanzhenqizizhuan`（共 14 篇，见下「本轮实际合并清单」）。`crit` 始终为 6，无一上升。
> - **★ 后期更新（乱码已清零，A 期全部解锁）**：`scan-mojibake` 333 文件 → **乱码 0**（原 12 文件 / 971 处），
>   新增 `scripts/fix-mojibake.mjs`（反转 CP1252 误码，写前强制校验 JSON/U+FFFD/残留，幂等）。
>   现 `task-plan.mjs 120` = **6 篇有缺口 / 890 块 / 14 任务，可派 14、被挡 0**（修复前为可派 0 / 被挡 14），
>   `validate-en` 仍为 `ok=251 crit=6 warn=11 parts=26`（零回归）。**下一步只剩纯翻译：8 并行 ≈ 2 轮 ≈ 16–20 分钟。**
> - **A 期「可派任务」曾用尽（已由上面的乱码修复解除）**：当时为 6 篇有缺口 / 890 未覆盖块 / 14 个任务全部被挡。
>   剩余 6 篇：`261lengqiejing` 310b、`187hanshandashinianpushu-old` 224b、`204ssydj` 118b、
>   `502zhenxinzhishuojingjie` 109b、`502xiuxinjue` 89b、`251zhenqiyunxingfa` 40b。
> - **修订预计时间**：修完这 6 篇的乱码/CJK 后，890 块 ≈ 8 个任务 ≈ **1 轮（8 并行，约 8–10 分钟）**；
>   若按 5 并行则 2 轮 ≈ 20 分钟。即 **A 期主体只剩「周末修乱码 + 1 轮派发」**，不再是 3–4 小时。
> - **本轮实测**：8 并行下每轮（派发→核验→合并→提交）约 **3–6 分钟**，比 PLAYBOOK 的 8 分钟/轮更快；
>   40 个任务/5 轮总耗时约 25 分钟。
>
> **本会话新增的坑（务必遵守 + 两条已有坑的修正）**
> 1. **【新·最危险】`merge-parts` 会删除它合并掉的分片，所以「先合并、后提交」会永久丢失分片文件**。
>    本会话第 4 轮把 3 篇合并后才提交，`021taishanggy-2.p8/p9`、`023taishanggy-4.p14/p15`、
>    `104ganyingp.p8/p9` 等**未提交的分片被 merge-parts 直接删除**（内容已在整篇里，故无质量损失，
>    但那 6 个分片文件不在提交历史中）。**新规则：写完一片就 `git add` 一片，或至少在 `merge-parts` 之前先提交分片。**
> 2. **`git add -u` 只暂存「已跟踪」文件**，新建分片（untracked）不会被它带走；且一条 `git add A B` 里只要有
>    一个 pathspec 不存在（例如已被 merge-parts 删掉的分片），**整条 add 失败、A 也不暂存**（RESUME #17 的复现）。
>    本会话第 1、3、4 轮各中一次，都靠 `git commit --amend --no-edit` 补回。**每次提交后必须
>    `git status --porcelain` + `git show --stat` 双向核对**（不要只看 stat，stat 被 `Select-Object` 截断会误判）。
> 3. **【新】`gap-prep` 的「重复源」不是 bug，不要删**：`slice-plan` 的旧网格分片与新切片会指向同一块区间
>    （实测 `002baiyunxy.p3/p9/p10`、`023taishanggy-4.p8/p14`、`193….p4/p9`、`186….p2/p5/p10/p11` 等同源）。
>    这是「本轮未被派发」的备用源，可留到后续复用；但**派发前要按 `firstBlock+块数` 去重**，否则会重复翻译。
> 4. **`gap-prep` 一次调用内不会看到自己刚写出的 `build/slices/*.src.json`**（`enFiles` 在进程启动时读取），
>    所以**同一个 slug 的多次调用会撞同一个 part 号**（实测 `017jdwsswl` 三次调用都写 p9）。
>    **规则：同一 slug 的多个区间必须分多次进程调用，或每次调用后检查文件名。**
> 5. **`verify-slices` 要求 `<输出名>.src.json` 存在**，而 `gap-prep` 可能给出非规范 part 号
>    （如 `258quanzhenqizizhuan.p15`，源却是 `p1.src.json`）；此时子代理会报 `missing-src`，
>    复制一份同名 src 即可（本会话已为 p15/p16 建立同名 src）。
> 6. **`task-plan` 的「可派 0」= A 期收工信号**：不要再自己想新任务；剩余 890 块全部在乱码/CJK 篇里。
> 7. **子代理沿用的标点风格可能与仓库主流不同**：`021taishanggy-2` 既有分片用 ASCII `--` 而非 em dash，
>    子代理为「与同篇一致」而保留 `--`（本会话新增 4 处此类文件）。这不影响 `verify`/`validate`，
>    但周末统一音标/标点时要把这批算进 `scripts/quote-scan.mjs` / `fix-dashes.mjs` 的复查范围。
> 8. **`ArticleBody.tsx` 的 `InlineSegs` 是无分隔符拼接**：英文片段的片段边界必须自带空格。
>    本会话 3 个子代理独立发现并修正了这个问题（`171nianfoshishui.p9` 补了 171 处、`103yjy.p6` 逐块核对）。
>    **派发提示词里值得加一句**「片段拼接无分隔符，片段边界要自带空格」——但 DISPATCH.md 已含 1:1 要求，
>    是否加由下轮决定。
> - **本轮实际合并清单（14 篇）**：`022taishanggy-3`(560b)、`102lengqiejingxuanzhu`(747b)、
>   `105wangfengyijiayanlu`(409b)、`204danian`(408b)、`002baiyunxy`(495b)、`017jdwsswl`(390b)、
>   `021taishanggy-2`(299b)、`023taishanggy-4`(565b)、`104ganyingp`(408b)、`103yjy`(118b)、
>   `171nianfoshishui`(334b)、`186hanshandashideyisheng`(552b)、`193guanwuliangshoufojingjijie`(736b)、
>   `258quanzhenqizizhuan`(700b)。提交：`2b59f3f`、`4069fe6`、`478e771`、`b2358bd`、`fb0f6ef`、`4db6b2c`（未 push）。
>
> **上一会话检查点（已完成 10 轮，历史）**
> - 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`；工作区干净，全部已提交（**未 push**）。
> - **成果：`validate-en` 由 `ok=205 crit=6 warn=2 parts=81` → `ok=242 crit=6 warn=6 parts=40`**，
>   即本会话**新合并 37 篇完整英文文章**（10 轮 × 5 个并行子代理 = 50 个任务，**零返工、零孤儿分片**）。
>   A 期未覆盖块由 **6152 → 3692**，涉及文章由 **50 篇 → 20 篇**（`node scripts/coverage.mjs` 实测）。
> - **每轮选片与派发的标准流程（照做即可）**：
>   1. `node scripts/coverage.mjs` 看缺口；`node scripts/pick-next.mjs 12` 取「单一缺口 + `bad=0` + 无乱码 + 无 CJK」候选（能一任务补齐一篇）；
>   2. 多缺口篇用 `node scripts/gap-prep.mjs <slug>`（或 `slug:start-end` 拆超大缺口）预提取源文；
>   3. **派发前**必须：`meta-scan.mjs` 过一遍作者缺陷清单、`scan-mojibake.mjs` 排除乱码篇、减去在飞清单；
>   4. 5 个并行子代理，一片一个，提示词含「结构 1:1 / href 原样 / 禁用清单 / 分阶段写入 / 自跑 `verify-slices` 到 `ok`」；
>   5. 等 **finished 通知**后：`merge-parts <slug>` → `repair-json` → `validate-en` → `git add <slug>.json`（单独一条）
>      → `git add -u src/content/en -- ':!<在写分片>'` → commit → **`git show --stat HEAD` 核对含新增整篇**。
> - **修订后的预计完成时间**：A 期（≤300KB）未覆盖 **3692 块 / 20 篇**（约 60–65 片量）；「单一缺口即出整篇」的候选已基本用尽，
>   此后每篇需 2–4 个任务。按每轮 ~250 块、每任务 12–15 分钟，**剩余约 15 轮 ≈ 3.5–4 小时**（多会话推进）。
> - **本次新增工具（均已提交）**：`check-parts`、`analyze-eta`、`coverage`、`overlap`、`gap-prep`、
>   `pick-next`、`scan-mojibake`、`fix-dashes`、`quote-scan`、`meta-scan`（全部只读或幂等，见各自头部注释）。
> - **本次新增文档（已提交）**：`scripts/WEEKEND-PLAN.md` —— 周末专项修正版（303 精确修法、068/101 块索引、
>   五类隐性缺陷、源数据作者缺陷、STALE_PARTIAL 策略、诊断命令）。
>
> **本次会话新增的坑（务必遵守）**
> 1. **在飞去重**：`plan-slices --next N` 会把「已派出但尚未落盘」的片**继续列为可派**（实测 `127feixiange.p1`）。
>    每轮必须先 `--next N`、再**减去当前在飞的 partName**，然后取前 5；同一片绝不能让两个子代理同时写。
>    （反之，已落盘但没写完的片会被算作旧 partial 而不列出，两种状态要分开处理。）
> 2. **派发优先级**：优先派「只差 1 片」的篇（用 `scripts/analyze-eta.mjs`/`pick-next.mjs` 列出），每片直接兑现 1 篇整篇。
> 3. **303liuzutanjing 不是「重译 555–822」**：实测是 ±1 错位（`en[i] === zh[i-1]` 在 i=551..822 **272/272 成立**，
>    `en[551]` 多余、`zh[822]` 译文缺失，href 症状随之自愈）。修法见 `scripts/WEEKEND-PLAN.md` §1，约 15 分钟。
> 4. **`187hanshandashinianpushu-old` 是独立且已进 catalog 的文章**，其 `-old.pN.json` 是合法分片，**不要改名或删除**；
>    主篇 `187hanshandashinianpushu`（365KB）才是 B 期未译。
> 5. **crit 归属**：`043mengyouji`(2146KB)、`187hanshandashinianpushu`(365KB)、`239wuliangshoujing-jiaohuibenzhu-zhu`(341KB)
>    全是 **B 期**；A 期翻完后 A 期 crit 只剩 303（±1）、068（25 块）、101（8 块）三项。
> 6. `merge-parts` 合并后会**删除**该篇的 `.pN` 分片文件（这是设计行为），只留整篇 `<slug>.json`。
> 7. **不要在子代理还在跑的时候合并它负责的那篇**：实测 `127feixiange` 合并后，仍在收尾的子代理又「修复」出
>    `127feixiange.p1.json`，于是整篇 + 孤儿分片并存，`validate-en` 立刻从 `ok=210 parts=76` 退化为
>    `ok=209 parts=77`（孤儿分片被计为不合格）。**正确做法**：等该篇全部分片的子代理都发完成通知后再 merge；
>    一旦出现整篇与同名分片并存，**删掉分片**（内容已在整篇里），不要保留。
> 8. **`plan-slices --next N` 只截取前 N 名**，排序规则是「按篇的缺口数升序」。所以按「只差 1 片优先」策略挑片时，
>    不能只看 `--next 20`：高价值片可能排在很后面（实测 `401amtj.p4` 排第 65、`502yuanjuejingjj.p1` 排第 38，
>    却都是「补 1 片即出整篇」）。**做法：`--next 72`（或 100）取全量候选，再用 `scripts/analyze-eta.mjs`
>    的「只差 1 片」清单自行筛选前 5**，最后减去在飞清单。
> 9. **可派池会随合并收缩**：`--next 72` 由 72 降到 67、再降到 62，正好等于每轮 5 篇整篇各自消耗的 1 个可派片 ——
>    这是「没有重复计数」的有效校验；若数字不按完成量下降，说明有分片被重复计入。
> 10. **【重要】`merge-parts` 只看 `firstBlock` 连续性，不看文件名**。因此**旧网格分片**（文件名/边界与当前
>    `slice-plan.json` 不符、甚至多出 `p10/p11/p12/p40/p51/p70` 这类孤儿）在**块区间刚好连续**时也能直接合并。
>    本会话直接跑一次无参数的 `node scripts/merge-parts.mjs` 就**白捡 2 篇整篇**：`174dahuichanfa`(217 块)、
>    `502yuanjuejingjj`(706 块)，两者 `t` 不匹配 0、无 CJK。**建议：每轮核验后先跑一次无参数 merge-parts**，
>    它能自动收割所有「其实已经齐了」的篇。
> 11. **代价：无参数 merge-parts 会删除正在写入的分片**。本会话两次险情：`127` 合并后代理复活 p1 造成孤儿分片
>    （`ok=209 parts=77` 退化）；`174`/`502` 这次侥幸未复现。**规则：有子代理在飞时，只用 `merge-parts <slug>`
>    指定与在飞无关的篇**，不要在在飞期间跑无参数版本。
> 12. **派发前必须查区间重叠**：旧网格分片的存在会让「计划的第 N 片」与已译区间重叠（例：`401amtj` 计划 p4=[214-281]，
>    而其旧分片已覆盖其中一部分）。用 `node scripts/overlap.mjs <slug>` 查看「该区间已被其它分片覆盖 X/Y 块」，
>    只派未被覆盖的缺口；否则会重复翻译（本会话 `401amtj.p4` 约多译 51 块，无质量损害但浪费预算）。
> 13. **ETA 分母应改用「未覆盖块数」**：`node scripts/coverage.mjs` 实测 A 期（≤300KB、未合并）共 **6152 块未覆盖**
>    ≈ 100+ 片量（每片约 60 块）。用「缺片数」会低估，因为旧 partial 既不算缺片也不算完成（`analyze-eta.mjs`
>    已修正为显式统计 partial，不再静默跳过）。
> 14. **「嵌在已覆盖区间里的孤儿分片」会让 merge-parts 失败**：`304fozangj` 的 `p10` 覆盖 [599-649]，而孤儿
>    `p11`[615-629]、`p12`[630-632] 完全落在其中 → 拼接走到 next=650 后又遇到 fb=615 → 报
>    `[fail] merged 650/650 blocks (next=650)`（**块数看似相等但仍失败**，因为 `broken` 标记已置位）。
>    修法：先删掉被完全包含的孤儿分片，再 merge（本次删 p11/p12 后立即 `[merged] 304fozangj: 650 blocks`）。
>    判断依据：`scripts/coverage.mjs` 里「异常」为 0 且「覆盖 100%」即可放心删孤儿。
> 15. **缺口级派发（比整片派发划算得多）**：`node build/gap-prep.mjs <slug>` 会找出未覆盖区间并只备好缺口源文
>    （例：`212frame` 只差 9 块、`013zhufasx` 17、`088linzhongshinianxiangxu` 17、`032xyxing` 30、`401amtj` 36），
>    输出文件名取该篇最小空闲 `pN`。因为 merge-parts 只看 firstBlock 连续性，缺口分片用任意空闲编号即可。
> 16. **【自己犯过的错·务必照抄修正后的写法】派发提示的「禁用字符」清单不能把标点风格要求写反**。
>    某一轮提示写成「禁止 … ；·…— 以及全角引号 “ ” ‘ ’」，同时把 brief **要求**的 em dash 与
>    （brief 推荐的）英文弯引号一起禁掉了。后果有两处：
>    - 子代理改用 ASCII `--` 当破折号：5 个文件 78 处（`244guanxin.p1` 20 处即由此产生）。
>      已用 `scripts/fix-dashes.mjs`（结构化 JSON 遍历，先 dry-run 再 `--apply`）把 ` -- ` → ` — `，复查为 0。
>    - 子代理改用 ASCII 直引号，而仓库主流风格是弯引号：`scripts/quote-scan.mjs` 实测 423 个文件里
>      **弯引号独用 221 / 直引号独用 56 / 混用 45**（本会话新合并的几篇把 straight 计数推高）。
>    - **正确写法**：禁用清单**只写**「任何 CJK 汉字 + 全角字符（【】〔〕《》（）「」、。，！？：；）」，
>      并明确一句「以下都是**允许且推荐**的，直接用：英文弯引号 “ ” ‘ ’、em dash —、间隔号 `·`（U+00B7）、
>      省略号 `…`（U+2026）」。
>    - **补充实测（第三个提示词 bug）**：我最初的清单还多禁了 `·` 与 `…`，但它们是**非全角**的普通英文排版字符，
>      brief 并未禁止，而且语料里 **111 个文件用 `·`**（用于「经名·品名」分隔）。过量禁止导致部分子代理把 `·` 改成 ", "、
>      把 `…` 改成 "..."，反而制造了新的不一致（实测：`…` 28 个文件 vs ASCII `...` 118 个文件）。
>      **规则**：`verify-slices` 的 CJK 正则只覆盖 U+3000-303F / U+FF00-FFEF，`·`(U+00B7)、`…`(U+2026)、
>      弯引号(U+2018-201D)、em dash(U+2014) 全都不会被判违规 —— 所以**不要禁它们**；要与该篇既有分片保持一致。
> 17. **合并顺序与提交纪律**：`git add -A src/content/en` 会把**正在写入**的分片一起提交。更隐蔽的是：
>    `git add A B` 里只要**有一个 pathspec 不存在**（例如已被 `merge-parts` 删除的分片），**整条 add 会失败，
>    A 也不会被暂存**，随后 `git add -u` 只暂存删除，于是提交里**只有删除、没有新合并的整篇**（本会话中了两次）。
>    **正确顺序**：先 `git add <slug>.json`（只加合并产物，单独一条命令），再
>    `git add -u src/content/en -- ':!<在写分片>' …` 暂存删除；提交后用 `git show --stat --oneline HEAD` 核对
>    统计里**确实包含新增的整篇文件**。若漏了，用 `git add <slug>.json && git commit --amend --no-edit` 补回。
> 18. **不要合并「含乱码分片」的篇**：`scripts/scan-mojibake.mjs` 列出的 12 个文件里，凡是被某篇整篇引用到的，
>    一旦合并就会把乱码**锁进整篇**（之后再按分片修就更麻烦）。派发前应先跑 `scan-mojibake` 交叉检查：
>    受影响而应暂缓合并的篇有 `251zhenqiyunxingfa`、`204ssydj`、`502xiuxinjue`、`502zhenxinzhishuojingjie`、
>    `261lengqiejing`、`187hanshandashinianpushu-old`、`303liuzutanjing`。先修乱码（§7.1 两步法）再合并。
> 19. **【本会话第五类隐性缺陷】旧分片里的 CJK/全角残留会在合并时变成新的 `crit`**。实测 `095luelunmxjx`
>    合并后 `crit` 由 6 升到 7，原因是两个**旧分片**的块首留着 `〔`（U+3014）——被新译的 `p7/p8`（各自 `verify ok`）
>    掩盖，只有拼成整篇才被 `validate-en` 看见。修法：结构化遍历把 `〔〕` → `[]`（2 处），`crit` 立即回到 6。
>    **由此得到的通用规则**：合并前不仅要看 `coverage.mjs` 的 `bad`（结构），还要扫**旧分片自身的 CJK 与乱码**；
>    `scripts/pick-next.mjs` 已加入这两道过滤（`excluded (CJK residue in existing parts)`）。
>    换句话说：**一篇的「缺口质量」和「既有部分质量」是两回事，后者不查就会在合并时炸出来**。

> **上一会话检查点（2026-09-10 两小时会话末 · 历史）**
> - 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`；已提交，工作区干净。
> - 本次共 **6 轮 × 5 并行子代理 = 30 片**新英文分片（第 1–3 轮见下），全部核验通过并提交：
>   `d68d5f0`、`741701f`、`55353c4`、`a7bd013`、`7929528`、`8f7bc2d`、`a8ce246`。
>   第 4–6 轮 15 片：`000jxdg-chan.p1`、`003xffayuanw.p1`、`006linzhongzn.p1`、`009xiuwfayao.p1`、`013zhufasx.p1`、
>   `018xinyzx.p3`、`027lfsx-baihua.p3`、`028baofufa.p1`、`048wangshengfl.p1`、`066xinliliaobing.p1`、
>   `077faranqujie.p1`、`080waiqushandaodashi.p1`、`081di18yuan.p1`、`114huxinianfojingyi.p1`、`115xifangquezhi.p4`。
> - 因这 30 片，`merge-parts` **新合并出 17 篇完整英文文章**（000jxdg-chan / 003xffayuanw / 006linzhongzn / 009xiuwfayao / 018xinyzx / 026yjy-baihua / 027lfsx-baihua / 028baofufa / 048wangshengfl / 066xinliliaobing / 074chimingnf48 / 077faranqujie / 080waiqushandaodashi / 081di18yuan / 114huxinianfojingyi / 115xifangquezhi / 177niliujuezhao）。
> - 状态：`validate-en` = **ok=205 crit=6 warn=2 parts=81**；`plan-slices` = 61 篇有缺口 / 缺 156 片 / **可立即派发 72 片**（plan 一致性问题 0）。
> - 工具（均已提交）：`scripts/plan-slices.mjs`（体检 + `--next N` 挑可安全派发切片 + `--fix` 修补空 slices）、`scripts/verify-slices.mjs`（单/多片核验）、`scripts/prep-slices.mjs`。旧的 `audit-slices.mjs` 已删除（被 plan-slices 取代）。
> - **重要发现（周末注意）**：
>   1. `make-agent-tasks.mjs` 的清单**不再作为派发依据**（它只登记部分切片）——请改用 `plan-slices.mjs --next N` 选片：它会跳过历史 partial、保证"计划内 + 无同名产出 + 前一片已齐"。
>   2. `slice-plan.json` 已重新生成（`111mituoyuanzhongchao` 补 4 片、3 篇重命名的 239 系列恢复），并已 `--fix`，plan 一致性问题为 0。
>   3. `303liuzutanjing` 英文整篇 **块 555–822 错位**（89 块 `t`/inline 不匹配，块 671 丢 href `/articles/152sizukaishifarong`）——内容在但边界不齐，英文模式该段会串行，周末需重译/重对齐。
>   4. 其余 crit：`043mengyouji`、`187hanshandashinianpushu`、`239wuliangshoujing-jiaohuibenzhu-zhu` 分片未齐；`068xiangxujs`、`101yebunengxi` 仍有 CJK 残留。
>   - B（>300KB）仍延后（`make-agent-tasks.mjs` 里 `DEFER_BYTES`）。
>
> **下一会话第一步（第一句给代理）**：
> “读 `scripts/RESUME.md` 与 `scripts/NEXT.md`，按其中步骤继续 A 期：`node scripts/plan-slices.mjs --next 15` 取可派切片 → 每轮 5 个并行子代理（一片一个）按 `scripts/TRANSLATION-BRIEF.md` 翻译 → `node scripts/verify-slices.mjs <part>` 核验 → `git commit`（不要 push）；某文章分片齐了再 `merge-parts.mjs`→`repair-json.mjs`→`validate-en.mjs`。”

## 目的
fou 项目（huideng-chanlin）英文模式下的中→英翻译复刻。目标：英文模式下文章/签文/主页无中文残留。

## 已完成（本次会话）
- **代码与界面**：双语数据模型（`src/lib/content.ts` 的 `loadArticleForLang`/`localizedMeta`/`hasEnglish`）、全部界面 i18n（`src/i18n/{zh,en}.ts`）、32 签英文（`src/data/lots.ts`）、每日法语英文（`src/data/verses.ts`）、灵棋经 125/125（`src/content/lingqi-en.json`）、目录元数据 299/299（`src/content/catalog-en.json`）。`tsc` + `vite build` 通过。
- **文章正文英文覆盖**：`src/content/en/<slug>.json`（整篇，含 title/author/excerpt/blocks）+ 大经典的分片 `<slug>.pN.json`（`{"firstBlock":N,"blocks":[...]}`）。
  - 当前约 `ok=177` 篇已完整、结构 1:1、无中文残留；另有 ~108 篇为部分分片（待合并）、`crit=11`（完全未译与问题文件）、`warn=3`（行内片段数，展示层无影响）。
  - `303liuzutanjing《六祖坛经精解》`已整篇英文（1530 块）。
  - `111mituoyuanzhongchao` 中文源已从 CBETA（X22n0423《阿弥陀经略解圆中钞》）抓取重建（英文正文下周做）。
  - 5 个 GBK 乱码文件名文章已重命名为规范 slug（235…-ziliao2 / 239…-huiyi-zhu / 239…-jiaohuibenzhu-zhu / 240…-lun / 241…-wj2），catalog 同步、无内容删除。
  - 术语已统一（Shandao / Primal Vow / Amitabha / Avalokiteshvara / Mahasthamaprapta / one mind undisturbed / uphold the Name）。

## 工作流与脚本（`scripts/`）
- `make-agent-tasks.mjs`：生成 `agent-tasks.json`（跳过已完成；≤300KB 优先；输出已存在则跳过）。当前约 100 批/303 任务。
- `slice-plan.mjs` → `slice-plan.json`：>28KB 文章按块边界切片（每片 ~28KB）。
- `merge-parts.mjs`：按 `firstBlock` 连续拼接 `.pN.json` 分片 → 合并为整篇 `<slug>.json`，校验块数连续且与源一致。
- `validate-en.mjs`：校验整篇/分片——JSON 可解析、无 CJK/全角标点、块类型/数量/表维度/标题层级一致、href 未丢失；区分 `ok`/`warn`（行内片段数）/`crit`（缺失/错误）。
- `repair-json.mjs`：修复文件头 BOM 与字符串内裸控制字符。
- `build-catalog-en.mjs`：由 `en/*.json` 汇总 `catalog-en.json`。
- `merge-lingqi.mjs`：合并灵棋经英文分片。
- `TRANSLATION-BRIEF.md`：翻译规范（雅信达、术语、结构 1:1、无 CJK、≤40KB 单文件）。

## 断点恢复步骤（下星期继续）
1. 定期跑 `node scripts/merge-parts.mjs`（把已齐的分片拼成整篇）。
2. `node scripts/repair-json.mjs` 清理 BOM/控制字符。
3. `node scripts/validate-en.mjs` 看 `crit`（缺失/错误）与 `warn`；对 `crit` 项补派翻译/修复。
4. 需要更多任务时重跑 `node scripts/make-agent-tasks.mjs`（会自动排除已完成与已产出分片），再按批派发子代理。
5. 全部完成后：`node scripts/build-catalog-en.mjs` 刷新目录英文，最后 `npm run build` 验证。

## 下周待办（优先级 C → A → B）

**C（先做）· 特殊/问题文件**
- `111mituoyuanzhongchao`：中文源已从 CBETA(X22n0423) 重建为干净 JSON → 补做英文正文（标题/作者/摘录/blocks），目录英文标题已有。
- 已重命名的 5 篇（235…-ziliao2 / 239…-huiyi-zhu / 239…-jiaohuibenzhu-zhu / 240…-lun / 241…-wj2）→ 补做英文覆盖。
- 复核 `warn=3`（`130foqikaishi` 两块、`278-2` 块类型差异，行内片段数，展示层无影响）。

**A（其次）· 中等未齐分片（约 4–5 小时）**
- 补齐 **≤300KB 的 90 篇**仍缺分片（约 9.3MB 中文），合并成整篇英文。

**B（最后）· 超大型经典全文英译（约 6 小时+）**
- **>300KB** 约 15 篇分片 + 4 篇未译（约 13MB）：`001juezhichan`/`001jznf`/`002baiyunxy`/`016xdwsjwl`/`017jdwsswl`/`022taishanggy-3`/`023taishanggy-4`/`025taishanggy-yw`/`043mengyouji`/`047shengmingdcj`/`102lengqiejingxuanzhu`/`102lfsx`/`205jgj-jiangyi`/`239系列`/`246henghedashouyin`/`258quanzhenqizizhuan`/`261lengqiejing`/`262dachengrulengqiejing`/`293jgj-zhu`/`301jgj`/`304fozangj`/`401amtj`/`402nianfolun`/`403chanjing`/`502xiuxinjue`/`502yuanjuejingjj` 等。

**通用流程（每篇/每批）**
1. `node scripts/make-agent-tasks.mjs`（≤300KB 优先、跳过已完成与已产出分片）生成批次。
2. 派子代理按 `TRANSLATION-BRIEF.md` 翻译（结构 1:1、无 CJK、无 BOM、≤~40KB 单文件，超出拆连续 `.pN`）。
3. `node scripts/merge-parts.mjs` 合并整篇；`node scripts/repair-json.mjs` 清 BOM/控制字符；`node scripts/validate-en.mjs` 校验。
4. 全部完成后：`node scripts/build-catalog-en.mjs` 刷新目录英文 → `tsc` + `vite build` → `git push`（触发 GitHub Actions 自动发布到 zen.sethfengli.com）。

## A/B 启动明细（下周照做）

**前置修改（本周就改好）**
- 在 `scripts/make-agent-tasks.mjs` 中**删除** `if (f.startsWith('111mituoyuanzhongchao')) continue`（111 已重建、本应纳入翻译）。乱码文件名过滤 `if (/[\u2500-\u257f]/.test(f)) continue` 已无对象，可保留或删除。

**A（≤300KB 的 90 篇，约 4–5 小时）**
1. `node scripts/slice-plan.mjs`（确保所有 ≤300KB 文章的切片计划最新）。
2. `node scripts/make-agent-tasks.mjs`（默认 `DEFER_BYTES=300KB`，自动跳过已完成与已产出分片）→ 生成 `agent-tasks.json`（只含 A 的剩余批次）。
3. 查看批次：`node -e "const t=require('./scripts/agent-tasks.json'); console.log(t.length, t.reduce((a,b)=>a+b.tasks.length,0))"`。
4. 每轮派 **5 并行子代理**（每批 = 一个 batch id），按上面的通用流程处理；收工即 `merge-parts` → `repair-json` → `validate-en`。
5. A 全部完成后 `node scripts/build-catalog-en.mjs` 刷新目录。

**B（>300KB 超大型经典，约 6 小时+）**
1. 编辑 `scripts/make-agent-tasks.mjs`：把 `DEFER_BYTES` 调大（如 `30*1024*1024`）或去掉阈值，让 >300KB 文件纳入。
2. `node scripts/slice-plan.mjs` + `node scripts/make-agent-tasks.mjs` → 生成 B 的批次（大经典按 28KB 切片）。
3. 派发批次翻译；**注意**：大经典分片分散在多个批次，某文件须**所有分片齐了才合并**；`merge-parts.mjs` 会打印 `[gap]`（缺某分片），对缺失切片**单独补派**即可。
4. 合并 → 校验循环；最后 `build-catalog-en` → `tsc`/`vite build` → `git push`。

**注意点**
- 大经典或未完成项英文正文先走「中文+右侧机翻」兜底，不影响其余内容。
- 每个新英文整篇写入后，`build-catalog-en` 会自动汇总其英文标题/摘要到 `catalog-en.json`。
- 中文源里 `chars` 仅用于阅读时长估算，不必回写。

**质量与兜底**
- 未完成英文的文章在英文模式下显示「中文原文 + 右侧机翻」（已验证，无空页）。
- 全部完成后对新增翻译做一轮雅信达 review；选项：跨文件术语微调（如《地藏经》canonical「Original Vows」是否保留）。
- 超大型经典或未完成项英文正文先走中文+机翻兜底，不影响其余内容。

## 质量控制
- 翻译遵循 `TRANSLATION-BRIEF.md`：雅（典雅英文/韵文）、信（忠于原文经义）、达（流畅地道）、结构 1:1、无 CJK、超链接保留、每文件 ≤~40KB（超出则拆分连续 `.pN` 文件）。
