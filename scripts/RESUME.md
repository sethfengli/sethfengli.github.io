# 英文翻译续作指南（下星期继续）

> **本次会话检查点（进行中，滚动更新）**
> - 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`；已提交（除正在写入的分片外工作区干净）。
> - **第 1 轮 5 片全部 `ok` 并各自合并成整篇**：`124tanluandashikaishi`(105 块)、`126lianchidashi-taming`(102)、
>   `127feixiange`(59)、`132pingsanxinnianfo`(82)、`133huiyuandashizhuan`(77)。提交：`51fccbe`、`5af055e`。
> - 状态：`validate-en` = **ok=210 crit=6 warn=2 parts=76**（会话初为 ok=205 crit=6 parts=81）。
> - 第 2 轮已派发（5 并行）：`148pingjingtuzongjiaozhang.p1`、`158xinqiujileyanlisuopo-baihua.p1`、
>   `160boerenzhengjishuo.p1`、`169ergenyuantongfamen.p1`、`172canjiunianfo.p1`（五篇 p2 均已 `ok`，预期再出 5 篇整篇）。
> - **修订后的预计完成时间（数据版，取代旧估法）**：A 期（≤300KB）真实缺口由 `scripts/analyze-eta.mjs` 实测为
>   **102 片 / 48 篇**，其中 **20 篇只差 1 片**、12 篇只差 2 片；按 5 片/轮、15–20 分钟/轮，A 期约 **20 轮 ≈ 5–6.5 小时**，
>   前 20 片约 4 轮 ≈ 1.2 小时即可兑现 20 篇整篇。`plan-slices` 报的「缺 156 片」含 B 期与零产出篇，**不能当 A 期分母**。
> - **本次新增工具（已提交）**：`scripts/check-parts.mjs`（合并前预检已有分片：区间/块数/`t`/inline/href/CJK）、
>   `scripts/analyze-eta.mjs`（只读统计 A 期缺口与「只差 1 片」的篇）。
> - **本次新增文档（已提交）**：`scripts/WEEKEND-PLAN.md` —— 周末专项的**修正版**任务与工时，含 303 的精确修法、
>   068/101 的 CJK 块索引、crit 归属纠正、STALE_PARTIAL 处理策略、在飞去重规则。
>
> **本次会话新增的坑（务必遵守）**
> 1. **在飞去重**：`plan-slices --next N` 会把「已派出但尚未落盘」的片**继续列为可派**（实测 `127feixiange.p1`）。
>    每轮必须先 `--next N`、再**减去当前在飞的 partName**，然后取前 5；同一片绝不能让两个子代理同时写。
>    （反之，已落盘但没写完的片会被算作旧 partial 而不列出，两种状态要分开处理。）
> 2. **派发优先级**：优先派「只差 1 片」的篇（用 `scripts/analyze-eta.mjs` 列出），每片直接兑现 1 篇整篇，
>    比 `plan-slices` 默认顺序更划算。
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
> 16. **【自己犯过的错】派发提示里的「禁用字符」清单不要把 em dash `—` 算进去**。某一轮提示词写成
>    「禁止 … ；·…— 以及全角引号」，把 brief 明确**要求**的 em dash 也列进了禁用集，导致子代理改用 ASCII `--`。
>    实测 5 个文件共 78 处 ` -- `（其中 `244guanxin.p1` 20 处就是这次造成的）。已用结构化 JSON 遍历把
>    ` -- ` → ` — `（`build/fix-dashes.mjs`，dry-run 先看，再 `--apply`），复查 ` -- ` 为 0、`validate-en` 不变。
>    **正确写法**：禁用清单只列全角/CJK（【】〔〕《》（）「」、。，！？：；·… 与全角引号），并明确「破折号用 em dash `—`」。
> 17. **合并顺序与提交纪律**：`git add -A src/content/en` 会把**正在写入**的分片一起提交（且 `git add` 遇到
>    已不存在的 pathspec 会整体失败、静默漏掉后面的文件）。**只用显式路径 add**，在飞文件用 pathspec 排除。

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
