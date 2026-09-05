# 下次开新对话的启动提示词（复制下面这段给代理）

继续 huideng-chanlin 英文翻译（先读 `scripts/RESUME.md` 了解背景）。工作目录 `D:\FengLi\Web\fou\huideng-chanlin`，工作区已干净、`tsc` 通过；A 期还剩 ~141 切片，B 期(>300KB)延后。

每轮 5 个并行子代理，一个切片一个，务必精简、禁止重复派发与反复轮询：
1. 若待译清单不是最新：`node scripts/make-agent-tasks.mjs` 再 `node scripts/prep-slices.mjs`（切片预提取到 `build/slices/<partName>.src.json`，含 firstBlock/blocks/元信息；build/ 已 gitignore）。
2. 派子代理：只读 `build/slices/<partName>.src.json`，按 `scripts/TRANSLATION-BRIEF.md` 翻译，写出 `src/content/en/<partName>.json`（firstBlock 照抄、blocks 1:1、禁止任何汉字/全角标点【】〔〕《》、保留 href、合法 JSON、单文件不分片）。
3. 收到完成通知后再核验（无 CJK + 块数一致）；只提交合格文件，含中文/全角括号的直接删除不提交。
4. 某文章所有切片齐了才 `node scripts/merge-parts.mjs` → `repair-json.mjs` → `validate-en.mjs`。
5. **不要 git push**（用户手动）；只 `git commit`。
6. 这是多会话马拉松，不求一次做完；每轮推进 5 切片即可，别陷入轮询等待。

# 当前状态速览（2026-09-05 会话末）

- 工作区干净；`tsc --noEmit` 通过；`npm run build`（vite）在沙箱因 `spawn EPERM` 跑不了，本地可跑。
- 本轮已提交合格分片：017jdwsswl.p2 / 018xinyzx.p2 / 095luelunmxjx.p4 / 304fozangj.p7 / 402nianfolun.p4 / 193guanwuliangshoufojingjijie.p3 / 502xiuxinjue.p3 / 304fozangj.p6 / 304fozangj.p10。
- 已删含中文分片：102lengqiejingxuanzhu.p1（全角括号残留，重译仍失败——派发时明确禁止【】〔〕《》）。
- 教训：本次 174 步无实质进展，主因是反复轮询/反复打断重派子代理、子代理翻译慢（~12-15 分钟/片）。下次派发后等完成通知、不打断、不轮询。
