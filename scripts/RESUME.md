# 慧灯禅院 · 英文翻译工程（状态 + 流程 + 坑）

> 工作目录 `D:\FengLi\Web\fou\huideng-chanlin`。
> **翻译与缺陷修复均已收官**（A+B 期 29 篇整篇翻译；缺陷修复轮 1/2/3）。
> 本文件 = 唯一权威入口（状态 / 目录 / 流程 / 坑 / 剩余项）。
> 历史计划已归档为 `scripts/*.md.archived`（已执行完，**不要当待办读**，需要时 `git show` 取回）。

## 1. 当前状态（实测，最后一轮 = 缺陷修复轮 3 + 收尾）

| 指标 | 值 | 判据 |
| --- | --- | --- |
| `validate-en` | **ok=294 crit=0 warn=0 parts=0** | 硬缺陷归零 |
| `scan-mojibake` | **0 / 294** | 无乱码 |
| `meta-scan` | 命中 **13** | **期望值就是 13，不是 0** —— 它是**待复核清单**，见 §4.4 |
| `name-scan` | 3 篇「混合」 | **全是子串假阳性，不是缺陷**，见 §4.5 |
| `catalog-en` ↔ `en/*` | 294/294 全等，stale **0** | 生成器已能自愈（§4.2） |
| 孤儿分片 `en/*.pN.json` | **0** | 卫生达标 |
| `task-plan` | **0 篇 / 0 块 / 0 任务 / 0 被挡** | **翻译收工** |
| `plan-slices` | 0 缺口 / 可派 0 片 / 一致性问题 0 | 翻译收工 |
| `npm run typecheck` | 通过 | |
| 工作区 | 干净、全提交、**未 push** | |

**规模**：`articles/*.json` **294** 篇中文源 = `en/*.json` **294** 篇英文；英文正文 **54,799 块**；
`catalog-en.json` **294** 条。其中 **A 期 11 篇 + B 期 18 篇 = 29 篇**为本轮新增整篇翻译（B 期 24,491 块 / 205 任务，实测 395 min ≈ 6.6 h），
其余为既有内容的英文覆盖（均通过 `validate-en`）。

### 1.1 缺陷修复轮 1（crit/warn）

| slug | 症状 | 处置 |
| --- | --- | --- |
| `303liuzutanjing` | 块 551 多余 / 块 822 缺译，551..822 区间 `en[i]=zh[i-1]`（272/272） | 删重复块 + 补译 `zh[822]`（**纯插入**，整段只滑动一格，555..822 **不重译**） |
| `068xiangxujs` | **不是**未翻译：25 块里**汉字 0 个**，残留只是 CJK 标点 | 标点机械归一为 ASCII，块数/`t`/片段数全不变 |
| `101yebunengxi` | 同上，8 块只有 `〔〕` | 同上 |
| 11 篇 warn 片段数不符 | 实测 **42 块**（`103yjy` 一篇 22 块） | 逐篇把 en 片段数对齐 zh（13 个提交） |
| 248 篇片段接头丢空格 | 英文 248 篇 / 补 **15,548** 处；中文 0 处 | 渲染层按需插空格（`ArticleBody.tsx`，仅 `lang==='en'`） |

### 1.2 缺陷修复轮 2（catalog / 孤儿 / author / 音标）

| 步骤 | 计划 | **实测** |
| --- | --- | --- |
| `build-catalog-en.mjs` | 差异 8 → 0 | 生成器**只合并不删键** → 需额外 prune 才到 0（见 §4.2）；重建顺带刷新了 **228 行**陈旧 title/excerpt |
| 删 6 个孤儿分片 | `parts` 6→0 | `parts` 6→0，但 `ok` **288→294**：`validate-en` 对「有分片的 slug」整篇 `continue`，分片删掉后才第一次被校验 |
| author 源缺陷 | 15 篇 | 实测 **16 条**；**14 改 + 2 保留**（`028baofufa` 聂云台、`246henghedashouyin` 元音老人 是真作者） |
| 音标统一 | 10 组 | 口径 = **统一带变音符**；实测 **7,956 处**（`en/*` 7,952 / 185 篇 + `verses.ts` 4） |
| 计划外 | — | `scan-mojibake` 有**假阴性**（漏 C4/C5/E1 前导字节），en 里实际 5 处；已修检测器 + 修数据（§4.3） |

### 1.3 缺陷修复轮 3（author 18 篇）+ 收尾

**共 21 个提交**：1 工具（生成器 prune）+ 17 逐 slug（author）+ 2 逐 slug（真错字）+ 1 docs。

18 篇判定：`NEXT-PLAN.md` §6.1(b) 原列 12 条**全部是缺陷**（书名/品名/正文短语/角色语，**没有一条是真人**），
另加实测新发现 6 条同类。**17 改 + 1 保留**：

| slug | 原 `author`（错） | 改为 | en 侧 |
| --- | --- | --- | --- |
| `002baiyunxy` | 但看自心 | **刘洙源** | Liu Zhuyuan |
| `019xinnzy` | 业不能系 | **彻悟大师** | Master Chewu |
| `082renshibenyuanfamen` | 第十八愿 | **（置空）** | 删键 |
| `088linzhongshinianxiangxu` | 要以深信切愿 | **湛然** | Zhanran |
| `092shangdaochuan` | 第十八愿 | **湛然** | Zhanran |
| `109chenggong` | 就像溺水的人 | **（置空）** | 删键 |
| `269yigenianforendezishu` | 呼吸念佛精要 | **（置空）** | 删键 |
| `170buyuanren` | 王凤仪嘉言录 | **王凤仪** | Wang Fengyi |
| `193guanwuliangshoufojingjijie` | 正宗分 | **会性法师** | Master Huixing |
| `212frame` | 金刚经精解 | **鸠摩罗什** | Kumarajiva |
| `091wuyalishenghuo` | 宁静在说话 | **艾克哈特·托勒** | Eckhart Tolle |
| `236kuailedemimi` | 一个新世界 | **艾克哈特·托勒** | Eckhart Tolle |
| `292wuzhongzuiqiangdadeliliang` | 修行的真谛 | **顶果钦哲仁波切** | Dilgo Khyentse Rinpoche |
| `011errusx` | 达摩祖师亲传 | **湛然** | Zhanran |
| `012liuzutanjing_kp` | 门人法海 录 | **法海** | Fahai |
| `239wuliangshoujing-jiaohuibenzhu-zhu` | 湛然 校会 | **湛然** | Zhanran |
| `056chengzanjingtujing` | 湛然 分科 | **湛然** | Zhanran |
| `049kulianyiwan` | 同人于野 | **不改（真人笔名）** | 不改 |

- **4 篇置空**（`082`/`109`/`269` 无作者可考；`082` 是《禅刊》未署名「编者小语」）。
  置空写法循两侧既有惯例：**中文源 `author: ""`、英文侧删键**（故 catalog 也删该字段）。
- **英文命名一律取自库内既有英文、不新造**：`Master Huixing`（`193` 自身首块）、`Master Chewu`（48 篇）、
  `Liu Zhuyuan`（6 篇）、`Kumarajiva`（31 篇）、`Wang Fengyi`（6 篇）、`Dilgo Khyentse Rinpoche`（`291`/`292` 首块）、
  `Eckhart Tolle`、`Fahai`、`Zhanran`。
- **收尾真错字 2 处**（不属风格分叉）：`043mengyouji` 的 `Paramiti`×2 → **`Pāramiti`**（般剌密谛）；
  `302xinj` 的 `Prajñāpāramita` → **`Prajñāpāramitā`**（同一文件另有 107 处正确拼写，故确为笔误）。

## 2. 目录与产出

```
src/content/articles/*.json     中文源（权威；meta 缺陷也改这里，不要改 en）
src/content/en/*.json           英文覆盖（整篇；分片在 merge 前是 *.pN.json）
src/content/catalog-en.json     slug → {title,author,excerpt}（英文界面用；build-catalog-en.mjs 生成）
src/content/{catalog,lingqi,lingqi-en,…}.json   其它内容数据
dist/                           vite 构建产物（gitignore）
build/                          临时工作区（gitignore）：**只放生成物**（slices/ · shots/ · chrome-* ·
                                cjk-chars.txt · brush-chars.txt · NotoSerifSC-Regular.otf）
scripts/*.mjs                   全部工具脚本（**第 9 轮起，原先在 build/ 的可复用脚本已全部搬到这里**）
scripts/*.md.archived           已执行完的历史计划，**不要当待办读**
```

**补片/返工用的 5 个工具（已入库 `scripts/`；临时件只许放 `build/` 并自删）**

| 脚本 | 用途 |
| --- | --- |
| `scripts/mksrc.mjs <slug.pN>` | 编号源 → `build/<slug.pN>.src.txt`（每行 `<n>\t<源文>`，非 `p` 块带 `[t=..]`/`[segs=N]`/`[HREF]`） |
| `scripts/recover-r9-dispatch.mjs <slug.pN>` | 打印首/末块 `src8` 与 `multiSegBlocks`/`tableBlocks` 计数（派发前给子代理对照锚点） |
| `scripts/recover-r9-assemble.mjs <slug.pN> <out.jsonl>` | **按源结构确定性组装**；锚点/块数/片段数/href/CJK/空译全校验，失败**拒收且不留文件** |
| `scripts/recover-r9-scan.mjs <slug> [pN…]` | 占位符 / 空块 / 无字母块扫描 |
| `scripts/audit-slices-runtime.mjs <slug> <pN…> [--dump=abs]` | 缺陷类 E 判据入口：结构 + 重复 + **逐块长度比离群** |

## 3. 翻译流水线（如需再译）

```bash
node scripts/task-plan.mjs 120                          # 1) 唯一权威的「还剩多少」
node scripts/gap-prep.mjs "<slug>:<a>-<b>"              # 2) 缺口源（同 slug 多区间须分多次进程调用）
node scripts/mksrc.mjs <slug.pN>                          # 3) 编号源 + 锚点
node scripts/recover-r9-dispatch.mjs <slug.pN>
# 4) 一条消息并行派 8 个子代理：各只写 build/<slug.pN>-out.jsonl
#    每行 {"n":0..N-1,"src8":"<源块去空白前8字>","en":"<英文>"}；n 不重不漏
#    提示词模板见 scripts/DISPATCH.md（+ 防漂移三行）
node scripts/recover-r9-assemble.mjs <slug.pN> build/<slug.pN>-out.jsonl   # 5) 父代理组装
node scripts/verify-slices.mjs <本轮全部分片>            # 6) 收尾（顺序不可换）
node scripts/coverage.mjs <slug>                        #    uncovered_blocks=0 且 bad=0
node scripts/audit-slices-runtime.mjs <slug> <pN...>      #    必须 all clean
node scripts/recover-r9-scan.mjs <slug>                   #    必须 clean
git add <各分片，显式文件名> && git commit -m "EN: … shards"
node scripts/merge-parts.mjs <slug>                     # 会删掉它合并的分片 → 必须在提交之后
node scripts/repair-json.mjs ; node scripts/validate-en.mjs
git add <slug>.json ; git add -u src/content/en && git commit -m "EN: … merge"
git show --stat --oneline HEAD ; git status --porcelain  # 双向核对
```

**`meta` 规则**：源切片里有 `zhAuthor` 才写 `author`。`head=Y` 的片若被 `meta-scan` 命中，
**先删 `src/content/articles/<slug>.json` 的 `author`**（改源，不是改 en）再 `gap-prep`。

## 4. 必须遵守的坑（全部实测）

1. **〔最危险〕`merge-parts` 会删除它合并的分片** → 固定顺序：先 `git add` 全部分片 → 再 merge → 再提交。
   `git add A B` 只要有一个路径不存在，**整条 add 失败**，随后 `git add -u` 只暂存删除 → 提交里只有删除没有新增。
   每次提交后 `git show --stat` + `git status --porcelain` 双向核对。
2. **`build-catalog-en.mjs` 是合并式更新：不会删键，但现已加 prune**。当 `en/<slug>.json` 的
   `title`/`author`/`excerpt` 被清空或删行后，**必须先跑生成器**（它会删掉「en 侧无值」的陈旧字段）。
   输出里的 `M stale fields pruned` **应恒为 0**；`M > 0` 说明上次改 en 后没重建 catalog。
   实测：把 `en/170buyuanren.json` 的 author 行删掉后重建 → `1 stale field pruned` 且 catalog 该键消失。
   ⚠ **只删整行、不要 `delete` 后再补** —— 那会把键序改成 `title,excerpt,author`。
3. **含中文的文件禁止用 PowerShell `Set-Content -Encoding utf8` 回写**：它把已是 UTF-8 的内容按 CP936/CP1252
   再解一次，产出**双重编码乱码**（`行` → `è¡Œ`，无 BOM、仍是合法 UTF-8，所以 `tsc`/JSON 解析都不报错）。
   回写一律用 `node` 的 `writeFileSync(p, s, 'utf8')`、`edit` 工具或 Node 脚本。
   自检：`s.includes('\u884c')` 且 `(s.match(/\uFFFD/g)||[]).length === 0`。
4. **`meta-scan` 是「待复核清单」，命中数不是验收指标**：它唯一判据是「`author` 恰是某正文块开头」，
   而**真人署名天然满足**（署名块 `会性法师 敬集` 的开头就是名字）。故轮 3 把错值改成真名后命中数 5→**13**，
   新增 8 条**全是真署名**。**判据**：该 `author` 值在正文里有「相等的短块」或「以它开头的署名块」→ 真署名，**不要删**。
5. **`name-scan` 是裸子串计数**（`raw.split(v)`，不解析 JSON、不看词边界）：长专名会被算成「另一个变体」——
   `Anandatta` 记成 `Ananda`、`Sakyamunindra` 记成 `Sakyamuni`、`Vajrasamadhi`/`Mahaprajna` 记成 `samadhi`/`prajna`。
   它报的 3 篇「混合」**全是假阳性**（判据：取整词看，没有一个是词本身）。
6. **本库正文不在 `blocks[].text` 里**：正文在 `blocks[].inline[].s`（`text` 多为**空串**）。
   用 `b.text` 拼正文会把每篇读成空文，从而把「正文短语型 author」误判成「正文里没这个词」。
   取法：`Array.isArray(b.inline) ? b.inline.map(s => s.s ?? '').join('') : (b.text ?? '')`。
7. **改 `articles/<slug>.json` 的 `author` 不影响英文页署名**：英文页/列表页读 `en/*.json` 的 `author`
   （再汇总进 `catalog-en.json`），与中文源**两侧独立**。**改 author 必须同时决定 en 侧**，否则 en 留错误署名。
8. **单字段改动用行级外科编辑，禁止整文件重序列化**：`en/*.json` 的缩进与行尾**不统一**
   （`1 空格+LF`、`2 空格+LF`、`2 空格+CRLF` 三种并存），`JSON.stringify(j,null,1)` 只对一部分是恒等变换，
   整体重写会把一篇变成「全文重排」的巨型 diff。定位 `^(\s*)"author"\s*:` 行、保留原缩进与 `\r`，改完 `JSON.parse` 回验、
   要求 diff 恰为 1 行。**另**：`git status --porcelain` 在本仓库有 **CRLF 统计噪声**（工作区 LF、blob CRLF、
   `core.autocrlf=true`），会偶发报 ` M` 但 `git diff --numstat` 为空 —— **判据用 `git hash-object <f>` ==
   `git rev-parse HEAD:<f>`**，或直接看 `git diff --numstat`，不要只看 `git status`。
9. **禁用字符只限 CJK 汉字 + 全角**（`【】〔〕《》（）「」、。，！？：；`）；`“ ” ‘ ’ — · …` **允许且推荐**。
   ⚠ `validate-en` 的 CJK 正则只认 `[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff【】〔〕《》]` ——
   `（）`/`？`/全角逗号分号**不触发 crit**。所以「N 块含中文」要先分清**真汉字**（未翻译）还是**只剩 CJK 标点**（排版脏）。
10. **`scan-mojibake` 用「CP1252 反查回字节 → 严格 UTF-8 回环解码」判乱码**（已补 C4/C5/E1 前导字节）：
    只有解码成功且结果不同才判乱码，故 `café` 这类真 latin-1、`dhāraṇī` 这类正确变音符都不会误报。
11. **片段数对齐不能改措辞**：要求 ①片段数 == zh 数；②**去掉全部空白后**与改动前逐字节相同（只许边界插空格）；
    ③href 多重集不变；④未列入的块逐字节不变；⑤整篇去空白内容不变。子代理交回后**必须父代理独立复验**。
12. **`verify-slices` + `coverage` 全绿 ≠ 译完**：块内截断/占位符/空块只有 `audit-slices-runtime` 的**逐块长度比**
    能抓。判据：`EN/ZH` 超出同片中位 2.5×/0.4×；**报警必须回看 ZH 块**（源文自身重复/叠句/偈颂重出/源文损坏都会合法离群）。
13. **子代理自报不可信**：必须逐块核对 `n` 覆盖（`lines/min/max/uniq` **不够**，要查 missing 集合）；
    实测子代理会「只写一部分就正常结束回合」。补写要让它写**新文件**（`-tail.jsonl`），父代理按 `n` 合并去重再组装。
    **同一分片绝不允许两个代理同时写。**
14. **`task-plan`/`plan-slices`/`coverage`/`merge-parts` 四个脚本都读 `slice-plan.json`**：
    删掉它会整条队列链路报 ENOENT（实测过）。**只跑审计器 `plan-slices.mjs`**，不要跑生成器 `slice-plan.mjs`（会覆盖审计器）。
15. **`slice-plan.mjs` 与 `plan-slices.mjs` 同名互覆**（历史教训）；误跑生成器后
    `git checkout -- scripts/plan-slices.mjs` 可复原。
16. **取回历史文件不要用 `git show > file`**（PowerShell 里写 UTF-16，JSON 非法）；
    用 `git cat-file blob` 配 Node 读取，或 `git checkout`。

## 5. 脚本速查

| 脚本 | 用途 |
| --- | --- |
| `task-plan.mjs [maxBlocks]` | 生成任务队列（唯一权威的「还剩多少」） |
| `plan-slices.mjs` | 切片计划**审计**（只跑这个，不要跑生成器） |
| `coverage.mjs [slug]` | 每篇覆盖% / 缺口区间 / 孤儿分片（merge 后整篇不再计分片，显示 0% 属正常） |
| `gap-prep.mjs <slug>[:a-b]` | 预提取缺口源文 → `build/slices/<part>.src.json` |
| `verify-slices.mjs <part…>` | 分片核验（含 `JSON.parse`），必须 `ok` |
| `merge-parts.mjs <slug…>` | 按 firstBlock 连续拼接为整篇，**并删除分片** |
| `validate-en.mjs` | 全库校验：`ok` / `crit` / `warn` / `parts` |
| `repair-json.mjs` | 清 BOM 与字符串内裸控制字符 |
| `scan-mojibake.mjs` | 乱码扫描（现状 0 / 294） |
| `meta-scan.mjs` | 作者/元数据**待复核清单**（改中文源）；命中数**不是**验收指标，见 §4.4 |
| `name-scan.mjs` | 人名/译名一致性扫描（裸子串，见 §4.5） |
| `build-catalog-en.mjs` | 由 `en/*.json` 汇总 `catalog-en.json`（含 prune，见 §4.2） |
| `fix-mojibake.mjs` | CP1252→UTF-8 乱码修复 |
| `migrate.mjs` | 旧站 HTML 迁移（历史，一般不动） |
| `fetch-*.mjs` / `merge-lingqi.mjs` | 媒体与灵棋经抓取/合并（内容侧，按需） |

**常用校验**：`npm run typecheck`（tsc）可跑；`npm run build`（vite）在受限沙箱会因 `spawn EPERM` 失败，需本机跑。

## 6. 剩余项（**全部可选，非缺陷**；建议就此收官）

> 结论：**翻译任务与硬缺陷均已完工**。以下三项都**不是缺陷**，做与不做不影响交付质量。

| 项 | 规模 | 性质 | 建议 |
| --- | --- | --- | --- |
| **(a) 音标/专名第二轮** | ASCII→变音符 ~**2,905 处 / ~169 文件** | **纯风格**（两套拼写均合法） | **建议不做**。这是唯一有回归风险的改动 |
| **(b) 站点构建** | — | 运营/发布 | 需**本机**跑 `npm run build` 出 `dist/` 后发布（沙箱 `spawn EPERM`） |
| **(c) `meta-scan` 归零** | 13 条 | 扫描器口径 | **不建议**：13 条全是真署名；要归零需给扫描器加「纯署名块」白名单（改 `scripts/`，需批准） |

**(a) 若将来要做，口径已定（勿再问）**：**只统一变音符、保留原有大小写分布** ——
`paramita`→`pāramitā`、`Paramita`→`Pāramitā`，**不**把句首/句中大小写拉平。
实测两套并存正是这个原因：`pāramitā`=779 / `Pāramitā`=38；`saṃsāra`=144 / `Saṃsāra`=8。
好处：去空白后仅变音符不同，逐块复核最容易。**href 守卫已复核：目标词在 href 中出现 0 次。**

**(a) 的实测计数（`\b` 整词；供将来直接开工）**：

| 词 | ASCII 侧（待改） | 变音符侧（目标） |
| --- | --- | --- |
| `pāramitā` 系 | `paramita`=258 + `Paramita`=120 = **378** | `pāramitā`=779 / `Pāramitā`=38 |
| `Subhūti` | `Subhuti`=**1251** | `Subhūti`=327 |
| `Śāriputra` | `Sariputra`=**447** + `Sāriputra`=**36** | `Śāriputra`=515 |
| `Mahāyāna` | `Mahayana`=**298** + `mahayana`=**2** | `Mahāyāna`=270 |
| `Avalokiteśvara` | `Avalokitesvara`=**98** | `Avalokiteśvara`=137 |
| `Mañjuśrī` | `Manjusri`=**39** + `Mañjusri`=**13** | `Mañjuśrī`=166 |
| `saṃsāra` | `samsara`=**70** + `Samsara`=**7** | `saṃsāra`=144 / `Saṃsāra`=8 |
| `Kṣitigarbha` | `Ksitigarbha`=**99** | `Kṣitigarbha`=36 |
| `Tripiṭaka` | `Tripitaka`=**137** + `tripiṭaka`=**1** | `Tripiṭaka`=56 |
| `Nāgārjuna` | `Nagarjuna`=**30** | `Nāgārjuna`=53 |

**（a) 的三条硬约束（做时必须包含）**：①只按 `\b` 整词替换、长词形优先；
②**href 硬守卫**（任何目标词出现在 href 里就中止）；③逐文件复核「块数 / 块签名 / href 多重集不变 + 不引入乱码」。
（`\b` 是必须的：`Siksananda`/`Shikshananda`/`Anandatta`/`Sakyamunindra`/`Samadhisvara`/`Prajnaruci`/`Prajnatara`
等长专名**不可**被替换。）

## 7. 下一轮启动提示词（复制这一段）

```
继续 huideng-chanlin 项目（D:\FengLi\Web\fou\huideng-chanlin）。上一轮（第 8 轮）做了「补满图版 +
landscape 题材精修 + gold/moon 令牌改名 + 修 --only 删桶缺陷」，状态、坑与下一轮任务见
scripts/RESUME.md §9（**先读 §9，再读 §4 的 16 条历史坑**）。

上一轮已落地（提交 150786b → ba9aa98 → 9137745）：
- 图版**七桶全满**：sutras 15/15、landscape 20/20、grottoes 46/46（grottoes-46 原是未登记的孤儿
  文件，清单 229 → 239 就是把它与其它缺口补回）；实测 **清单 239 = 磁盘 239、孤儿 0、缺口 0**、
  7 桶编号全连续、pool-drift 全等；
- ⚠ **`photos-status` 退出码 0 ≠ 桶内齐了**（它只判空桶/具名图损坏）——上一轮它返回 0 的时候
  sutras 才 11/15、landscape 13/20。真判据是「清单条数 == 磁盘张数 == PICKS 条数」+ 编号连续；
- ⚠ **改 PICKS 是两步**：`node scripts/curate-cn.mjs`（PICKS → cn-picked.json，**已入库**）
  再 `node scripts/fetch-cn-webp.mjs`（读的是 cn-picked.json，不是 PICKS）。只改 PICKS 就抓图
  会**照旧按旧 id 下载**，日志还打印旧标题 —— 上一轮我连犯两次（§9.2 第 17 条）；
- ⚠ **换槽位必须换同一位置**（编号恒等于下标+1）；且换 id 前先用
  `node scripts/screen-cands.mjs landscape <id...>` 过一遍 111 条 TITLE_REJECT ——
  被剔的 id 不进 cn-picked.json，会让该桶少一条、后面下标全部前移（§9.2 第 21 条）；
- ⚠ **pool 里的标题本身也可能是错的**：`landscape-012` 标题「20180614 CHINA 1432.jpg」，
  实际画面是**游客举手机拍猕猴**。pool-drift 结构性抓不到（只比 picked 与 pool 的 title 是否全等）
  → 题材判据只能**逐张看全尺寸**（§9.2 第 16 条）；
- 本轮我又修了 `fetch-cn-webp.mjs` 一个静默缺陷：`--only=<桶>` 会把其余桶**从清单整体删掉**
  （实测删掉 landscape 20 + lotus 7，7 张 lotus 立刻成孤儿，而退出码 0、构建全绿）。已给
  `persist()` 加 `carry` 参数修好（§9.2 第 18 条）；
- 图版题材精修（用户批准）：landscape 换掉 4 个槽位 → 010（水墨+佛塔）、046（屋顶群+雪山）、
  038（云海雪峰）、034（1874 albumen 沧浪亭嵌崖）；保留了 013（Huangshan）；
- 令牌改名：`gold-*` → `brass-*`（黄铜）、`moon-*` → `mist-*`（青雾灰蓝），**107 处 / 4 文件**。
  做法是把正则收窄为**令牌-数字边界** `\b(gold|moon)-(\d{2,3})\b`，散文词与语义标识
  （`.btn-gold`、`illustration:'moon'`、`.reader-theme-moon`）天然不受影响，不必用文件白名单；
- 判据提醒：Tailwind v4 把令牌值**内联进工具类**，产物 CSS 里搜不到 `--color-*` ——
  要读渲染后的 computed color（`scripts/probe-colors.mjs` / `scripts/probe-lot-badges.mjs`）。

下一轮任务（**§9.3 的第 3/4/5 项，用户指定顺序 4 → 3 → 5**）：
 3. 主包 index.js 继续拆分（现 836.68 KB / gzip 276.67 KB；three 与 vendor 已独立）；
 4. ✅ 已完成（第 9 轮）：26 个可复用工具从 build/ 搬进 scripts/，见 §10.6；
 5. verses.ts 每日法语中英逐段复核（第 6 轮只动了一二级页面文案）。

核对（全跑一遍再问我）：

  npx tsc --noEmit
  npx vite build                    （需子进程权限；受限沙箱会 spawn EPERM）
  node scripts/validate-en.mjs && node scripts/scan-mojibake.mjs
  node scripts/style-audit.mjs
  node scripts/photos-status.mjs     （⚠ 退出码 0 不代表桶内齐了，见上）
  node scripts/pool-drift.mjs          （改过 PICKS 的话必跑；但抓不到「池子自身选错」）
  node scripts/shot-scrolled.mjs ".card-media" build/shots/x.png   # 截图 + 报每张图 naturalWidth

两个**隐性失效**要记牢（不报错，但会静默劣化）：
- 字体子集是按「当前全站用字」生成的 → 改动正文/文案后新字会掉回系统字体，需重跑
  `node scripts/make-song-subset.mjs`（或搬进 scripts/ 后的新路径），看它打印的 missing 数；
- cn-pool.json 是未入库的生成物，而 PICKS 按池内 id 手写 → 再重抓 pool 必须逐条看标题核对，
  且**标题也不可信**，要逐张看全尺寸图。

纪律：
- 含中文的文件一律不要用 PowerShell Set-Content 回写（双重编码，见 §4.3），用 node writeFileSync 或 edit 工具；
- **命令行里不要内联复杂 JS**：PowerShell 会把单双引号吃掉（本轮反复踩到 `Expected ident` /
  `Unmatched )`）。判据脚本一律写成 `scripts/*.mjs` 文件再跑，或直接用现成的探针脚本；
- PowerShell 脚本里的字符串常量只用 ASCII，中文只放注释（PS 5.1 读中文串会把引号配对读错，见 §9.2）；
- 单字段改动用行级外科编辑（§4.8）；git status 有 CRLF 噪声，判据用 git hash-object（§4.8）；
- ⚠ 本仓库脚本有 CRLF 也有 LF 两种行尾（`curate-cn.mjs` 是 CRLF）——写正则改文件时必须用 `\r?\n`，否则静默失配；
- 令牌改名/批量替换要用**令牌-数字边界**正则（见上），不要用裸词边界 + 文件白名单；
- 临时件只许放 build/ 并自删；
- ⚠ 429 会**连片发生**（整段 CDN 被限流时连 HEAD 探测都 429）：别连续硬重试，
  冷却 30–60s 后重跑即可（上一轮 landscape-14 连败 3 次、冷却后一次成功）；
- 改完 SVG / 插画 / 字体 / 图片**务必截图肉眼核对**，不要只看代码：
    node scripts/static-server.mjs dist --port=5192     # 对真实产物（后台任务）
    然后用 Chrome 无头截图 http://127.0.0.1:5192/
    （§9.2 第 9 条：不要用拼图核对题材；§9.2 第 14 条：全页截图不会触发视口外 lazy 图，
      要先用 scrollIntoView 并读 naturalWidth 判断）
- 会话末：回填 §9.4 的实测数字，提交 docs: …，**完成后 push**。
```

## 8. 归档（已执行完的历史计划，**不要当待办读**）

| 文件 | 内容 | 取回 |
| --- | --- | --- |
| `scripts/B-PHASE-HANDOFF.md.archived` | B 期 12 轮翻译实测手册、派发提示词、时间台账（395 min / 18 篇）、缺陷类 E 判据 | `git show <sha>:scripts/B-PHASE-HANDOFF.md` |
| `scripts/DEFECT-ROUND-2-PLAN.md.archived` | 缺陷修复轮 2 的执行计划（命令/预期输出/回退/逐篇 author 判定表，32 提交） | `git show <sha>:scripts/DEFECT-ROUND-2-PLAN.md` |
| `scripts/TRANSLATION-BRIEF.md.archived` | 翻译规范（雅信达标准、术语表、结构要求） | `git show <sha>:scripts/TRANSLATION-BRIEF.md` |
| `scripts/DISPATCH.md` | **仍有效**：补片派发的子代理提示词规范 | 直接读 |

更早的过期文档（`NEXT.md`、`PLAYBOOK.md`、`WEEKEND-PLAN.md`、`NEXT-PLAN.md`）已在 git 历史里。

## 9. 站点改进轮（文案 / 视觉 / 图版 / 字体 / 性能）· 状态与坑

> **范围**：只有一级、二级页面（首页 / 书架 / 听经 / 祈福 / 灵签 / 关于 + 页头页脚），
> **没有深入文章正文**；文章正文的翻译仍是 §1 的状态，未改动。
>
> **轮次**：§9.1 = 第 6 轮（文案/视觉/图版/字体）· §9.1b–§9.4d = **第 7 轮**（图版补桶 / WebP /
> 字体瘦身 + 内置汉字子集 / 令牌改名 / 分包）· **§9.3 = 第 8 轮的既定任务（五项）**。

### 9.1 第 6 轮改了什么（文案 / 视觉 / 图版 / 字体）

| 面 | 改动 | 文件 |
| --- | --- | --- |
| 文案（中） | 按「雅信达」重写；去生硬直译与堆砌（如「不艰深 · 不难懂」→「不艰深 · 不难懂 · 从读得进去的那一部开始」）；主题名与阅读背景名对齐现行水墨配色 | `src/i18n/zh.ts` |
| 文案（英） | **重写而非直译**：`nav` 从 "Beginner's Path / Calm & Listen" 改为 "Reading Room / Listen"；修正中式英语（"One stick of heart-incense fills the ten directions"、"Do the lots come true?"） | `src/i18n/en.ts` |
| 图版 | 全部换为中国传统佛教题材 229 张，7 个语义桶；旧 147 张（40.8MB，含日/韩/越/泰/印题材）已删 | `public/photos/cn/`、`src/data/photos-cn.json`、`src/lib/content.ts` |
| 许愿树 SVG | 重做为中国水墨松柏（详见 `docs/DESIGN.md` §4） | `src/components/zen/WishTree.tsx`、`src/index.css` |
| 插画 SVG | 十二式改水墨卷（宣纸底 + 墨分五色 + 朱砂印 + 自然物缓动） | `src/components/zen/ZenIllustration.tsx` |
| 3D 微调 | 许愿树地面粉色小点 → 墨绿苔点；地面/光圈去掉荧光绿 | `src/components/zen3d/Tree3D.tsx` |
| SEO | 按路由写入 `title` / `description` / `og:*`（原先二级页共用一份通用 description） | `src/components/ui/RouteMeta.tsx`、`src/components/layout/Layout.tsx` |
| 图标 | favicon 改为宣纸底 + 焦墨莲 + 朱砂印；`theme-color` 改焦墨 | `public/favicon.svg`、`index.html` |
| 清理 | 删死代码 `LotusMark.tsx` / `GuanyinFigure.tsx`、旧清单 `src/data/photos.json` | — |
| 工具 | 视觉预览工程 + 静态服务器 + 截图脚本 | `preview/`、`scripts/static-server.mjs`、`scripts/shoot-preview.mjs` |
| **字体三分法** | 标题楷（`--font-serif`）· 正文宋（新增 `--font-song`，**body 默认字体**）· 界面黑；48 处语义为正文的 `font-serif` 逐行改 `font-song` | `src/index.css`、`scripts/migrate-to-song.mjs`、11 个组件/页面 |
| **字体对比工程** | 同页并排两版 + 读 computed style 验证「只有正文变了」（标题字体链与排版宽度两版一致） | `preview/FontCompare.tsx`、`scripts/probe-fonts.mjs` |
| 可达性 | 装饰性 SVG 补 `aria-hidden`（11 处）；全角 `＋` 字符图标换内联 SVG（3 处） | `src/components/ui/Icons.tsx`、`scripts/fix-svg-aria.mjs` |
| **风格体检** | 用计数替代「感觉」：字体分级、圆角/投影/毛玻璃/装饰渐变、emoji 与字符装饰、主题令牌名实、可达性、img alt、中英对齐 | `scripts/style-audit.mjs` |
| 配图分配修复 | `(idx*7)%len` 在池长与步长不互质时退化（禅修院 46 张石窟只用到 3 张）→ 改按桶权重交错 + 院系内序号；并把 `photoForSlug` 从 O(n²) 降到 O(1) | `src/lib/content.ts` |

### 9.1b 第 7 轮改了什么（图版空桶 / WebP / 字体瘦身 / 分包）

| 面 | 改动 | 文件 |
| --- | --- | --- |
| **图版空桶（真因）** | 不是限流：`cn-pool.json` 重抓后 `PICKS` 仍用旧 id，halls/sutras/landscape 三桶整体漂到韩国与蒙古寺院、清真寺、17 世纪荷兰铜版画、蒙古人物像、藏地高原与地图上 | `scripts/curate-cn.mjs` |
| **图版新管线** | 编号**恒等于**清单下标+1（旧管线是「前 N 个成功条目」，欠定、中断即错位）；失败条目留空 → 清单=磁盘=署名三者天然一致 | `scripts/fetch-cn-webp.mjs`（新） |
| **图版转 WebP** | 全量 q80；`--migrate` 可就地迁移已有 jpg | 同上 |
| **图版体检** | 同时认 `.jpg`/`.webp`（原先只认 `.jpg`，迁移后会误报「磁盘 0 张」） | `scripts/photos-status.mjs` |
| **导览卡换图** | `halls-01`（反光金属说明牌）与 `halls-07`（黑白书影）→ 自然光石窟造像；并修掉 `named()` 校验桶没同步改导致「改了 named 却不生效」 | `scripts/pick-named-photos.mjs`、`src/lib/content.ts` |
| **字体瘦身（计划外）** | CSS 875 KB → **77 KB**、字体 940 个/41.5 MB → **14 个/0.55 MB**：移除 `lxgw-wenkai-webfont`(27.9 MB)、`@fontsource/long-cang`(6.4 MB，零引用)，`ma-shan-zheng` 改项目子集(5.99 MB → 382 KB) | `src/main.tsx`、`src/index.css`、`public/fonts/` |
| **汉字正文 webfont** | 新增 **Noto Serif SC 项目子集 1.39 MB / 1 个文件**（`unicode-range` 限定汉字，英文页不下载）；全站字体合计约 1.94 MB | `src/index.css`、`public/fonts/`、`scripts/make-song-subset.mjs` |
| **色板令牌改名** | `sandalwood-*`→`celadon-*`、`tibetan-*`→`cinnabar-*`，**314 处 / 30 文件**（含 docs/preview） | `src/**`、`docs/**`、`preview/**`、`scripts/rename-tokens.mjs` |
| **站标 404 修复** | `PhotoLogo.tsx` 硬编码 `/photos/cn/lotus-03.jpg`，转 WebP 后 404 → 站标空白；改为从 `PHOTO_NAMES` 推导 | `src/components/zen/PhotoLogo.tsx` |
| **分包** | `codeSplitting` 增 `three` / `vendor` 分组（React 229 KB 独立长期缓存） | `vite.config.ts` |
| **canvas 字体名** | 9 处硬编码 `"LXGW WenKai"` / `"Ma Shan Zheng"` → 子集名（否则 canvas 画回退体） | `src/components/zen3d/*` |

### 9.2 图版管线的坑（全部实测）

1. **不要在下载层按 JPEG 魔数过滤**。Commons 上大量中国佛画是 **PNG**（敦煌绢画、台北故宫立轴），
   按 `buf[0]===0xFF && buf[1]===0xD8` 过滤会把它们整批丢掉。格式判定交给 Pillow。
2. **人工精选清单下不要开自动判重**。中国佛画多为「立轴 + 大片留白」，结构指纹与颜色均值高度相似，
   实测把《释迦三尊图轴》与《罗汉图轴》判成同一张。默认 `DEDUP=0`，`DEDUP=1` 才开。
3. **429 要长退避，但别让单条阻塞整队**。Commons 限流时返回的正文是普通错误页
   （不含 "too many requests"），只按关键词判断会漏；按状态码 429 退避，且**每条最多退避 1 次**
   （退避 2 次以上会把整条队列拖住几分钟）。
4. **抓取节流参数**：Commons 约 **6-8 张/分钟** 就会 429。成功下载之间留 6.5s 仍会偶发 429，
   `PACE_MS=14000` 基本稳定。**不要并行跑多个抓取进程**——实测并行会立刻把两个进程一起打进限流。
5. **`--only` 不许按候选清单全量生成文件名**。清单要只登记**磁盘上真实存在**的文件，
   否则前端会去请求 404（实测踩过：清单 232 条、磁盘只有 125 张）。
6. **复用已下载图片时不要依赖 `_raw/`**。一轮成功后 `_raw` 会被清掉，
   若复用判定只能读 `_raw`，下一轮会把已有图片全部当成「产物无法读取」重新下载一遍（实测踩过，白烧 20 分钟）。
   现 `reencode(src, dst, resize=false)` 直接读成品取指纹。
7. **分类名要先探测**。`Category:Buddhist sculpture of China` 之类**不存在**（正确的是
   `Buddhist sculptures from China`），猜分类名会得到空结果。用 `scripts/probe-cats.mjs` 先验。
8. **〔最危险〕`cn-pool.json` 重抓后，`curate-cn.mjs` 的 `PICKS` 必须同源核对**。
   池子是**未纳入 git** 的生成物（`scripts/cn-pool.json`），而 `PICKS` 是按池内 **id** 手写的。
   本轮实测的根因就是这个：池子重抓过一次，顺序全变，而 `PICKS` 还是旧 id ——
   - `halls-001..019` → 变成韩国/蒙古寺院、清真寺、17 世纪荷兰铜版画；
   - `sutras-001..015` → 变成蒙古人物像《Baghatur Chigshi》、藏文/回鹘文/希伯来文写本、《论语》；
   - `landscape-001..018` → 变成藏地高原、地图、昆虫标本照。
   这三个桶因此**一张都没下成**，成了空桶（这就是 §9.4 里 sutras 0/15、landscape 0/18 的真因，
   **不是**「限流没抓完」）。
   **核对办法**（改 `PICKS` 后必跑）：`node scripts/pool-drift.mjs` —— 它把 `cn-picked.json`
   每条与 `pool` 同 id 的 `title` 逐条比，必须**全等**才说明没有漂移。
   ⚠ 只比「picked 与 pool 是否一致」是**不够**的：两者都漂到同一片垃圾上时也会「全等」，
   所以还要**逐条看标题**（本轮的垃圾前缀就是这样才发现的）。
9. **不要用「按序号缩略图拼 contact sheet」来核对图片题材**。实测踩过：缩略图未居中到固定
   单元格，纵向图的标签与图像整体错位，于是把「炳灵寺石窟」看成了「停车场与锥桶」，
   差点据此删掉正确的图。**判据用逐张全尺寸图**，或先把每张强制 cover 到等尺寸单元格再拼。
10. **核对「picks 是否真的对应磁盘文件」要用字节比较**：
    `node scripts/verify-photo-ids.mjs "grottoes:25,grottoes:31"` 会按同一参数重新下载 + 转码，
    与磁盘成品逐字节比。实测这条给出了决定性结论（映射其实是对的）。
11. **〔坑〕`content.ts` 的 `named(key, fallbackBucket)` 第二个参数是「校验桶」，不是注释**。
    `named()` 要求 `named.<key>` 指的文件确实在该桶内，否则**静默**退回该桶第一张。
    本轮踩过：把导览卡的 `named.gate` 改成 `grottoes-16.webp`，却忘了把
    `NAMED_PHOTOS.gate()` 的第二个参数从 `'halls'` 改成 `'grottoes'` ——
    结果 `grottoes-16` 在 halls 桶里找不到，页面照旧显示 `halls-01`，
    **改了 `named` 却看不到任何效果**（构建、tsc 全绿，只有截图能发现）。
    改 `named` 的文件所属桶时，务必同步改这里的校验桶。
12. **导览卡是「窄条裁切」（`object-cover`，约 128×32 的显示比例），别用带文字的标牌特写**。
    原 `gate: halls-01` 是一块反光金属说明牌（拍在粉色木门上）、`bell: halls-07` 是黑白书影，
    裁成窄条后只剩「一块花板子」，与水墨基调冲突——这才是上一轮记的「颜色很冲」的真身
    （**不是**紫外灯偏绿的云冈摩崖；实测逐张看过多张云冈，均为自然暖调砂岩）。
    现两者都改用自然光石窟造像（`grottoes-16` / `grottoes-02`）。
13. **〔坑〕组件里不要硬编码图版文件名**。`PhotoLogo.tsx` 写死了 `/photos/cn/lotus-03.jpg`，
    图版整体转 WebP 后该路径 404，站标变成**空白方框**，而 `tsc` 与 `vite build` **全绿**。
    现改为从 `PHOTO_NAMES` 推导并做后缀归一。
    **判据**：图片要么走 `photoUrl()`/清单，要么查 `naturalWidth`；
    只用「构建通过」判断是不够的——本轮是靠截图 + 读 `naturalWidth` 才发现的。
14. **CDP 全页截图（`captureBeyondViewport`）不会触发视口外的 `loading="lazy"`**，
    全页图里会出现空白图片框。**这不是缺陷**：先 `scrollIntoView` 再截图即可
    （`scripts/shot-scrolled.mjs` 就是这么做的，并会打印每张图的 `naturalWidth` 佐证）。
15. **改 `PICKS` 后必须核对池子**：`cn-pool.json` 是**未入库**的生成物，而 `PICKS` 按池内 id 手写。
    池子重抓后 id 会整体漂移，且**只比「picked 与 pool 是否一致」不够**——
    两者同时漂到同一片垃圾上时也会「全等」。必须逐条看标题（§9.2 第 8 条）。
16. **〔第 8 轮新踩〕`pool` 里的标题本身也可能是错的**。原下标 9 的 `landscape-012`
    池内标题「20180614 CHINA 1432.jpg」（无害），实际内容是**游客举手机拍树上的猕猴**
    —— 与山水毫无关系。③ 也就是说 `pool-drift.mjs` **结构性抓不到这类错**：
    它只比「picked 与 pool 的 title 是否全等」，池子自身选错时两者当然「全等」。
    **判据必须包含「逐张看全尺寸图」**，不能只看标题（§9.2 第 9 条：也不要用缩略图拼图）。
    本轮另见同桶 `landscape-013`（标题「Anhui Huangshan」实为湖南蓝调）——
    署名表里的标题与画面**不保证对应关系**。
17. **〔第 8 轮新踩，最隐蔽〕改 `PICKS` 是两步，不是一步**：
    `fetch-cn-webp.mjs` 读的是 **`scripts/cn-picked.json`**（**已入库**），
    而 `cn-picked.json` 由 `curate-cn.mjs` 从 `PICKS` + `cn-pool.json` 生成。
    ```bash
    node scripts/curate-cn.mjs          # ① PICKS → cn-picked.json（必须先跑！）
    node scripts/fetch-cn-webp.mjs      # ② cn-picked.json → 磁盘 + 清单 + 署名
    ```
    本轮实测：只改 `PICKS` 就抓图，脚本**照旧按旧 id 下载**，
    日志里还打印旧标题（`✓ landscape-09  20180614 CHINA 1432.jpg`），
    于是「改了 PICKS 却毫无效果」——而且我连着犯了两次。
    **换 id 必须换同一位置**：编号恒等于下标 + 1，删条目会让后面全部错位。
18. **〔第 8 轮新踩〕`--only=<桶>` 会把它桶从清单里静默删掉**（已修）。
    实测：清单已有 `landscape`(20) 与 `lotus`(7) 时跑 `--only=sutras`，
    这两个键**整体从 `photos-cn.json` 消失**，磁盘上 7 张 lotus 立刻变成「孤儿文件」
    （前端 `PHOTO_NAMES` 也少一桶）——**退出码 0、构建全绿、`photos-status` 仍返回 0**
    （它只算「清单里在盘上还剩几张」，键没了自然不报空桶）。
    位置：`fetch-cn-webp.mjs` 的 `persist()`（它由 `rows` 重建，而 `rows` 只含本次处理的桶）。
    修法：`persist(manifest, rows, carry)`，`carry` = 上次清单里**本次 `--only` 未处理**的桶，原样写回。
    **判据**：跑完 `--only` 后 `photos-status` 各桶张数不变，且
    `disk == listed`、`orphan == 0`（本轮实测 239 = 239 / 0 / 0）。
    ⚠ 只要清单曾经被删掉过某个键，**再跑 `--only` 也救不回来**（空数组推不出文件）；
    必须跑一次**不带 `--only` 的全量**才能重建。
19. **`photos-status` 退出码 0 ≠ 图版齐了**。退出码只看「有没有空桶 / 具名图是否损坏」；
    `sutras 11/15`、`landscape 13/20` 这种**桶内缺口**它照样返回 0。
    真正的判据是「清单条数 == 磁盘张数 == PICKS 条数」，且每桶编号连续
    （`<bucket>-NN` 恰好等于下标 NN−1）。
20. **令牌改名的判据要读「渲染后的 computed color」，不能只看构建**。
    Tailwind v4 把 `@theme` 的值**内联进工具类**，产物 CSS 里**根本搜不到** `--color-brass-500`
    （搜 `--site-*` 也搜不到）——只有 `.bg-brass-500{background-color:#ab8940}`。
    所以「搜不到令牌名」不等于改名失败。判据：
    - `scripts/probe-colors.mjs`：读 `getComputedStyle(:root)` 的 `--site-brass-500` 等实际值 +
      `--site-gold-500` 应为 `(unset)`；
    - `scripts/probe-lot-badges.mjs`：种入历史后**一次核对签位六档配色**
      （`.bg-mist-200` 落在 `中下`，实测 `rgb(211,221,225)` == `#d3dde1`）。
    梵钟「嗡」字**不能靠静态探针**：它只在 `ringing` 为真时渲染，而 3D 钟一渲染
    DOM 版 fallback 就不挂载（本轮实测 `NO_BELL_BUTTON`），无 WebGL 的环境才能测到。
21. **〔第 8 轮第二轮〕换 id 前必须先用 `TITLE_REJECT` 过一遍，否则下标整体前移**。
    `curate-cn.mjs` 除 `PICKS` 外还有 **111 条 `TITLE_REJECT` 排雷正则**
    （`/tibetan/i`、`/mosque/i`、`/zookeys/i` …）。被剔掉的 id**不会进 `cn-picked.json`**，
    于是该桶少一条、**后面每条的下标全部前移 1**，编号（== 下标+1）与磁盘整体错位。
    实测：想把 `landscape-050` 换成 `landscape-007`（真水墨雪山+佛寺），
    结果 `landscape-007` 因标题含 "Tibetan Plateau" 被剔 → landscape 变成 19 条；
    幸好 `curate-cn.mjs` 会在末尾打印「被排雷剔掉」并给出 `合计 238（缺 0）`，
    否则就会带着错位去抓图。**判据**：`curate-cn.mjs` 输出的「合计」必须等于 PICKS 总数
    （本轮 239），且桶数与 PICKS 一致。可用 `scripts/screen-cands.mjs <bucket> <id...>` 预筛。

### 9.2b 备选图源调查结论（2026）

| 源 | 结论 |
| --- | --- |
| Wikimedia Commons | **主源**。中国佛教题材覆盖最广（分类 + 搜索），但限流凶，须按 §9.2 节流。 |
| Met Open Access | `collectionapi.metmuseum.org` 的 `/objects`、`/objects/{id}` 可用，但 `/search` **已于 2026-10-01 退役**（改用 `/public/collection/v1.1/search`）；连续请求约 270 次后整段 API 返回 403（Cloudflare 拦截）。**图片 CDN `images.metmuseum.org` 没有限流**（实测直链 200、2.8MB）。若要用 Met，正确做法是**从别处取 objectID**（Met 在 GitHub 上发全量 CSV），再只用 CDN 取图。脚本骨架留在 `scripts/fetch-met-photos.mjs`（含 `--probe`）。 |
| Art Institute of Chicago / 其它博物馆 | 未测（时间所限）。若 Commons 继续恶化，按同一思路：**列表/元数据用一个源，图片用其 CDN**。 |

### 9.3 第 8 轮进度（原定五项）

> **第 8 轮已完成 ① 补满图版余量 · ② `gold`/`moon` 改名**（见 §9.4）。
> **③④⑤ 尚未开工**，原样留到下一轮：

| # | 项 | 状态 | 说明 |
| --- | --- | --- | --- |
| **1** | **补满图版余量** | ✅ **完成** | 7 桶全满、**239 = 239**、0 孤儿 0 缺口（`sutras 15/15`、`landscape 20/20`、`grottoes 46/46`）。⚠ 过程中发现 4 个新坑（§9.2 第 16–18、21 条）并修掉 `--only` 删桶的缺陷。**另经用户批准再做一轮题材精修**：`landscape` 换掉 4 个「合法但偏弱」的槽位（拍猕猴的 `landscape-012`、雾霾村庄 `landscape-018`、带高压电线的 `landscape-024`、航拍河滩 `landscape-050`）→ 依次换成 `landscape-010`（水墨山水+佛塔）/ `landscape-046`（传统屋顶群+雪山）/ `landscape-038`（云海雪峰）/ `landscape-034`（1874 年 albumen 照片：宋代沧浪亭嵌于汉江峭壁）。 |
| **2** | **`gold-*` / `moon-*` 改名** | ✅ **完成** | `gold-*`→`brass-*`（黄铜）/ `moon-*`→`mist-*`（青雾灰蓝），**107 处 / 4 文件**。做法：把正则从「裸词边界」收窄为**令牌-数字边界** `\b(gold|moon)-(\d{2,3})\b`，于是散文词与语义标识（`.btn-gold`、`illustration:'moon'`、`.reader-theme-moon`）**天然不受影响**，不必依赖文件白名单。 |
| **3** | **主包 `index.js` 继续拆分** | ⬜ 未做 | 现 **836 KB / gzip 277 KB**（`three` 与 `vendor` 已独立）。可试：把 294 篇的目录/元数据与 `verses.ts` 拆成独立 chunk、或对 `src/content/*.json` 用动态 import。**判据**：首屏请求的 chunk 总量下降，且路由切换不出现明显空白。 |
| **4** | **把 `build/` 里可复用脚本搬进 `scripts/`** | ✅ **完成（第 9 轮）** | **26 个可复用工具全部入库 `scripts/`**（扁平结构），`build/` 只留生成物；顺带修掉两个字体脚本用 cwd 相对路径调用兄弟脚本的真缺陷。判据见 §10.6。 |
| **5** | **`verses.ts` 每日法语中英逐段复核** | ⬜ 未做 | 第 6 轮只动了一二级页面文案，未进 `verses.ts`。逐条核对中英对应（现在是意译，可能存在语义漂移或术语不一致）。 |

**仍需注意的两个"隐性失效"**（不修会静默劣化，不是本轮遗留缺陷）：
- 字体子集是**按当前全站用字生成**的：改动文章正文或界面文案后，新出现的字会**静默掉回系统字体**。改完文案请重跑 `node scripts/make-song-subset.mjs`（或搬进 `scripts/` 后跑新路径）。判据：脚本末尾会打印 `glyphs / missing`。
- `cn-pool.json` 是**未入库**的生成物，而 `curate-cn.mjs` 的 `PICKS` 按池内 id 手写。**若再重抓 pool，必须重跑 `pool-drift.mjs` 并逐条看标题**（§9.2 第 8 条：两者同时漂到同一片垃圾上也会「全等」）。

### 9.4 本轮实测数字

> **2026 第 9 轮（仅核对，未改产品代码）实测**：见 §10.4。
> **2026 第 8 轮（补满图版 + `brass`/`mist` 改名 + 修 `--only` 删桶缺陷）实测**。
> 第 7 轮的数字见下方「第 7 轮存档」表。

| 指标 | 第 8 轮实测 |
| --- | --- |
| `npx tsc --noEmit` | 通过（exit 0） |
| `npx vite build` | 通过（exit 0，2.37s） |
| 主包 `index.js` | **836.68 KB** / gzip 276.66 KB（未拆，见 §9.3 第 3 项） |
| `vendor.js`（React + Router） | 229.34 KB / gzip 73.41 KB |
| `three.js` | 724.16 KB / gzip 184.42 KB（按需） |
| **CSS** | **77.31 KB** / gzip 14.63 KB（改名后净增 ~0.07 KB，纯属令牌名长度差异） |
| `validate-en` | ok=294 crit=0 warn=0 parts=0 |
| `scan-mojibake` | 0 / 294 |
| `style-audit` | 装饰符号 0 · 圆角与投影 0 · img 缺 alt 0 · svg 缺 aria-hidden 0 |
| **图版清单与磁盘** | **239 = 239 严格一致** · **孤儿 0** · **缺口 0**；7 桶编号全部连续；`photos-status` 退出码 **0**（`磁盘 239 张 / 61.5 MB`，`清单登记 239 条`） |
| **图版桶（全满）** | paintings 41 · grottoes **46** · statues **89** · halls 21 · sutras **15** · landscape **20** · lotus 7 |
| 图版题材精修（用户批准） | `landscape` 第二批次换掉 4 个槽位：`012` 拍猕猴→`010` 水墨山水+佛塔 · `018` 雾霾村庄→`046` 屋顶群+雪山 · `024` 带高压电线→`038` 云海雪峰 · `050` 航拍河滩→`034` 1874 albumen 沧浪亭嵌崖。保留 `landscape-013`（Huangshan，层叠岩峰与松）。 |
| 图版本轮抓取 | 多轮 `fetch-cn-webp.mjs` 合计 **新下 16 · 复用 220+ · 失败 0**（429 失败经冷却重跑全部补齐） |
| `pool-drift` | 7 桶 **title 全等 · 不一致 0**（landscape 换成 `landscape-010` 后仍全等） |
| **色板令牌（第 8 轮）** | `brass-*`（黄铜 `#ab8940`）· `mist-*`（青雾灰蓝 `#7b96a1` 一族）—— 由 `gold-*`/`moon-*` 改名，**107 处 / 4 文件**（`src/index.css` 102 · `src/data/lots.ts` 3 · `src/components/zen/TempleBell.tsx` 1 · `docs/VISUAL-SPEC-v3.md` 1） |
| 令牌渲染判据 | `--site-brass-500` = `#ab8940`、`--site-mist-200` = `#d3dde1`、`--site-mist-700` = `#54707c`、`--site-gold-*` = `(unset)`；产物里 `.bg-brass-500`/`.bg-mist-200`/`.text-brass-400`/`.text-mist-700` 均已生成，旧名 0 命中 |
| 截图核对 | 首页导览卡 8 张图 `naturalWidth` 全非 0；`/lots` 签位六档徽章配色正确（`中下` = `rgb(211,221,225)`） |
| 中英词典 | zh/en 键完全对齐（`tsc` 保证） |

#### 第 7 轮存档（图版空桶 + WebP + 字体瘦身 + 分包）

| 指标 | 值 |
| --- | --- |
| 主包 `index.js` | **835 KB** / gzip 276 KB |
| `vendor.js`（React + Router） | 229 KB / gzip 73 KB（单独缓存） |
| `three.js` | 724 KB / gzip 184 KB（按需） |
| **CSS** | **77.2 KB / gzip 14.5 KB** —— 原先 875 KB，降 **91%** |
| **字体分片** | 瘦身后 **14 个 / 0.55 MB**（原先 940 个 / 41.5 MB，降 **98.7%**）；**再加上汉字宋体子集 1.39 MB**，全部字体合计 **约 1.94 MB / 15 个文件** |
| `@font-face` 条数 | **4**（原先 772） |
| 图版清单与磁盘 | **227 = 227**（编号 == 清单下标 + 1） |
| `public/` 图版体积 | 133 张 JPEG 49.1 MB → 同 133 张 WebP **40.5 MB**（−17.5%，q80） |
| 图版桶（第 7 轮末） | sutras **11/15** · landscape **13/20**（第 8 轮已补齐，**退出码 0 掩盖了这个缺口**，见 §9.2 第 19 条） |
| 图版抓取实测 | 一轮：**新下 94 · 复用 40 · 失败 11**（11 张全因 429 限流） |
| **汉字正文 webfont** | 内置 Noto Serif SC **项目子集 1.39 MB / 1 个文件**（详见 §9.4c） |
| **色板令牌（第 7 轮）** | `celadon-*`（130 处）· `cinnabar-*`（159 处）—— 由 `sandalwood-*`/`tibetan-*` 改名（§9.4d） |

**CSS 为什么能降 91%**：那 875 KB 里 **91.3% 是 `@font-face` 规则**（772 条），来自三个
webfont 依赖；真正的站点样式只有约 76 KB。移除未用字体后 CSS 自然回到 77 KB。

**字体为什么能降 98.7%**：

| 依赖 | 原体积 | 处置 |
| --- | --- | --- |
| `lxgw-wenkai-webfont` | 582 个文件 / **27.9 MB** | **移除**。它只是标题楷体栈的第 4 顺位回退（前三名是系统楷体 Kaiti SC / STKaiti / KaiTi），却在 `style.css` 里把 mono/light/bold **6 套**全引入 |
| `@fontsource/long-cang` | 186 个文件 / **6.4 MB** | **移除**。全站**零** `font-family` 引用 |
| `@fontsource/ma-shan-zheng` | 92 个文件 / **5.99 MB** | 改**项目子集**：merge 92 个分片后按「书法体实际用字 + ASCII」子集化 → 单个 **382 KB** 文件 |
| `@fontsource/noto-sans` / `noto-serif`（latin） | 12 个 / 0.18 MB | 保留（西文正文） |

书法体子集重建：`node scripts/make-brush-subset.mjs`（需 `python -m pip install fonttools brotli`）。
许可 OFL-1.1 随字体放在 `public/fonts/ma-shan-zheng-OFL.txt`。

### 9.4c 汉字正文 webfont（内置 Noto Serif SC 项目子集）

| 方案 | 体积 | 说明 |
| --- | --- | --- |
| 系统栈（第 6 轮） | 0 | macOS 宋体-简 / Windows 中易宋体 / Linux 思源宋体，三端观感不一致 |
| `@fontsource/noto-serif-sc` 全量 CSS | **2.92 MB / 86 个分片** | 实测本站用字命中 86 个 unicode-range 分片；且单取 `chinese-simplified` 那一片**缺 1253 个本站用字**（含 淨/觀/釋） |
| **项目子集（本轮采用）** | **1.39 MB / 1 个文件** | 取完整 Noto Serif SC Regular（30928 字形 / 11.1 MB），按 `scripts/collect-cjk.mjs` 统计的 **6965 字**（其中 6888 汉字）子集化 |

- 字形覆盖：**6965 字只缺 1 个**（`鶴`，CJK 兼容表意文字；掉回系统字体，可接受）。
- **`unicode-range` 是刻意的**：只覆盖汉字与中文标点，**英文页面不会下载这 1.39 MB**。
  实测：英文分支只请求 Noto Serif/Sans 的 latin 分片与书法体子集，**无 CJK 子集**；
  中文分支（`hdc.lang=zh`）则实测请求到 `/fonts/noto-serif-sc-subset.woff2`（200）。
- 重建：`node scripts/make-song-subset.mjs`（需 `python -m pip install fonttools brotli`；
  字体源从 jsdelivr 的 `notofonts/noto-cjk` 拉取）。**改动正文/文案后要重跑**，否则新字掉回系统字体。
- 许可 OFL-1.1：`public/fonts/noto-serif-sc-OFL.txt`。

### 9.4d 色板令牌改名

| 旧名 | 新名 | 实际颜色 | 处数 | 轮次 |
| --- | --- | --- | --- | --- |
| `sandalwood-*` | **`celadon-*`** | 青瓷灰绿（`#789085`，G>R） | 130 | 第 7 轮 |
| `tibetan-*` | **`cinnabar-*`** | 朱砂印章红（`#b8382e`） | 159 | 第 7 轮 |
| `gold-*` | **`brass-*`** | 黄铜（`#ab8940`，**非鎏金**） | 44+ | 第 8 轮 |
| `moon-*` | **`mist-*`** | 青雾灰蓝（`#7b96a1` 一族） | 44+ | 第 8 轮 |

第 7 轮共 **314 处 / 30 个文件**（含 `docs/` 与 `preview/`）；第 8 轮共 **107 处 / 4 个文件**。

**第 7 轮的排除项（重要，踩过）**：`src/content/**`（英文正文里的 "gold"/"moon" 是散文词）与
`scripts/curate-cn.mjs`、`scripts/fetch-met-photos.mjs` —— 后两者里的 `/tibetan/i` 是
**图片排雷正则**，按令牌名一刀切改会破坏图版筛选。

**第 8 轮把正则本身收窄，问题从根上消失**：`scripts/rename-tokens.mjs` 原来用**裸词边界**
`\b(gold|moon)\b`（所以第 7 轮只能靠 `EXCLUDE` 文件白名单兜着），
现改为**令牌-数字边界** `\b(gold|moon)-(\d{2,3})\b`：

- 散文词 `gold`/`moon`（`src/content/**` 里成百上千处）**不匹配**，无需白名单；
- `.btn-gold`（**类名**，实为焦墨按钮）、`illustration: 'moon'`（插画变体）、
  `.reader-theme-moon`（阅读主题，用自己的 `--reader-*`）**都不匹配**，天然保留；
- 仍显式排除 `src/curate-cn.mjs`、`fetch-met-photos.mjs`（题材排雷正则）与
  `scan-mojibake.mjs`（CP1252 映射表含 ASCII 样本词）。

改完自检：`--dry` 预览处数 → 关键文件无旧名 → 排除区无「旧名-数字」命中。
**判据不能只看构建**（Tailwind v4 把令牌值内联进工具类，产物里搜不到 `--color-*`），
要读渲染后的 computed color，见 §9.2 第 20 条。

### 9.4b 图版新管线（取代旧的 fetch-cn-picked + rebuild）

旧的「编号 = 前 N 个成功条目」是**欠定**的：中断一次，磁盘上的 `<bucket>-NN` 与清单第 NN 条
就整体错位，只能靠 `rebuild-photo-manifest.mjs` 猜。新脚本改为 **编号 == 清单下标 + 1**，
下载失败的条目直接留空（不进清单、不进署名），于是「清单 = 磁盘 = 署名」三者天然一致。

**⚠ 完整链路是四步，缺一步就会「改了没效果」（§9.2 第 17 条）**：

```bash
# ① 改 PICKS（scripts/curate-cn.mjs）后，必须先生成 cn-picked.json
node scripts/curate-cn.mjs                           # PICKS + cn-pool.json → cn-picked.json（已入库）
# ② 再抓图：读的是 cn-picked.json，不是 PICKS
node scripts/fetch-cn-webp.mjs                       # 抓所有桶（WebP q80，长边 1600）
node scripts/fetch-cn-webp.mjs --only=halls,sutras   # 只抓指定桶（其余桶沿用**上次清单**）
node scripts/fetch-cn-webp.mjs --migrate             # 把已有 .jpg 就地转 .webp（不联网）
# ③ 体检
node scripts/photos-status.mjs                       # 退出码 2 = 仍有空桶；0 **不代表桶内齐了**（§9.2 第 19 条）
node scripts/pool-drift.mjs                            # 改过 PICKS 必跑（但抓不到「池子自身选错」）
```

- 已下载的自动复用、不会重复下载（编号恒定，不再需要 `_raw`）。
- 节流：`PACE_MS` 默认 14000；Commons 约 6–8 张/分钟就 429，任一条最多退避 1 次。
  **429 会连片发生**：整段 CDN 被限流时，连 HEAD 探测都返回 429；
  实测**冷却 30–60s 后重跑即可**（`landscape-14` 连续失败 3 次，冷却后一次成功）。
- **不要并行跑多个抓取进程**（见 §9.2 第 4 条）。
- 换某一个槽位的图：改 `PICKS` 同位置的 id → 跑 `curate-cn.mjs` → **删掉该槽位的 `.webp`**
  （不删的话脚本会「复用」旧文件，等于没换）→ 再 `fetch-cn-webp.mjs`。
  ⚠ 顺序不能颠倒：先在旧脚本进程启动后改 `PICKS`，那一次跑仍按旧 `cn-picked.json` 下载。

### 9.5 归档

第 6 轮（文案 / 视觉 / 图版 / 字体）已全部提交，工作区干净：
`5ad1a60` → `6e952d7` → `ccbfd3f` → `2e4aae3` → `3dd6fa4` → `8b042b2` → `4960d55` → `a2ad34c`。

第 7 轮（图版空桶 / WebP / 字体瘦身 / 分包）：
`61777fc`（图版管线 + WebP）→ `fbe0968`（字体瘦身 + 分包）→ 本轮 docs 提交。

第 8 轮（补满图版 / `brass`+`mist` 改名 / 修 `--only` 删桶缺陷）：
见下方 §9.5 提交清单。

**可复用脚本已全部入库到 `scripts/`（第 9 轮，见 §10.6）**。下表是第 7/8 轮在 `build/`
里开发时的历史清单，路径已就地更新为 `scripts/`：

| 脚本 | 用途 |
| --- | --- |
| `make-brush-subset.mjs` | 重建书法体项目子集（依赖 `python -m pip install fonttools brotli`） |
| `make-song-subset.mjs` | 重建正文宋体子集（**改文案/正文后必须重跑**，否则新字掉回系统字体） |
| `collect-brush.mjs` | 收集书法体实际用字 → `build/brush-chars.txt` |
| `collect-cjk.mjs` | 收集全站汉字（供正文宋体子集用） |
| `pool-drift.mjs` | **改 `PICKS` 后必跑**：核对 picked 与 pool 同 id 的 title 是否全等（抓不到「池子自身选错」） |
| `verify-photo-ids.mjs` | 重新下载+转码一张，与磁盘成品逐字节比，验证「picks→文件」映射 |
| `rename-tokens.mjs` | 色板令牌改名（`--dry` 预览 + 残留/排除区自检） |
| `shot-scrolled.mjs` | 先 `scrollIntoView` 再截图，并打印每张图的 `naturalWidth`（懒加载验证） |
| `shot-zh.mjs` | 中文分支截图 |
| `dump-palette.mjs` | 打印各主题的实际色值（令牌改名的真值来源） |
| **`probe-colors.mjs`** | **第 8 轮新增**：读 `:root` 上 `--site-*` 的实际值 + 校验旧令牌为 `(unset)` |
| **`probe-lot-badges.mjs`** | **第 8 轮新增**：种入历史，一次核对签位六档徽章的 computed color |
| **`screen-cands.mjs`** | **第 8 轮新增**：用 `curate-cn.mjs` 里真正的 111 条 `TITLE_REJECT` 预筛候选 id —— **换 id 前必跑**（§9.2 第 21 条） |
| **`fetch-cand.mjs`** | **第 8 轮新增**：抓候选缩略图做**排序**（用池内自带 url；`420px` 常返回 400，会回退到 1920px）。⚠ 题材最终必须看全尺寸 |
| `probe-lots.mjs` | 抽一支签并读徽章色（随机档位，不如上面那个全面） |
| `lot-levels.mjs` | 列出每档一支签的 id（供 `probe-lot-badges.mjs` 种历史） |
| `fix-canvas-fonts.mjs` | 批量改 zen3d 里硬编码的 canvas 字体名（一次性迁移脚本） |
| `probe-bell.mjs` | 撞钟读「嗡」字色 —— ⚠ **实测无效**：3D 钟一渲染，DOM 版 fallback 不挂载 |

### 9.5 提交清单

| 提交 | 内容 |
| --- | --- |
| （第 8 轮）图版提交 | 补满 7 桶（sutras 15/15 · landscape 20/20 · grottoes 46/46）· 修 `landscape-012` 题材错误（→ `landscape-010` 水墨山水+佛塔）· 修 `--only` 删桶缺陷 · 回填清单/署名 |
| （第 8 轮）改名提交 | `gold-*`→`brass-*`、`moon-*`→`mist-*`（107 处 / 4 文件）+ 正则收窄为令牌-数字边界 + docs |
| （第 8 轮）docs 提交 | 本文件 §9.2 第 16–20 条 · §9.3 进度 · §9.4 实测数字 · §9.4b 四步链路 · §9.4d |

## 10. 第 9 轮（核对 + 新建判据探针）

> **范围**：只跑核对、补两个「隐性失效」的判据探针，**未改任何产品代码**。
> §9.3 的第 3/4/5 项（主包拆分 / 脚本归位 / `verses.ts` 复核）**仍未开工**，见 §10.3。

### 10.1 本轮新增的坑（全部实测）

22. **〔最隐蔽〕两位槽位名不匹配「三位数字」正则是正常的，不是正则坏了**。
    `grottoes-01.webp` 的点号前只有 **两位** 数字，所以任何要求「连续三位数字」的模式
    （`[0-9]{3}`、`[0-9][0-9][0-9]`、`\d{3}`）对它**必然 false** —— 这是判据写错了，不是引擎错。
    本轮为写 `scripts/check-buckets.mjs` 排查这件事绕了很久（一度怀疑正则字面量被改写），
    最终判据：`grottoes-048` 命中、`grottoes-01` 不命中，而 `\d{2}` 两者都命中 → 语义正确。
    **写判据脚本时槽位号一律用 `[0-9][0-9][0-9]?`**（或先取数字再比大小），
    不要写死位宽；`scripts/dbg-regex.mjs` 是这条的回归见证。
23. **`photos-status.mjs` 退出码 0 ≠ 桶内齐了（§9.2 第 19 条的判据现已落地为脚本）**。
    真判据「清单条数 == 磁盘张数 == PICKS 条数 + 编号连续（slot == 下标+1）」已写成
    `scripts/check-buckets.mjs`（**本轮新增，改 `PICKS` 后应与 `pool-drift.mjs` 一起跑**）。
    本轮实测 `picks=239 manifest=239 disk=239 | bad buckets=0`。
24. **字体子集的真判据是「逐字查 woff2 的 cmap」，不是看 mtime 或重跑一遍**。
    已写成 `scripts/check-font-coverage.mjs`（**本轮新增**）：纯 Node 解 woff2
    （`zlib.brotliDecompressSync` + 手写 cmap format 4/12 读取，**不需要 Python/fonttools**）。
    ⚠ 两个易踩点：① woff2 的 `origLength` **可以大于文件体积**（15 张表共享一条 brotli 流，
    CFF 表 origLength 2.2 MB 而文件只有 1.39 MB），**不能**按 `origLength` 在文件里切片，
    必须整条流解压后按 origLength 顺序切；② 表目录里的 tag 是**索引**（0x3F 才是 4 字节 tag）。
    本轮实测 `6964 / 6965`，唯一缺的是已知的 `U+FA2D 鶴`（CJK 兼容表意文字，可接受回退）→ 子集**未过期**。

### 10.2 本轮核对结果（全绿）

| 核对项 | 第 9 轮实测 |
| --- | --- |
| `npx tsc --noEmit` | 通过（exit 0） |
| `npx vite build` | 通过（exit 0，2.43s）；主包 `index-DbXIaZdk.js` **836.68 KB / gzip 276.67 KB**（与第 8 轮一致，未拆） |
| `node scripts/validate-en.mjs` | ok=294 crit=0 warn=0 parts=0 |
| `node scripts/scan-mojibake.mjs` | 0 / 294 |
| `node scripts/style-audit.mjs` | 装饰符号 0 · 圆角与投影 0 · img 缺 alt 0 · svg 缺 aria-hidden 0 · `gold-*`/`moon-*` 旧名残留 **0** |
| `node scripts/photos-status.mjs` | 退出码 0；磁盘 239 张 / 61.6 MB、清单 239 条、9 张具名图全部 ✓ |
| **`node scripts/check-buckets.mjs`（新）** | **picks=239 manifest=239 disk=239、bad buckets=0、7 桶编号全连续** |
| `node scripts/pool-drift.mjs` | 7 桶 title 全等、不一致 0（paintings 41/188 · grottoes 46/189 · statues 89/211 · halls 21/64 · sutras 15/43 · landscape 20/54 · lotus 7/49） |
| `node scripts/check-font-coverage.mjs`（新） | 6964 / 6965 覆盖；唯一缺 `U+FA2D` 为可接受回退 → **字体子集未过期，无需重跑** |
| 截图核对 | 首页 8 张导览卡 `naturalWidth` 全非 0（1258×802 截图肉眼核对：造像/水墨/青瓷三组题材一致） |

### 10.3 第 9 轮任务状态（§9.3 的第 3/4/5 项，用户指定顺序 **4 → 3 → 5**）

| # | 项 | 状态 | 备注 |
| --- | --- | --- | --- |
| **4** | `build/` 可复用脚本搬进 `scripts/` | ✅ **完成** | 26 个工具入库 `scripts/`（扁平）；`build/` 只留生成物。做法与判据见 §10.6 |
| **3** | 主包 `index.js` 继续拆分 | ⬜ 下一步 | 836.68 KB / gzip 276.67 KB；`three`(724 KB) 与 `vendor`(229 KB) 已独立，294 篇文章已各自成块 |
| **5** | `verses.ts` 每日法语中英逐段复核 | ⬜ | 第 6 轮只动一二级页面文案 |

### 10.4 第 9 轮实测数字

> 第 4 项（脚本搬迁）**不改产品代码**，故体积/内容指标与 §9.4（第 8 轮）逐项一致；
> 差异只有「新增受版本管理的 26 个工具脚本 + 2 个判据探针 + 本节文档」。

| 指标 | 第 9 轮实测 | 与第 8 轮对比 |
| --- | --- | --- |
| 主包 `index.js` | 836.68 KB / gzip 276.67 KB | 同 |
| `vendor.js` | 229.34 KB / gzip 73.41 KB | 同 |
| `three.js` | 724.16 KB / gzip 184.42 KB | 同 |
| CSS | 77.31 KB / gzip 14.63 KB | 同 |
| `validate-en` | ok=294 crit=0 warn=0 parts=0 | 同 |
| `scan-mojibake` | 0 / 294 | 同 |
| 图版清单与磁盘 | 239 = 239 = **239（含 PICKS）**、孤儿 0、缺口 0 | 新增 PICKS 维度 |
| 字体子集 | 6964 / 6965 覆盖（缺 `U+FA2D`，可接受） | 新增判据 |
| 入库脚本 | `scripts/` 新增 **27** 个（26 个从 `build/*.mjs` 搬迁 + 共享模块 `woff2-cmap.mjs`） | §10.6 |
| 新增判据探针 | `scripts/check-buckets.mjs` · `scripts/check-font-coverage.mjs` · `scripts/dbg-regex.mjs` | — |
| 字体子集 | 6964 / 6965 覆盖；**重建逐字节幂等**（并入现有字形后 1,421,548 B 与 HEAD 相同） | §10.7 第 3 条 |
| 外部污染恢复 | `src/content` 39 个文件 + 6 个未跟踪文章 + 25 张孤儿 jpg 已恢复/隔离；`ok=294 crit=0` | §10.8 |

### 10.5 `build/` 脚本现状（第 9 轮开工前实测枚举）

开工前 `build/` 里共 **26 个可复用 `.mjs`**（另加 3 个一次性助手：`audit-build-refs.mjs`、
`migrate-build-scripts.mjs`、`verify-migration.mjs`）。§9.5 的表格登记了 21 个，**7 个未登记**：

| 脚本 | 用途 | 来源 |
| --- | --- | --- |
| `mksrc.mjs` | 编号源 → `build/<slug.pN>.src.txt` | §2 |
| `recover-r9-dispatch.mjs` | 打印首/末块 `src8` 与块计数 | §2 |
| `recover-r9-assemble.mjs` | 按源结构确定性组装 + 全量校验 | §2 |
| `recover-r9-scan.mjs` | 占位符 / 空块 / 无字母块扫描 | §2 |
| `audit-slices-runtime.mjs` | 缺陷类 E 判据入口（含逐块长度比） | §2 |
| **`check-buckets.mjs`** | **第 9 轮新增**：清单 == 磁盘 == PICKS + 编号连续（§10.1 第 23 条） | 第 9 轮 |
| **`check-font-coverage.mjs`** | **第 9 轮新增**：逐字查 woff2 cmap，判字体子集是否过期（§10.1 第 24 条） | 第 9 轮 |

非脚本生成物（**留在 `build/`，不入库**）：`cjk-chars.txt`、`brush-chars.txt`、
`noto-serif-sc-subset.woff2`、`NotoSerifSC-Regular.otf`，以及 `chrome-scroll/`、`shots/` 两个目录。

⚠ **§9.5 表里原有的 `ls-unused.mjs` 与 `verify-slots.mjs` 在本仓库并不存在**（`Test-Path` 均为 false，
`build/` 与 `scripts/` 都没有）—— 它们是第 7 轮的临时件且从未落地，故第 9 轮按**实存清单**执行，
这两个名字已从 §9.5 表中删除。

### 10.6 第 9 轮搬迁（§9.3 第 4 项）：`build/*.mjs` → `scripts/*.mjs`

**结论：26 个可复用工具全部入库 `scripts/`；`build/` 只留生成物。**
做法（可复现）：`build/migrate-build-scripts.mjs` 按**精确字面量 + 期望出现次数**做代入，
任何一处对不上就中止（**不做模糊正则替换**），随后 `build/fix-migrated-refs.mjs` 补上
「跨工具引用 / 注释里的兄弟工具名 / 无 `.mjs` 后缀的提示串」这三类第一遍看不见的引用。

**同时修掉的一个真缺陷**：`make-song-subset.mjs` 与 `make-brush-subset.mjs` 原来用
`execFileSync(process.execPath, ['build/collect-cjk.mjs'])` 这种**cwd 相对路径**调用兄弟脚本 ——
一旦从非仓库根目录调用就会 ENOENT。现全部改为 `ART(...)` = `path.join(process.cwd(), ...)`，
并在每个受影响的脚本顶部注入：

```js
const ROOT = process.cwd()
const ART = (p) => path.join(ROOT, p)
```

⚠ **没有动**模板字面量路径（`build/slices/${part}.src.json`）与 `build/shots/*.png` 之类的
**产物路径**（它们本来就该落在 `build/`），只把「脚本互相调用」与「读 `scripts/*.json`」锚定。

**搬迁判据（全部实测通过）**：

| 判据 | 结果 |
| --- | --- |
| 26 个文件语法可解析（`node --check`） | **26/26 parse clean** |
| 无嵌套/重复包裹损伤（`ART(ART(`、`ART(''`、残留占位符） | **0** |
| 全仓库残留 `build/<tool>` 引用（跳过 `build/` 自身） | **0** |
| 跨工具引用（`make-song → collect-cjk` 等） | 10 处已改到 `scripts/` |
| 三类探针实跑（新路径） | `scripts/check-buckets.mjs` = 239/239/239；`scripts/check-font-coverage.mjs` = 6964/6965；`scripts/pool-drift.mjs` = 7 桶全等 |

`scripts/` 目录约定：**扁平结构，无子目录**（搬迁前已有 46 个脚本），故不加 `scripts/photos/` 之类的分组。
入库后新增受版本管理的脚本：**27 个**（26 个搬迁 + 新增共享模块 `scripts/woff2-cmap.mjs`，见 §10.7）。

### 10.7 搬迁过程中改掉的 4 个真问题（都不是「搬文件」本身）

1. **兄弟脚本用 cwd 相对路径 spawn**（会 ENOENT）。`make-song-subset` / `make-brush-subset`
   原来 spawn `build/collect-cjk.mjs`、`build/collect-brush.mjs`。现改为**直接 import**：
   `collect-cjk.mjs` / `collect-brush.mjs` 变成**可 import 的模块**（导出 `collectChars()` /
   `writeCharsFile()` / `collectBrushChars()` / `writeBrushCharsFile()`），CLI 部分用
   **`process.argv[1] === fileURLToPath(import.meta.url)`** 守门 ——
   ⚠ **不要用 `import.meta.main`**：Node 24.19 实测它是 `undefined`。
   同样地，`check-font-coverage.mjs` 现在**现场扫 `src/`**（import `collectChars`），
   不再依赖 gitignore 的 `build/cjk-chars.txt`（在干净 clone 里那个文件根本不存在）。
2. **Windows 绝对路径不能内联进 Python 源码**。`make-brush-subset.mjs` 原来把
   `D:\FengLi\...\build\msz-full.ttf` 拼进 pyftsubset 的 Python 字符串 → `\F`/`\b` 被当转义序列，
   实测 `SyntaxWarning: invalid escape sequence '\F'` 且写出 `D:\\FengLi\\Web\x0cou\\...` 这种坏路径。
   现所有路径一律**走 argv 传参**（Python 端 `sys.argv[n]`）。
3. **〔隐蔽，最值得记〕字体子集不能只在「当前 src/ 用字」上重建**。按 src/ 重建得到 6965 字，
   而**已发布子集里 331 个繁体/异体字（龍 龜 資 報 問 圖 團 寶 專 …）并不在当前 src/ 中** ——
   直接重建会把这 331 字从「站内字体」退回系统字体，而它们仍可能出现在旧稿或外链页面上。
   现 `make-song-subset.mjs` 会**先读现有成品字体的 cmap，把其字形并入新子集**（单调、幂等）：
   实测在 HEAD 字体上重跑得到**逐字节相同**的 1,421,548 字节产物。
   判据脚本 `check-font-coverage.mjs` 同时会报出这个「保留量」（reserve）。
4. **重复的 woff2 cmap 读取被收敛成一个模块**：`scripts/woff2-cmap.mjs`
   （`readWoff2` / `readCmap` / `readWoff2Cmap`），被 `check-font-coverage.mjs` 与
   `make-song-subset.mjs` 共用。两个易踩点写在文件头：① woff2 的全部表**共享一条 brotli 流**，
   `origLength` 可以大于文件体积，**不能**按它切文件（必须先整条流解压）；② 表目录里存的是 tag **索引**。

### 10.8 第 9 轮过程中的一次「工作区被外部进程污染」（已恢复，教训）

核对阶段发现 `src/content` 被**本会话之外的进程**整批改写，且内容是坏的：

| 现象 | 实测 |
| --- | --- |
| 文章被换成另一份稿 | `111mituoyuanzhongchao`：HEAD 标题「阿弥陀经略解圆中钞」**488 块** → 工作区「弥圆い钞-学园」**973 块** |
| 标题取错 | `060yuyinku` 标题变成 `MyTmp`（其源 `docs/markdown/060yuyinku.md` 第 1 行就是 `# MyTmp`） |
| 文件名双重编码 | 6 个未跟踪文件，形如 `239wuliangshoujing-huiyi-zhu-╫╩┴╧.json`（「资粮」被当 **CP936/GBK** 解码后的残迹） |
| 生成物被截断 | `src/data/photos-cn.json` 从 257 行被砍到 20 行（→ `check-buckets` 直接报 `manifest 239 ≠ disk 247`） |
| 25 个孤儿图片 | `public/photos/**/*.jpg`（第 7 轮已全面转 WebP，这些是旧副本，全部未跟踪） |
| **未提交** | `git diff --cached` = 0、无 stash → **HEAD 完好，可一键恢复** |

处置（**都只动未跟踪/被改写的内容，不碰任何设计决策**）：
`git checkout -- src/content public/photos/cn/CREDITS.md src/data/photos-cn.json scripts/slice-plan.json`，
未跟踪的 6 个文章文件与 25 张 jpg **移动到 `build/quarantine-strays/`**（不删除，保留可回滚）。
恢复后实测 `ok=294 crit=0 warn=0`、`check-buckets` 239/239/239、`pool-drift` 7 桶全等。

**教训**：
- **动到 `src/content` 前先看 mtime 与 `git status`**：本轮 `src/content/articles` 的批次写入时间戳是 19:03:26，
  而 `dist/` 是 18:18 —— 时间戳不一致就是「有别的进程在写」的直接证据。
- **判据脚本不要依赖 gitignore 的中间产物**（`build/cjk-chars.txt`）：在干净 clone 或外部清理后它会消失，
  判据就会**假失败**（本节第 3 条那个 331 字的假警报就是这么来的）。现两个字体脚本都已自给自足。
- 排版类判据要**方向明确**：`check-font-coverage` 之前只报「src 用字是否都被字体覆盖」，
  抓不到「字体里的字被删掉」这个反向退化；现已同时报 reserve。






