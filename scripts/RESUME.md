# 英文翻译续作指南（下星期继续）

> **当前检查点（2026-09-10 两小时会话末）**
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
