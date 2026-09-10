# 下次开新对话的启动提示词（复制下面这段给代理）

继续 huideng-chanlin 英文翻译（先读 `scripts/RESUME.md` 了解背景，再读本文件末尾的"坑"）。工作目录 `D:\FengLi\Web\fou\huideng-chanlin`，工作区已干净（顶层 commit `a7bd013` 之后），`tsc` 通过，A 期剩约 123 个磁盘上尚无产出的切片，B 期(>300KB)延后。

每轮 5 个并行子代理、一个切片一个，务必精简、禁止重复派发与反复轮询：
1. `node scripts/make-agent-tasks.mjs` 再 `node scripts/prep-slices.mjs`（切片预提取到 `build/slices/<partName>.src.json`；build/ 已 gitignore）。
2. **挑片**：`node -e "const fs=require('fs');const t=require('./scripts/agent-tasks.json').flatMap(b=>b.tasks);console.log(t.filter(k=>!fs.existsSync('src/content/en/'+k.partName)).slice(0,5).map(k=>k.partName+' fb='+k.slice.firstBlock+' lb='+k.slice.lastBlock+' meta='+!!k.includeMeta).join('\n'))"`——只派"清单内 + 磁盘上无产出"的切片，防重复派发。
3. 派子代理：只读 `build/slices/<partName>.src.json`，按 `scripts/TRANSLATION-BRIEF.md` 翻译，写出 `src/content/en/<partName>.json`（firstBlock 照抄、blocks 1:1、禁止任何汉字/全角标点【】〔〕《》（）「」、保留 href、合法 JSON、单文件不分片；`includeMeta:true` 时还要译 zhTitle/zhAuthor/zhExcerpt 为纯英文字段）。
4. 收到完成通知后核验：`node scripts/verify-slices.mjs <partName>...`（一次性核验整轮）。合格就 `git add` + `git commit`（**不要 git push**，用户手动）；含中文/全角标点或块数不一致的直接删除、补派重译。
5. 某文章所有切片齐了才 `node scripts/merge-parts.mjs [slug]` → `repair-json.mjs` → `validate-en.mjs`；`merge-parts` 报 `[fail] slug: merged X/Y` 说明还没齐（正常）。
6. 这是多会话马拉松：每轮推进 5 片即可，派发后等完成通知、不打断、不轮询（实测子代理 ~8–15 分钟/片）。

# 当前状态速览（2026-09-10 一小时后）

- 本轮 3 轮 × 5 = 15 片全部合格提交：`d68d5f0`（102….p1、074….p1、175….p3、186….p3、110….p3）、`741701f`（002baiyunxy.p4、187…-old.p4、022taishanggy-3.p10/p4、258quanzhenqizizhuan.p3）、`55353c4` + `a7bd013`（177niliujuezhao.p1、026yjy-baihua.p1、230guanjingzhu.p1、234wuliangshoujingyishu.p3、401amtj.p6）。
- `node scripts/validate-en.mjs` → `ok=188 crit=6 warn=2 parts=98`；`src/content/en/` 有 199 个整篇 + 281 个分片。
- `scripts/agent-tasks.json`：137 任务，磁盘上尚缺 **123**（`batches` 编号与文章无关，别按批派发整批）。

# 坑（本周踩过的，务必避开）

1. **清单 ≠ 计划**：`make-agent-tasks.mjs` 只为每篇文章登记了部分切片（例：`074chimingnf48` 计划 2 片却只登记 p1），且历史分片的编号/块区间与当前 `slice-plan.json` 不一致；`scripts/audit-slices.mjs` 会打印"UNQUEUED"缺口。派发前先交叉核对，避免漏片或重复。
2. **分片文件可能比任务更大**：子代理写出的文件 >40KB 是常事（`write` 截断风险由子代理自查块数规避），合并脚本只看 `firstBlock` 连续性，不看文件名编号，所以合并前必须 `verify-slices.mjs` 全绿。
3. **`303liuzutanjing` 英文整篇块 555–822 错位**（89 块 `t`/inline 不匹配、块 671 丢 href）——周末需重译/重对齐该区间，别当已完工。
4. **CJK 残留**：`068xiangxujs`、`101yebunengxi` 英文文件仍含中文；`102lengqiejingxuanzhu.p1` 上轮就因全角括号失败，派发提示里必须明确列出禁用字符。
5. `npm run build`（vite）在本沙箱会因 `spawn EPERM` 失败，本地可跑；`tsc --noEmit` 可跑。
