# 英文翻译续作指南

> 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`。**A 期已完成**，本文件只保留 B 期所需内容。

## 1. 当前状态（2026-09-13 实测）

| 指标 | 值 |
| --- | --- |
| `validate-en` | **ok=257 crit=6 warn=11 parts=20** |
| `scan-mojibake` | **0 / 307** |
| A 期队列 `task-plan.mjs 120` | **0 篇 / 0 块 / 0 任务**（可派 0、被挡 0）→ **A 期收工** |
| 工作区 | 干净，全部已提交，**未 push** |
| 提交 | `88450c0`（303 汉字）、`b3e9c12`、`2afcf09`（A 期 6 篇）、`c309795` |

**crit 6 项归属**（全部非 A 期，勿在翻译轮里顺手改）：
`043mengyouji:missing`、`187hanshandashinianpushu:missing`、`239wuliangshoujing-jiaohuibenzhu-zhu:missing`（以上 B 期）、
`068xiangxujs:cjk`、`101yebunengxi:cjk`、`303liuzutanjing:block555-822`（±1 错位）→ 后三项见 §5 周末专项。

## 2. B 期范围（实测 18 篇 >300KB）

共 **10.5MB / 24,491 块**。**这些篇目前没有 `en/` 分片、也不在 `slice-plan.json` 里**。

| 大小 | 块数 | slug |
| --- | --- | --- |
| 2146KB | 4480 | `043mengyouji` |
| 1218KB | 2224 | `205jgj-jiangyi` |
| 739KB | 1627 | `025taishanggy-yw` |
| 709KB | 371 | `102lfsx` |
| 598KB | 695 | `246henghedashouyin` |
| 514KB | 1530 | `303liuzutanjing`（±1 错位待修，见 §5） |
| 440KB | 1184 | `301jgj` |
| 432KB | 952 | `403chanjing` |
| 424KB | 1129 | `293jgj-zhu` |
| 421KB | 1124 | `190wuliangshoujingwuyiben` |
| 389KB | 889 | `016xdwsjwl` |
| 367KB | 2442 | `262dachengrulengqiejing` |
| 366KB | 859 | `001jznf` |
| 365KB | 880 | `187hanshandashinianpushu` |
| 359KB | 1035 | `239wuliangshoujing-huiyi` |
| 344KB | 814 | `001juezhichan` |
| 341KB | 1010 | `239wuliangshoujing-jiaohuibenzhu-zhu` |
| 309KB | 1246 | `047shengmingdcj` |

> **规模提示（务必先认账）**：24,491 块 ÷ 每任务 120 块 = **约 205 个任务**。
> 即使每轮 8 并行也要 **26 轮**；按 8 分钟/轮 ≈ **3.5 小时纯执行**，加核验/合并/提交约 **4–6 小时**。
> **B 期无法在一次对话里翻完**；「一轮」只能指「解锁 + 生成队列 + 跑完第一轮」。

## 3. B 期启动（照抄，顺序不可换）

```bash
# 1) 抬高 300KB 上限（4 个文件里的硬编码）
#    scripts/coverage.mjs:31        > 300*1024  →  > 30*1024*1024
#    scripts/plan-slices.mjs:63     DEFER_BYTES = 300*1024  →  30*1024*1024
#    scripts/make-agent-tasks.mjs:22 DEFER_BYTES = 300*1024  →  30*1024*1024
#    scripts/analyze-eta.mjs:25     > 300*1024  →  > 30*1024*1024
node scripts/slice-plan.mjs            # 2) 重新切片，B 期篇才会进入计划
node scripts/coverage.mjs              # 3) 确认 B 期篇出现、覆盖 0%
node scripts/task-plan.mjs 120         # 4) 生成 B 期任务队列（应约 205 个任务）

# 5) 每轮：同 slug 分多次进程调用预提取（否则撞 part 号）
node scripts/gap-prep.mjs <slug>              # 或 <slug>:<start>-<end>
node scripts/gap-prep.mjs <slug>:<start2>-<end2>
# 6) 一条消息并行派 8 个子代理（提示词 6 行，见 §4）
# 7) 最后一个任务结束后一条消息收尾（见 §4）
```

## 4. 标准操作（A 期已验证，照抄）

**派发提示词模板（只替换变量，6 行）**
```
读 scripts/DISPATCH.md 与 scripts/TRANSLATION-BRIEF.md。源 build/slices/<part>.src.json
 -> 输出 src/content/en/<part>.json。firstBlock=<n> blocks=<m> meta=<yes/no>。
 片段边界要自带空格（InlineSegs 无分隔符拼接）。写完自跑
 node scripts/verify-slices.mjs <part>.json 并迭代到 ok 为止。不要碰其它文件、不要跑 git。
```
- `meta` 规则：源里有 `zhAuthor` 才写 author，没有就不写。`head=Y` 的片若被 `scripts/meta-scan.mjs`
  命中，**先从 `src/content/articles/<slug>.json` 删掉 `author`** 再 `gap-prep`（改源文件，不是改分片）。
- 子代理另有 `scripts/DISPATCH.md`（硬性交付格式）与 `scripts/TRANSLATION-BRIEF.md`（质量规范）可读，
  提示词不必重复其中的要求。

**收尾（最后一个任务结束后，一条消息内）**
```
node scripts/verify-slices.mjs <本轮全部分片>
git add <各新分片，显式文件名>          # 必须在 merge 之前！见 §5.1
node scripts/merge-parts.mjs <本轮 100% 覆盖的 slug>
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en
git commit -m "EN: B round N - ..."
git show --stat --oneline HEAD ; git status --porcelain    # 双向核对
```
不要 push。有子代理在飞时只用 `merge-parts <slug>`（指定与在飞无关的篇），不要跑无参数版本。

## 5. 必须遵守的坑（精简版，全部实测）

1. **〔最危险〕`merge-parts` 会删除它合并掉的分片** → 「先合并、后提交」会永久丢文件。
   **固定顺序：先 `git add` 全部分片 → 再 `merge-parts` → 再提交。**
   另：`git add A B` 里只要有一个 path 不存在，**整条 add 失败**，随后 `git add -u` 只暂存删除，
   提交里就**只有删除、没有新增整篇**。每次提交后必须 `git show --stat` + `git status --porcelain` 双向核对。
2. **分片「多 1 块」会把 merge 卡在 100% 前一块**：实测 `261lengqiejing.p8` 覆盖 [919-1042]（124 块）
   而 `p9` 从 1042 起，报 `[gap] expect block 1043, got 1042` → `[fail] merged 1043/1050`。
   **块数看似只差几块，根因是重叠。** 列各分片 `firstBlock+块数` 找重复块（见 `scripts/fix-261-boundary.mjs`），
   按官方 `slice-plan` 边界删重复块；两文件译文不同时**以对齐 `zh[abs]` 原文者为准**。
3. **`gap-prep` 的「重复源」不是 bug，不要删**：`p7/p8`、`p12/p13`、`p2/p5`、`p4/p12`、`p2/p7` 等
   常见 byte-identical，是未派发的备用源。**派发前按 `firstBlock+块数` 去重。**
4. **同一 slug 的多个区间必须分多次进程调用**（`gap-prep` 一次调用内看不到自己刚写的 src，会撞 part 号）。
5. **子代理的两个真陷阱**：
   - `write` 工具在「字符串以弯引号 `”` 结尾」时**可能静默吞掉收尾的 JSON 双引号**，产出
     `Bad control character in string literal`，**读回渲染正常、肉眼看不出**。故必须真的 `JSON.parse`
     （`verify-slices` 会），不能只看渲染。
   - 大 `write` 可能**静默少写/多写数组元素**。对策：**分小批写 + 每步跑 `verify-slices`**。
6. **禁用字符只限 CJK 汉字 + 全角**（【】〔〕《》（）「」、。，！？：；）。
   `“ ” ‘ ’ — · …` **允许且推荐**，不要禁（历史提示词 bug：误禁导致 ASCII `--` 满天飞）。
7. **`InlineSegs` 是无分隔符拼接**，英文片段边界必须自带空格。**注意**：中文源本身也把
   `["一、无门为法门"]["二、五法三自性"]` 存成两片段（中文无需空格故无感），EN 照抄后渲染成
   `Gate2. The Five…` —— 实测 **253/277 篇**有此类接头，**多数源自既有分片，非本轮引入**。
   修法二选一（渲染层补空格 / 写 `fix-joins.mjs` 改 253 篇），**先定策略再动手**。
8. **`merge-parts` 只看 `firstBlock` 连续性，不看文件名**：旧网格孤儿分片（`p10/p20/p70`）只要区间连续就能并。
   但**完全嵌套的孤儿**会让 merge 失败（`[fail] merged N/N`）→ 先删被包含的孤儿再 merge。
9. **不要把「中文+机翻兜底」当已翻译**：`validate-en` 只认 `en/` 文件。

## 6. 周末专项（非 B 期，单独排期）

- **303liuzutanjing ±1 错位**：`en[i] === zh[i-1]` 在 i=551..822 **272/272 成立**，`en[551]` 多余、
  `zh[822]` 译文缺失，href 症状自愈。修法见 `scripts/WEEKEND-PLAN.md` §1，约 15 分钟。**不要顺手改。**
- **068xiangxujs（25 块）/ 101yebunengxi（8 块）的 CJK 残留**。
- **warn 11 项**（行内片段数，展示层无影响）：`013zhufasx`、`032xyxing`、`052wangshengyuanli`、
  `088linzhongshinianxiangxu`、`103yjy`、`105wangfengyijiayanlu`、`151sizuanxingyaomen`、
  `186hanshandashideyisheng`、`193guanwuliangshoufojingjijie`、`204danian`、`240yinguangdashilunhuijiben`。
- **音标统一 + 引号风格**：`scripts/quote-scan.mjs`、`scripts/fix-dashes.mjs`。
  已知分叉：`502zhenxinzhishuojingjie` 的 `p8` 用弯引号而 `p5/p7/p9` 用直引号；`261lengqiejing` 同理。
- **`author` 源数据缺陷**：`scripts/meta-scan.mjs` 报 21 处（多为「块首文字被当作者」，如 `105wangfengyijiayanlu`
  的 `author="前 言"`）。**改 `src/content/articles/*.json`，不是改 en。**
- **片段丢空格**（见 §5.7，253 篇）。

## 7. 脚本速查

| 脚本 | 用途 |
| --- | --- |
| `task-plan.mjs [maxBlocks]` | 生成任务队列（唯一权威的「还剩多少」） |
| `coverage.mjs [slug]` | 每篇覆盖% / 缺口区间 / 孤儿分片 |
| `gap-prep.mjs <slug>[:a-b]` | 预提取缺口源文 → `build/slices/<part>.src.json` |
| `verify-slices.mjs <part...>` | 分片核验（含 `JSON.parse`），必须 `ok` |
| `merge-parts.mjs <slug...>` | 按 firstBlock 连续拼接为整篇，**并删除分片** |
| `validate-en.mjs` | 全库校验：`ok` / `crit` / `warn` / `parts` |
| `repair-json.mjs` | 清 BOM 与字符串内裸控制字符 |
| `scan-mojibake.mjs` | 乱码扫描（现状 0） |
| `meta-scan.mjs` | 作者/元数据缺陷清单 |
| `overlap.mjs <slug>` | 某区间已被其它分片覆盖多少块 |
