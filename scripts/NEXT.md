# 下次开新对话的启动提示词（复制下面这段给代理）

继续 huideng-chanlin 英文翻译（先读 `scripts/RESUME.md` 了解背景，再读本文件末尾的"坑"）。工作目录 `D:\FengLi\Web\fou\huideng-chanlin`，工作区已干净（顶层 commit `a8ce246` 之后），`tsc` 通过；A 期还剩 156 片（其中 72 片可立即派发），B 期(>300KB)延后。

每轮 5 个并行子代理、一个切片一个，务必精简、禁止重复派发与反复轮询：
1. **选片**：`node scripts/plan-slices.mjs --next 15`（会校验 plan、跳过历史 partial、只给"计划内 + 无同名产出 + 前一片已齐"的切片）；再用 `node build/next-batch.mjs 15` 把这 15 片的源文预提取到 `build/slices/<partName>.src.json`（`build/` 已 gitignore；`next-batch.mjs` 是临时脚本，若不存在按 `RESUME.md` 的 `prep-slices`/`plan-slices --next` 重建即可）。
2. 派子代理：只读 `build/slices/<partName>.src.json`，按 `scripts/TRANSLATION-BRIEF.md` 翻译，写出 `src/content/en/<partName>.json`（firstBlock 照抄、blocks 1:1、禁止任何汉字/全角标点【】〔〕《》（）「」、保留 href、合法 JSON、单文件不分片；`includeMeta:true` 时还要把 zhTitle/zhAuthor/zhExcerpt 译成纯英文字段，源无 zhAuthor 就省略 author）。
3. 收到完成通知后核验：`node scripts/verify-slices.mjs <partName>...`（一轮一次即可）。合格就 `git add` + `git commit`（**不要 git push**，用户手动）；含中文/全角标点或块数不一致的直接删除、补派重译。
4. 某文章所有切片齐了才 `node scripts/merge-parts.mjs [slug]` → `repair-json.mjs` → `validate-en.mjs`；`merge-parts` 报 `[fail] slug: merged X/Y` 说明还没齐（正常）。
5. 这是多会话马拉松：每轮推进 5 片即可，派发后等完成通知、不打断、不轮询（实测子代理 ~8–15 分钟/片）。

# 当前状态速览（2026-09-10 两小时会话末）

- 本次 6 轮 × 5 = **30 片**全部合格提交：`d68d5f0`、`741701f`、`55353c4`、`a7bd013`、`7929528`、`8f7bc2d`、`a8ce246`。
- `merge-parts` 因此**新合并出 17 篇完整英文文章**；`node scripts/validate-en.mjs` → `ok=205 crit=6 warn=2 parts=81`。
- `node scripts/plan-slices.mjs` → 61 篇有缺口 / 缺 156 片 / **可立即派发 72 片** / plan 一致性问题 0。

# 坑（务必避开）

1. **别再用 `agent-tasks.json` 选片**：`make-agent-tasks.mjs` 只为每篇登记部分切片（例：`074chimingnf48` 计划 2 片只登记 p1），历史分片编号与当前 `slice-plan.json` 不一致。选片一律用 `node scripts/plan-slices.mjs --next N`。
2. **旧 partial 会挡路**：若某计划区间已有"块数不足"的旧分片（`plan-slices` 会打印 `STALE_PARTIAL`），不要直接派同编号任务（会同名冲突）；要么先删旧 partial 再派，要么跳过该片改派其他片（当前策略是跳过，剩 0 可派的都属此类）。
3. **文件可能 >40KB**：子代理写出的分片 40–60KB 很常见，写的时候要分几次 write/edit，但必须是一个文件、块数完整；合并前必须 `verify-slices.mjs` 全绿。
4. **`303liuzutanjing` 英文整篇块 555–822 错位**（89 块 `t`/inline 不匹配、块 671 丢 href）——需重译/重对齐该区间，别当已完工。
5. **CJK 残留**：`068xiangxujs`、`101yebunengxi` 英文文件仍含中文；派发提示里必须明确列出禁用字符（上轮 `102lengqiejingxuanzhu.p1` 就因全角括号失败过一次）。
6. `npm run build`（vite）在本沙箱会因 `spawn EPERM` 失败，本地可跑；`tsc --noEmit` 可跑。
