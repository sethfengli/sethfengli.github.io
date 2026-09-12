# 英文翻译续作指南

> 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`。**A 期 + B 期翻译全部完成**（2026-09-12）。
> 本文件 = 状态 + 目录 + 流水线 + 坑；**下一轮要做什么见 `scripts/NEXT-PLAN.md`**；翻译轮实测细节见 `scripts/B-PHASE-HANDOFF.md`。

## 1. 当前状态（2026-09-12 实测）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=274 crit=3 warn=11 parts=6** |
| `scan-mojibake` | **0 / 300** |
| 翻译队列 `task-plan.mjs 120` | **0 篇 / 0 块 / 0 任务 / 0 被挡 → 翻译收工** |
| `plan-slices.mjs`（审计） | 0 篇有缺口 / 缺 0 片 / 可派 0 片 / 一致性问题 0 条 |
| 工作区 | 干净，全部已提交，**未 push**（用户手动） |
| 规模 | A 期 11 篇 + B 期 18 篇 = **29 篇**英文整篇；B 期 24,491 块 / 205 任务，实测 **395 min ≈ 6.6 h** |

**crit 3 项（全部是「修缺陷」而非「缺翻译」，勿当未完工）**

| slug | 症状 | 处置 |
| --- | --- | --- |
| `303liuzutanjing` | 块 551 多余 / 块 822 缺译，551-822 区间 `en[i]=zh[i-1]`（272/272 成立），href 症状自愈 | **删 1 块 + 补译 1 块**，见 `NEXT-PLAN.md` §1 |
| `068xiangxujs` | 84 块里 **25 块**仍含中文（部分翻译） | 只补这 25 块，见 `NEXT-PLAN.md` §2 |
| `101yebunengxi` | 64 块里 **8 块**仍含中文 | 只补这 8 块，见 `NEXT-PLAN.md` §2 |

## 2. 目录与产出（哪些是内容、哪些是工具）

```
src/content/articles/*.json     中文源（权威；meta 缺陷也改这里，不要改 en）
src/content/en/*.json           英文覆盖（整篇；分片在 merge 前是 *.pN.json）
src/content/catalog-en.json     slug → {title,author,excerpt}（英文界面用；build-catalog-en.mjs 生成）
src/content/{catalog,lingqi,lingqi-en,…}.json   其它内容数据
dist/                           vite 构建产物（gitignore）
build/                          临时工作区（gitignore）：只留 5 个复用脚本，见 §5
```

**`build/` 里的 5 个复用脚本（翻译/补片必用）**

| 脚本 | 用途 |
| --- | --- |
| `mksrc.mjs <slug.pN>` | 编号源 → `build/<slug.pN>.src.txt`（每行 `<n>\t<源文>`，非 `p` 块带 `[t=..]`/`[segs=N]`/`[HREF]` 标记） |
| `recover-r9-dispatch.mjs <slug.pN>` | 打印首/末块 `src8` 与 `multiSegBlocks`/`tableBlocks` 计数（派发前给子代理对照锚点） |
| `recover-r9-assemble.mjs <slug.pN> <out.jsonl>` | **按源结构确定性组装** → `src/content/en/<slug.pN>.json`；锚点/块数/片段数/href/CJK/空译/占位符全校验，失败**拒收且不留文件** |
| `recover-r9-scan.mjs <slug> [pN…]` | 占位符 / 空块 / 无字母块扫描 |
| `audit-slices-runtime.mjs <slug> <pN…> [--dump=abs]` | 缺陷类 E 判据入口：结构 + 重复 + **逐块长度比离群** |

## 3. 翻译流水线（B 期验证：51 片零结构错位）

```bash
# 1) 确认队列（唯一权威）
node scripts/task-plan.mjs 120

# 2) 生成缺口源（同一 slug 多个区间必须分多次进程调用，否则撞 part 号）
node scripts/gap-prep.mjs "<slug>:<a>-<b>"      # → build/slices/<slug>.pN.src.json

# 3) 编号源 + 锚点清单
node build/mksrc.mjs <slug.pN>
node build/recover-r9-dispatch.mjs <slug.pN>

# 4) 一条消息并行派 8 个子代理：每个只写 build/<slug.pN>-out.jsonl
#    每行 {"n":<0..N-1>,"src8":"<源块去空白前8字>","en":"<英文>"}；n 不重不漏
#    提示词模板见 scripts/DISPATCH.md（+ B-PHASE-HANDOFF §5 的防漂移三行）

# 5) 父代理组装（结构一律取自源，错位在构造上不可能发生）
node build/recover-r9-assemble.mjs <slug.pN> build/<slug.pN>-out.jsonl

# 6) 收尾（顺序不可换）
node scripts/verify-slices.mjs <本轮全部分片>            # 必须全 ok / ok(big)
node scripts/coverage.mjs <slug>                          # uncovered_blocks=0 且 bad=0
node build/audit-slices-runtime.mjs <slug> <pN...>        # 必须 all clean
node build/recover-r9-scan.mjs <slug>                     # 必须 clean
git add <各分片，显式文件名> && git commit -m "EN: … shards"
node scripts/merge-parts.mjs <slug>                       # 会删掉它合并的分片 → 必须在提交之后
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en && git commit -m "EN: … merge"
git show --stat --oneline HEAD ; git status --porcelain   # 双向核对
```

**`meta` 规则**：源切片里有 `zhAuthor` 才写 `author`。`head=Y` 的片若被 `scripts/meta-scan.mjs` 命中，
**先删 `src/content/articles/<slug>.json` 的 `author`**（改源，不是改 en）再 `gap-prep`。

## 4. 必须遵守的坑（全部实测；细节见 `B-PHASE-HANDOFF.md` §3）

1. **〔最危险〕`merge-parts` 会删除它合并的分片** → 固定顺序：先 `git add` 全部分片 → 再 merge → 再提交。
   `git add A B` 只要有一个路径不存在，**整条 add 失败**，随后 `git add -u` 只暂存删除 → 提交里只有删除没有新增。
   每次提交后 `git show --stat` + `git status --porcelain` 双向核对。
2. **`plan-slices.mjs` 与 `slice-plan.mjs` 同名互覆**：`slice-plan.mjs` 是生成器（会覆盖 `slice-plan.json`）；
   日常只跑审计器 `plan-slices.mjs`。**两者都必须保留**——`task-plan`/`coverage`/`merge-parts`/`plan-slices`
   四个脚本都读 `slice-plan.json`，删掉它就是本轮实测的 ENOENT。
3. **取回历史分片只能用 `Set-Content -Encoding utf8` + Node 去 BOM**；`git show > file` 在 PowerShell 里写 UTF-16，JSON 非法。
4. **`merge-parts` 只看 `firstBlock` 连续性，不看文件名**：完全嵌套的孤儿分片会被静默跳过（`[merged] N blocks` 却漏块）。
5. **子代理自报不可信**：必须逐块核对 `n` 覆盖（`lines/min/max/uniq` **不够**，要查 missing 集合）。
   实测子代理会「只写了一部分就正常结束回合」（B 期 `043 p27` 只写了 16/120）。补写要让它写**新文件**（`-tail.jsonl`），
   父代理按 `n` 合并去重后再组装。**同一分片绝不允许两个代理同时写。**
6. **`verify-slices` + `coverage` 全绿 ≠ 译完**：块内截断、占位符、空块只有 `audit-slices-runtime` 的**逐块长度比**能抓
   （B 期 `205 p6` n=24、`043 p37` n=106 各 1 处）。判据：`EN/ZH` 超出同片中位 2.5×/0.4×；
   **报警必须回看 ZH 块**——源文自身重复/叠句/偈颂重出/源文损坏都会合法离群。
7. **禁用字符只限 CJK 汉字 + 全角**（`【】〔〕《》（）「」、。，！？：；`）。
   `“ ” ‘ ’ — · …` **允许且推荐**（历史 bug：误禁导致 ASCII `--` 满天飞）。
8. **`InlineSegs` 是无分隔符拼接**：英文片段边界必须自带空格。中文源本身也把
   `["一、无门为法门"]["二、五法三自性"]` 存成两片段（中文无感），EN 照抄会渲染成 `Gate2. The Five…`。
   **实测 253/277 篇有此类接头，多数源自既有分片** → 见 `NEXT-PLAN.md` §4（先定策略再动手）。
9. **子代理两个真陷阱**：`write` 在「字符串以 `”` 结尾」时可能静默吞掉收尾双引号（读回渲染正常，肉眼看不出）→
   必须真的 `JSON.parse`；大 `write` 可能静默少写/多写数组元素 → 分小批写 + 每步核验。
10. **不要把「中文+机翻兜底」当已翻译**：`validate-en` 只认 `en/` 文件。

## 5. 脚本速查

| 脚本 | 用途 |
| --- | --- |
| `task-plan.mjs [maxBlocks]` | 生成任务队列（唯一权威的「还剩多少」） |
| `plan-slices.mjs` | 切片计划**审计**（只跑这个，不要跑生成器 `slice-plan.mjs`） |
| `coverage.mjs [slug]` | 每篇覆盖% / 缺口区间 / 孤儿分片（merge 后整篇不再计分片，显示 0% 属正常） |
| `gap-prep.mjs <slug>[:a-b]` | 预提取缺口源文 → `build/slices/<part>.src.json` |
| `verify-slices.mjs <part…>` | 分片核验（含 `JSON.parse`），必须 `ok` |
| `merge-parts.mjs <slug…>` | 按 firstBlock 连续拼接为整篇，**并删除分片** |
| `validate-en.mjs` | 全库校验：`ok` / `crit` / `warn` / `parts` |
| `repair-json.mjs` | 清 BOM 与字符串内裸控制字符 |
| `scan-mojibake.mjs` | 乱码扫描（现状 0） |
| `meta-scan.mjs` | 作者/元数据缺陷清单（改中文源） |
| `name-scan.mjs` | 人名/译名一致性扫描 |
| `build-catalog-en.mjs` | 由 `en/*.json` 汇总 `catalog-en.json` |
| `fix-mojibake.mjs` | CP1252→UTF-8 乱码修复 |
| `migrate.mjs` | 旧站 HTML 迁移（历史，一般不动） |
| `fetch-*.mjs` / `merge-lingqi.mjs` | 媒体与灵棋经抓取/合并（内容侧，按需） |

**常用校验**：`npm run typecheck`（tsc）可跑；`npm run build`（vite）在受限沙箱会因 `spawn EPERM` 失败，本地可跑。

## 6. 历史

- A 期（R1-R10 等，5 片/轮）与 B 期（R1-R12，8 片/轮）的完整实测、时间台账、每轮缺陷与处置，
  全部归档在 `scripts/B-PHASE-HANDOFF.md`（含 §6 时间台账：B 期 395 min / 18 篇）。
- 已删除的过期文档（`NEXT.md`、`PLAYBOOK.md`、`WEEKEND-PLAN.md`）仍在 git 历史里；
  其中仍有效的条目已并入本文件与 `NEXT-PLAN.md`。
