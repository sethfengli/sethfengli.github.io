# 下一轮计划（翻译已完成，剩下的是「修缺陷 + 一致性」）

> 生成于 2026-09-12（B 期收尾后）；**§1-§4 已于同日的「缺陷修复轮」完成**（见下表与各节末的「已完成」）。
> 背景见 `RESUME.md`，翻译轮实测见 `B-PHASE-HANDOFF.md`。
> **本文件末尾有一段可直接复制给新对话的启动提示词。**
> 所有数字均为本仓库实测；命令可直接复制执行。

## 0. 一句话结论

**翻译已经全部做完**（`task-plan` 0 篇 / 0 任务），**已交付内容的硬缺陷也全部修完**：
`validate-en` 现为 **ok=288 crit=0 warn=0**。下表 1-4 项已完成并逐篇提交；5-9 项为可选打磨。

| # | 事项 | 类型 | 规模 | 风险 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | `303liuzutanjing` ±1 错位 | crit | 删 1 块 + 译 1 块 | 低 | ✅ 完成 `e9a84bd` |
| 2 | `068xiangxujs` 25 块残留 | crit | 25 块 | 低 | ✅ 完成 `d01c18f` |
| 3 | `101yebunengxi` 8 块残留 | crit | 8 块 | 低 | ✅ 完成 `aae8c16` |
| 4 | 11 篇 `warn` 行内片段数不符 | warn | 实测 **42 块** | 低 | ✅ 完成（13 个提交） |
| 5 | 248 篇「片段接头丢空格」 | 显示层 | 全库 | 中 | ✅ 完成（渲染层，`55d448c`+`aa5017d`） |
| 6 | `author` 源数据缺陷残留 | 数据 | ? 处 | 低 | 未做（meta-scan 实测后再定） |
| 7 | 音标/引号风格分叉 | 一致性 | 63 篇混合 | 中 | 未做（先定口径） |
| 8 | `catalog-en.json` 与 `en/*` 对账 | 数据 | 1 次 | 低 | 未做 |
| 9 | `build/` 与 npm cache 残留 | 卫生 | — | 无 | ✅ 已完成（见 §5） |

---

## 1. `303liuzutanjing` ±1 错位 —— ✅ 已完成（`e9a84bd`）

**实测证据**（勿再按「重译 555-822」估算，那是错的）：

| 检查 | 结果 |
| --- | --- |
| 块总数 | ZH 1530 / EN 1530（相等） |
| `en[i] ↔ zh[i-1]`（`t` + 片段数） | **551..822 全部 272/272 成立，0 例外** |
| 多余块 | `en[550]` 与 `en[551]` 都是 `zh[550]`（「问：达摩初见梁武帝…」）的译文 → **删 `blocks[551]`** |
| 缺失块 | 缺口正是 **`zh[822]`**（`善知识！自心归依自己本性（自性佛）…`，单块 `p`） |
| href 症状 | 丢的 `/articles/152sizukaishifarong` 实际在 `en[672]`＝`zh[671]` 的译文 → **同一错位的症状，不用单独修** |

**实际做法（比原计划更保守）**：老 `en[822]` **已经是 `zh[821]` 的正确译文**（`t=quote`），
所以正确操作是**纯插入**——删 `blocks[551]`，把 `zh[822]` 的译文插入为新的 `blocks[822]`；
`555..822` 一个字节都不重译，整段只滑动一格（`551..821` == 旧 `552..822`，逐块核对为真）。
校验：1530 块、`t`+片段数与 ZH **0 处不符**、11 个 href 全部对齐。
`zh[822]` 是白话注解（无 `【】`），故不加方括号（方括号只包经典原文）。

## 2. `068` / `101` 的残留 —— ✅ 已完成（`d01c18f` / `aae8c16`）

**重要更正**：这两篇**不是「部分翻译」**。实测 25 块 + 8 块里**汉字数为 0**，
残留只是 CJK 标点（`〔〕`：22 处；`（）` 3+3；`【】` 2+2），即排版脏、不是缺译。
`validate-en` 的 CJK 正则只认 `【】〔〕《》` + 汉字，所以这两篇**报 crit 的其实只有 8+8 块**，
而更宽的全角扫描能看到 25+8 块。

**做法**：确定性标点归一（`〔〕`→`[]`、`【】`→`[]`、`（）`→`()`、`？`→`?` 等），
只改这 25+8 块；块数/`t`/片段数/href 全不变，非列入块逐字节不变，改完整篇去空白内容不变。

## 3. 行内片段数不符 —— ✅ 已完成（13 个提交）

`validate-en` 旧报：`013zhufasx 032xyxing 052wangshengyuanli 088linzhongshinianxiangxu 103yjy 105wangfengyijiayanlu 151sizuanxingyaomen 186hanshandashideyisheng 193guanwuliangshoufojingjijie 204danian 240yinguangdashilunhuijiben`

**实测块数（不是 12 块，是 42 块）**：

| slug | 不符块数 | 块号 |
| --- | --- | --- |
| `013zhufasx` | 1 | 66 |
| `032xyxing` | 1 | 28 |
| `052wangshengyuanli` | 1 | 38 |
| `088linzhongshinianxiangxu` | 2 | 96,112 |
| `103yjy` | **22** | 93-101,103-106,108-111,113-117 |
| `105wangfengyijiayanlu` | 1 | 182 |
| `151sizuanxingyaomen` | 2 | 22,49 |
| `186hanshandashideyisheng` | 7 | 485,491,492,493,494,497,501 |
| `193guanwuliangshoufojingjijie` | 2 | 73,92 |
| `204danian` | 1 | 194 |
| `240yinguangdashilunhuijiben` | 2 | 23,27 |

**形态**：`103yjy` 22 块是 en 存成 **1 个片段**而 zh 有 2..52 个（分段丢失）；
其余篇多是「中文把标点/注音独立成片段、英文合并了」。做法一律是**只重排片段边界**：
不删改词、只在边界插空格，`去空白后与改动前逐字节相同`。`103yjy` 一共产出 543 个片段。
（跨块安全的做法见 `RESUME.md` §4.11 的 5 条判据。）

## 4. 片段接头空格 —— ✅ 已完成（渲染层；`55d448c` + `aa5017d`）

**决策**：用户确认采用**修法①渲染层按需插空格**（不是数据层批量改、不是渲染后正则归一化）。
`src/components/reader/ArticleBody.tsx` 的 `InlineSegs`：相邻非 href 片段之间，
当`上一片段末字符 ∈ [词尾 / 句读标点 / 闭引号]`且`下一片段首字符 ∈ [词首 / 开引号 / 开括号]`时补一个空格。

**实测**：英文 **248 篇**受影响、补 **15,548** 处；中文正文 **0 处**（规则按 `lang === 'en'` 门控）。
**必须保持不动的接头**（规则已覆盖为 false）：`(`+`701`、`·`+`Chapter`、`“`+`Each month`（开引号后直接接词）。
**踩过的坑**：首版规则让 `.”`+`“The`（相邻对话）仍然粘住，父代理独立复验后把 `“`/`‘` 补进「段首集合」。


## 5. 已完成 / 已清理（本轮）

- `build/` 只保留 5 个复用脚本（`mksrc`、`recover-r9-{dispatch,assemble,scan}`、`audit-slices-runtime`），
  已删除 A/B 期全部已 merge 的 `slices/*.src.json` 与编号源/JSONL 脚手架（`build/` 现 5 文件）。
- 删除过期文档 `scripts/NEXT.md`、`scripts/PLAYBOOK.md`、`scripts/WEEKEND-PLAN.md`（git 历史仍可追）；
  仍有效的条目已并入 `RESUME.md` / 本文件。
- 删除失效脚本 19 个：`audit-slices`、`make-agent-tasks`（+`agent-tasks.json`）、`pick-next`、`prep-slices`、
  `analyze-eta`、`fix-261-boundary`、`fix-303-hanzi`、`fix-502-author`、`diag-303`、`check-parts`、`check-assets`、
  `smoke`、`serve-dist`、`overlap`、`normalize-fw`、`quote-scan`、`fix-dashes`、`reorder-photos`（共 18 个脚本 + 1 个 json）。
- ⚠ **保留 `slice-plan.json` + `slice-plan.mjs`**（虽然它们是「生成器 + 计划快照」）：
  `task-plan.mjs` / `plan-slices.mjs` / `coverage.mjs` / `merge-parts.mjs` **四个脚本都读 `slice-plan.json`**，
  删掉会让整条队列/覆盖链路报 ENOENT（本轮已实测并回滚）。**只跑审计器 `plan-slices.mjs`，不要跑生成器 `slice-plan.mjs`。**
- 删除仓库里的 `x.json`（0 字节空文件）并 untrack 误入库的 `.npm-cache/`（13.6 MB）。

## 6. 其它待办（低优先，实测定量后再说）

> **这些剩余项的完整执行计划（含命令、预期输出、回退、逐篇 author 判定表）已单独写在
> `scripts/DEFECT-ROUND-2-PLAN.md`**，按 ② catalog → ③ 孤儿文件 → ① author → ④ 音标 的顺序执行。
> 下表仅为索引。

| 事项 | 现状 | 建议口径 |
| --- | --- | --- |
| `author` 源数据缺陷 | `meta-scan.mjs` 报出的清单需**重跑确认**（B 期已修 `187`/`025`/`043`） | 命中就删 `src/content/articles/<slug>.json` 的 `author`（不要改 en） |
| 音标/引号风格 | `name-scan.mjs`：**63 篇有混合变体**（如 `nirvana/nirvāṇa` 同篇并存） | 先定「带变音符」为唯一口径，再按篇批量替换 |
| `catalog-en.json` 对账 | 由 `en/*.json` 汇总 | 跑一次 `node scripts/build-catalog-en.mjs` 并核对差异 |
| 6 个孤儿 `en/*.pN.json` | `011errusx.p1`、`087benyuanfamen.p1`、`121foshuoemituojingzhu.p2`、`131chanjingzongshi.p2`、`145zhengdingzhiye.p1`、`257nizhuanshuailao.p2` 在 `articles/` 里没有同 slug 源，`loadArticleForSlug` 返回 null，故永不渲染 | 确认无用后删除（本轮未动，`validate-en` 的 `parts=6` 即指它们） |
| 站点侧 | `npm run typecheck` 通过；`npm run build` 在受限沙箱 `spawn EPERM` | 本地跑 `npm run build` 出 `dist/` 后发布 |

---

## 7. 给新对话的启动提示词（复制这一段）

> 注意：§1-§5 已完成，`validate-en` 已是 `ok=288 crit=0 warn=0`。以下提示词对应「下一轮」，
> 请按当时 `RESUME.md` §1 的实测数字自行调整；若只想打磨，直接做 §6 的低优先项。

```
继续 huideng-chanlin 项目（D:\FengLi\Web\fou\huideng-chanlin）。翻译已完成（A+B 期 29 篇，task-plan 0 任务），
上一轮「缺陷修复轮」已把 validate-en 修到 ok=288 crit=0 warn=0（详见 scripts/RESUME.md §1 与提交历史）。
先读 scripts/RESUME.md（状态/目录/流水线/坑，尤其 §4.3 的编码坑与 §4.11 的片段数对齐判据）、
scripts/NEXT-PLAN.md（§6 剩余待办）与 scripts/B-PHASE-HANDOFF.md §3-§4。

本轮范围请在动手前先跟我确认（候选：§6 的 author 源数据、音标口径、catalog-en 对账、孤儿 pN 文件）。

纪律：改动后必跑 node scripts/repair-json.mjs && node scripts/validate-en.mjs && node scripts/scan-mojibake.mjs；
每个 slug 单独提交，提交后 git show --stat --oneline HEAD 与 git status --porcelain 双向核对；不要 push。
**含中文的文件一律不要用 PowerShell Set-Content 回写**（会双重编码，见 RESUME.md §4.3），用 node writeFileSync 或 edit 工具。
临时件只许放 build/ 并自删，禁止写 scripts/（除非我同意新增）；诊断只在会话末写一次。
会话末：回填 scripts/RESUME.md §1 的实测数字并更新 scripts/NEXT-PLAN.md（划掉已完成项），提交 docs: …
```
