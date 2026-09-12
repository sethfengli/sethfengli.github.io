# 下一轮计划（翻译已完成，剩下的是「修缺陷 + 一致性」）

> 生成于 2026-09-12（B 期收尾后）；**§1-§4 已于同日的「缺陷修复轮 1」完成**；
> **§6 的 ②③①④ 已于「缺陷修复轮 2」完成**（计划 `scripts/DEFECT-ROUND-2-PLAN.md`，32 个提交；
> 实测回填见 `RESUME.md` §1.1）。**§6.1 的 (b)(e) 已于「缺陷修复轮 3」完成**（18 个提交，实测见 `RESUME.md` §1.2）。
> **§6.1 剩余候选 = (c)(d) 音标/专名第二轮 + (c-2) 两处真错字 + (f) 站点构建**（(c) 的大小写口径**已定**，见该节）。
> 背景见 `RESUME.md`，翻译轮实测见 `B-PHASE-HANDOFF.md`。
> **本文件末尾有一段可直接复制给新对话的启动提示词。**
> 所有数字均为本仓库实测；命令可直接复制执行。

## 0. 一句话结论

**翻译已经全部做完**（`task-plan` 0 篇 / 0 任务），**已交付内容的硬缺陷也全部修完**：
`validate-en` 现为 **ok=294 crit=0 warn=0 parts=0**。下表 1-11 项均已完成并逐条提交；
§6.1 的 **(b) 可疑 author（18 篇）与 (e) 生成器 prune 也已于「缺陷修复轮 3」完成**；
剩余候选见 §6.1 (c)(d)(f)。

| # | 事项 | 类型 | 规模 | 风险 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | `303liuzutanjing` ±1 错位 | crit | 删 1 块 + 译 1 块 | 低 | ✅ 完成 `e9a84bd` |
| 2 | `068xiangxujs` 25 块残留 | crit | 25 块 | 低 | ✅ 完成 `d01c18f` |
| 3 | `101yebunengxi` 8 块残留 | crit | 8 块 | 低 | ✅ 完成 `aae8c16` |
| 4 | 11 篇 `warn` 行内片段数不符 | warn | 实测 **42 块** | 低 | ✅ 完成（13 个提交） |
| 5 | 248 篇「片段接头丢空格」 | 显示层 | 全库 | 中 | ✅ 完成（渲染层，`55d448c`+`aa5017d`） |
| 6 | `author` 源数据缺陷残留 | 数据 | 实测 **16 条** + 轮 3 的 **18 条** | 低 | ✅ 轮 2 + **轮 3** 完成（轮 3 = §6.1(b)，17 改 + 1 保留；meta-scan 13 条**全是真署名**，见 §6.1(a)(b)） |
| 7 | 音标/专名风格分叉 | 一致性 | 实测 185 篇 | 中 | ✅ 轮 2 完成（口径 = **统一带变音符**，7,956 处） |
| 8 | `catalog-en.json` 与 `en/*` 对账 | 数据 | 294 条 | 低 | ✅ 轮 2 完成 + **轮 3 加 prune**（差异 **0**；生成器已能自愈，见 `RESUME.md` §4.12） |
| 9 | `build/` 与 npm cache 残留 | 卫生 | — | 无 | ✅ 已完成（见 §5） |
| 10 | 6 个孤儿 `en/*.pN.json` | 卫生 | 6 文件 | 低 | ✅ 轮 2 完成（`parts` 6→**0**，`ok` 288→294） |
| 11 | `scan-mojibake` 漏检 C4/C5/E1 | crit（隐蔽） | en 里 5 处 | 低 | ✅ 轮 2 完成（修检测器 + 修数据，见 `RESUME.md` §4.13） |

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

## 6. 其它待办 —— ✅ 轮 2 已全部完成

> 完整执行计划（含命令、预期输出、回退、逐篇 author 判定表）在 `scripts/DEFECT-ROUND-2-PLAN.md`，
> 已按 ② catalog → ③ 孤儿文件 → ① author → ④ 音标 执行完毕（32 个提交，实测回填见 `RESUME.md` §1.1）。
> 下表仅为结果索引；**§6.1 的 (b)(e) 已由轮 3 完成，剩余候选见 §6.1 的 (c)(c-2)(d)(f)**。

| 事项 | 轮 2 后现状 | 结论 |
| --- | --- | --- |
| `author` 源数据缺陷 | meta-scan **16 → 5**（5 条全是真实署名，见 §6.1(a)） | 14 篇已改（逐篇 1 个提交）；另有 10 篇 en 署名同步 |
| 音标/专名风格 | 已统一**带变音符**（`en/*` 7,952 处 + `verses.ts` 4 处） | 计划里的 10 组全部归零；同类剩余见 §6.1(c)(d) |
| `catalog-en.json` 对账 | 与 `en/*` 差异 **0**（294 条） | 生成器是合并式、不删键 → 建议加 prune，见 §6.1(e) |
| 6 个孤儿 `en/*.pN.json` | **已删净**（0） | 删除前已验证其块都含在整篇里（3 个逐字节相同，3 个整篇是修过的后续版本） |
| 站点侧 | `npm run typecheck` 通过；`npm run build` 在受限沙箱 `spawn EPERM` | 本地跑 `npm run build` 出 `dist/` 后发布 |

### 6.1 候选清单（**轮 3 已完成 (b)(e)；剩余 (c)(c-2)(d)(f)**）

**(a) meta-scan 的 5 条「已知合法」误报**（判据：`author` 恰好等于某个正文块开头，而那个块就是署名块本身 → `RESUME.md` §4.14）：

`010dzjcy 明德 编`、`028baofufa 聂云台`、`186hanshandashideyisheng 宋智明 原编述`、`246henghedashouyin 元音老人`、`302xinj 湛然 注`。
→ **不要再删**（都是真署名）；若要让扫描报 0，需给扫描器加「纯署名块」白名单（改 `scripts/`，需批准）。
> **轮 3 后该清单变为 13 条**（新增 8 条全是我把错值改成真名后产生的**假阳性**）：
> `002baiyunxy 刘洙源`、`011errusx 湛然`、`012liuzutanjing_kp 法海`、`019xinnzy 彻悟大师`、
> `088linzhongshinianxiangxu 湛然`、`091wuyalishenghuo 艾克哈特·托勒`、`193guanwuliangshoufojingjijie 会性法师`、
> `292wuzhongzuiqiangdadeliliang 顶果钦哲仁波切`。**逐条复核后全部是真署名，一条都不要改**
> （判据与成因见 `RESUME.md` §4.17）。

**(b) meta-scan 抓不到、但同类的可疑 `author`** —— ✅ **已由「缺陷修复轮 3」完成**（18 篇：17 改 + 1 保留）。

> 实测见 `RESUME.md` §1.2。§6.1(b) 原列 12 条**全部是缺陷**（书名/品名/正文短语/角色语，没有一条是真人），
> 另加实测新发现的 **6 条同类**（`269`、`292`、`011`、`012`、`239`、`056`），共 18 篇。
> **`049kulianyiwan` 的 `同人于野` 是真人笔名，保留不改**；`082`/`109`/`269` 无作者可考 → 置空。
> 原列条目与处置：`002baiyunxy 但看自心`→刘洙源、`019xinnzy 业不能系`→彻悟大师、
> `082 …第十八愿`→置空、`088 …要以深信切愿`→湛然、`092 …第十八愿`→湛然、`109 …就像溺水的人`→置空、
> `170 …王凤仪嘉言录`→王凤仪、`193 …正宗分`→会性法师、`212frame …金刚经精解`→鸠摩罗什、
> `091 …宁静在说话`→艾克哈特·托勒、`236 …一个新世界`→艾克哈特·托勒。
> ⚠ `meta-scan` 命中数由 5 **升到 13**，**这是假阳性副作用、不是回归**（判据见 `RESUME.md` §4.17）。

**(c) 音标第二轮：同类混合对**（轮 2 只做了计划里的 10 组 + 同词族；下表为轮 2 后的 file 计数，**轮 3 未做**）

> **⚠ 用户已定口径（轮 3 确认，下轮直接用，勿再问）**：**只统一变音符、保留原有大小写分布**——
> 即 `paramita`→`pāramitā`、`Paramita`→`Pāramitā`，**不**把句首/句中大小写拉平。
> 实测两套并存正是这个原因：`pāramitā`=779 / `Pāramitā`=38；`saṃsāra`=144 / `Saṃsāra`=8。
> 该口径的好处：去空白后仅变音符不同，逐块复核最容易。下轮**不要**再改成全小写或全大写。
> href 守卫已复核：目标词在 href 中出现 **0** 次。

| 词 | 实测（**轮 3 重测**，`\b` 整词） |
| --- | --- |
| `pāramitā` 系 | `pāramitā`=779 `paramita`=**258** `Pāramitā`=38 `Paramita`=**120**（ASCII 侧共 **378**；另有 `paramitas`/`Pāramitās`，与 `Prajñāpāramitā` 复合词共用计数） |
| `Subhuti` 系 | `Subhuti`=**1251** / `Subhūti`=327（共 1,578；ASCII 侧 19 篇） |
| `Śāriputra` 系 | `Śāriputra`=515 / `Sariputra`=**447** / `Sāriputra`=**36**（后两者都要改，共 483） |
| `Mahayana` 系 | `Mahayana`=**298** / `Mahāyāna`=270 / `mahayana`=**2** |
| `Avalokiteśvara` | `Avalokiteśvara`=137 / `Avalokitesvara`=**98** |
| `Mañjuśrī` | `Mañjuśrī`=166 / `Manjusri`=**39** / `Mañjusri`=**13** |
| `saṃsāra` | `saṃsāra`=144 / `samsara`=**70** / `Saṃsāra`=8 / `Samsara`=**7** |
| `Kṣitigarbha` | `Kṣitigarbha`=36 / `Ksitigarbha`=**99** |
| `Tripiṭaka` | `Tripiṭaka`=56 / `Tripitaka`=**137** / `tripiṭaka`=**1** |
| `Nāgārjuna` | `Nāgārjuna`=53 / `Nagarjuna`=**30** |
| `prajñāpāramitā` 残留 | `Prajñāpāramita`=**1**（少一个 `ā`，**真错字**，可单独修） |

> ASCII→变音符合计约 **2,905 处 / ~169 个文件**（轮 3 实测）。**本轮未做**（用户只选了 (b)+(e)）。

**(c-2) 轮 3 顺带发现的两处「真错字」，不是风格分叉，本轮未改（不在批准范围，留待下轮）**：

- `043mengyouji` 里 `Paramiti` **2 处**（"Tripiṭaka Master Paramiti brought the Śūraṅgama Sutra"）：`Paramiti` 是
  9 世纪印度僧人 `Pāramiti`（般剌密谛）的**拼写错误**，规范形为 **`Pāramiti`**。
- `Prajñāpāramita` **1 处**：缺末尾 `ā`，应为 `Prajñāpāramitā`。

**(d) 长专名规范化**（`\b` 刻意跳过，与 (c) 属同一类但改的是专名本身；**轮 3 重测**）：

`Siksananda`=6 / `Shikshananda`=1（同一人两种拼法）、`Prajnatara`=6 / `Prajnadhara`=1（同为禅宗二十七祖）、
`Sakyamunindra`=2、`Anandatta`=1、`Vajrasamadhi`=1、`Mahaprajna Paramita`=4（同一经名的另一种写法）。
**注**：这些也是 `name-scan` 报「3 篇混合」的来源，但那 4 处是**裸子串假阳性**（`RESUME.md` §4.14），与 (d) 是两件事。

**(e) `build-catalog-en.mjs` 加 prune** —— ✅ **已由「缺陷修复轮 3」实现**（`scripts/build-catalog-en.mjs`）。

> 合并后删掉「en 侧无值」的 `title`/`author`/`excerpt`；输出含 `M stale fields pruned`，**M 应恒为 0**。
> 实测：对已对账的库是 **no-op（0 pruned）**；把 `en/170buyuanren.json` 的 author 行删掉后重建 → `1 stale field pruned`
> 且 catalog 该键消失，还原后重建 → 恢复原值且键序不变。细节与坑见 `RESUME.md` §4.12。

**(f) 站点侧**：`npm run build` 在本机跑出 `dist/` 后发布（受限沙箱里 `spawn EPERM`）。

**(g) 轮 2 用过的转换脚本已按「临时件自删」规则删除**（`build/` 复原为原 5 个复用脚本）：
做 (c)/(d) 时需要重写一个等价脚本，或先批准把它固化为 `scripts/unify-variants.mjs`。它必须包含三条硬约束：
① 只按 `\b` 整词替换、长词形优先；② **href 硬守卫**（任何目标词出现在 href 里就中止）；③ 逐文件复核
「块数 / 块签名 / href 多重集不变 + 不引入乱码」（`validate-en` 已覆盖前两项，仍建议同时跑）。
替换统计与分组提交的实测数字见 `RESUME.md` §1.1、§4.16。

---

## 7. 给新对话的启动提示词（复制这一段）

> 注意：§1-§5 与缺陷修复轮 1+2+3 均已完成，`validate-en` 已是 `ok=294 crit=0 warn=0 parts=0`
> （轮 3 = §6.1 的 (b) 18 篇可疑 author + (e) 生成器 prune）。以下提示词对应「下一轮」；
> 剩余候选 = §6.1 的 **(c)(d) 音标/专名第二轮**（(c) 的大小写口径**已定**）、**(c-2) 两处真错字**、**(f) 站点构建**。
> ⚠ 提示词里**已不再把 (b)(e) 列为候选**；`meta-scan` 的期望值现在是 **13**（不是 5，也不是 0）。
> 请按当时 `RESUME.md` §1 的实测数字自行调整。

```
继续 huideng-chanlin 项目（D:\FengLi\Web\fou\huideng-chanlin）。翻译已完成（A+B 期 29 篇，task-plan 0 任务），
前三轮「缺陷修复轮 1/2/3」已把 validate-en 修到 ok=294 crit=0 warn=0 parts=0、catalog-en 与 en/* 差异 0、
音标统一为带变音符、18 篇可疑 author 修正、build-catalog-en 加上 prune
（详见 scripts/RESUME.md §1、§1.1、§1.2 与提交历史）。
先读 scripts/RESUME.md（状态/目录/流水线/坑，尤其 §4.3 的编码坑、§4.11 的片段数对齐判据、
§4.12 生成器 prune、§4.13 乱码检测器指纹、§4.15 author 两侧独立、§4.17 meta-scan 是待复核清单、
§4.18 正文在 inline[].s、§4.19 en/* 缩进行尾不统一且 git status 有 CRLF 噪声）、
scripts/NEXT-PLAN.md §6.1（剩余候选）与 scripts/B-PHASE-HANDOFF.md §3-§4。

本轮范围请在动手前先跟我确认（剩余候选：§6.1(c)(d) 音标/专名第二轮——口径已定为「只统一变音符、
保留原有大小写分布」；§6.1(c-2) 两处真错字 Paramiti→Pāramiti ×2、Prajñāpāramita→Prajñāpāramitā；
§6.1(f) 站点构建）。

纪律：改动后必跑 node scripts/repair-json.mjs && node scripts/validate-en.mjs && node scripts/scan-mojibake.mjs；
每个 slug 单独提交，提交后 git show --stat --oneline HEAD 与 git status --porcelain 双向核对；不要 push。
双向核对若遇 git status 报 M 但 git diff --numstat 为空，用 git hash-object <f> 对比 git rev-parse HEAD:<f> 判定（CRLF 噪声）。
**含中文的文件一律不要用 PowerShell Set-Content 回写**（会双重编码，见 RESUME.md §4.3），用 node writeFileSync 或 edit 工具。
改单个字段用行级外科编辑、禁止整文件重序列化（en/* 缩进行尾不统一，见 RESUME.md §4.19）。
临时件只许放 build/ 并自删，禁止写 scripts/（除非我同意新增）；诊断只在会话末写一次。
会话末：回填 scripts/RESUME.md §1 的实测数字并更新 scripts/NEXT-PLAN.md（划掉已完成项），提交 docs: …
```
