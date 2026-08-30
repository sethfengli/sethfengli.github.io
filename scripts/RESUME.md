# 英文翻译续作指南（下星期继续）

## 目的
fou 项目（huideng-chanlin）英文模式下的中→英翻译复刻。目标：英文模式下文章/签文/主页无中文残留。

## 已完成（本次会话）
- **代码与界面**：双语数据模型（`src/lib/content.ts` 的 `loadArticleForLang`/`localizedMeta`/`hasEnglish`）、全部界面 i18n（`src/i18n/{zh,en}.ts`）、32 签英文（`src/data/lots.ts`）、每日法语英文（`src/data/verses.ts`）、灵棋经 125/125（`src/content/lingqi-en.json`）、目录元数据 299/299（`src/content/catalog-en.json`）。`tsc` + `vite build` 通过。
- **文章正文英文覆盖**：`src/content/en/<slug>.json`（整篇，含 title/author/excerpt/blocks）+ 大经典的分片 `<slug>.pN.json`（`{"firstBlock":N,"blocks":[...]}`）。
  - 当前约 `ok=161` 篇已完整、结构 1:1、无中文残留；另有 100+ 篇为部分分片（待合并）。
  - 超大型经典（>300KB）已延后到下一阶段（英文模式下显示中文原文+机翻兜底）。

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

## 待办（下星期）
- 综合所有未合并分片（parts）与 `crit` 项——主要是中型文章未齐的分片与超大型经典（>300KB）的全文。
- 超大型经典清单（>300KB，延后）：如 001juezhichan/001jznf/002baiyunxy/016xdwsjwl/017jdwsswl/022taishanggy-3/023taishanggy-4/025taishanggy-yw/043mengyouji/047shengmingdcj/102lengqiejingxuanzhu/102lfsx/111mituoyuanzhongchao(损坏,已排除)/205jgj-jiangyi/239系列/246henghedashouyin/258quanzhenqizizhuan/261lengqiejing/262dachengrulengqiejing/293jgj-zhu/301jgj/303liuzutanjing/304fozangj/401amtj/402nianfolun/403chanjing/502xiuxinjue/502yuanjuejingjj 等。
- 5 个 GBK 乱码文件名文章（含 ╬▐┴┐ 等字符）需单独处理。
- 复核 `warn`（行内片段数差异，多为链接/分段合并）与个别 >40KB 分片。

## 质量控制
- 翻译遵循 `TRANSLATION-BRIEF.md`：雅（典雅英文/韵文）、信（忠于原文经义）、达（流畅地道）、结构 1:1、无 CJK、超链接保留、每文件 ≤~40KB（超出则拆分连续 `.pN` 文件）。
