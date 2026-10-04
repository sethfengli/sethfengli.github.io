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
build/                          临时工作区（gitignore）：只留 5 个复用脚本，见下
scripts/*.md.archived           已执行完的历史计划，**不要当待办读**
```

**`build/` 里的 5 个复用脚本（补片/返工必用；**临时件只许放 build/ 并自删**）**

| 脚本 | 用途 |
| --- | --- |
| `mksrc.mjs <slug.pN>` | 编号源 → `build/<slug.pN>.src.txt`（每行 `<n>\t<源文>`，非 `p` 块带 `[t=..]`/`[segs=N]`/`[HREF]`） |
| `recover-r9-dispatch.mjs <slug.pN>` | 打印首/末块 `src8` 与 `multiSegBlocks`/`tableBlocks` 计数（派发前给子代理对照锚点） |
| `recover-r9-assemble.mjs <slug.pN> <out.jsonl>` | **按源结构确定性组装**；锚点/块数/片段数/href/CJK/空译全校验，失败**拒收且不留文件** |
| `recover-r9-scan.mjs <slug> [pN…]` | 占位符 / 空块 / 无字母块扫描 |
| `audit-slices-runtime.mjs <slug> <pN…> [--dump=abs]` | 缺陷类 E 判据入口：结构 + 重复 + **逐块长度比离群** |

## 3. 翻译流水线（如需再译）

```bash
node scripts/task-plan.mjs 120                          # 1) 唯一权威的「还剩多少」
node scripts/gap-prep.mjs "<slug>:<a>-<b>"              # 2) 缺口源（同 slug 多区间须分多次进程调用）
node build/mksrc.mjs <slug.pN>                          # 3) 编号源 + 锚点
node build/recover-r9-dispatch.mjs <slug.pN>
# 4) 一条消息并行派 8 个子代理：各只写 build/<slug.pN>-out.jsonl
#    每行 {"n":0..N-1,"src8":"<源块去空白前8字>","en":"<英文>"}；n 不重不漏
#    提示词模板见 scripts/DISPATCH.md（+ 防漂移三行）
node build/recover-r9-assemble.mjs <slug.pN> build/<slug.pN>-out.jsonl   # 5) 父代理组装
node scripts/verify-slices.mjs <本轮全部分片>            # 6) 收尾（顺序不可换）
node scripts/coverage.mjs <slug>                        #    uncovered_blocks=0 且 bad=0
node build/audit-slices-runtime.mjs <slug> <pN...>      #    必须 all clean
node build/recover-r9-scan.mjs <slug>                   #    必须 clean
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
继续 huideng-chanlin 项目（D:\FengLi\Web\fou\huideng-chanlin）。上一轮做了「文案 + 视觉 + 图版」三件事，
状态与剩余项见 scripts/RESUME.md §9（**先读 §9，再读 §4 的 16 条坑**）。

上一轮已落地：
- 中英文案按「雅信达」重写（src/i18n/zh.ts + en.ts），只动一二级页面，未进文章正文；
- 图版全面换为中国传统佛教题材（public/photos/cn/，229 张；日韩越泰印/尼泊尔/藏传题材已剔除）；
  管线四步：collect-pool.mjs → curate-cn.mjs → fetch-cn-picked.mjs（+ probe-cats.mjs 探分类）；
- 许愿树 SVG 重做（中国水墨松柏：一笔焦墨树干 + 松针簇 + 点苔松果 + 红绸系真实枝桠）；
- 十二式禅意插画改为水墨卷（宣纸底 + 墨分五色 + 单点朱砂印 + 自然物缓动）；
- 新增按路由的 title/description/og（RouteMeta）、新 favicon、3D 许愿树的粉色小点改墨绿苔点；
- 新增视觉预览工具（preview/ + static-server.mjs + shoot-preview.mjs），改 SVG 必用。

下一轮请先跑这三条核对，确认 §9 的数字仍成立：
  npx tsc --noEmit
  npx vite build            （需子进程权限；受限沙箱会 spawn EPERM）
  node scripts/validate-en.mjs && node scripts/scan-mojibake.mjs

然后**先问我这一轮要做什么**（可能是：文案再打磨、图版再精选、某个 SVG 再改、加新栏目），
不要自行扩大范围。§9 的「建议下一轮做」列了几项已知可改之处，可直接挑。

纪律：含中文的文件一律不要用 PowerShell Set-Content 回写（双重编码，见 §4.3），用 node writeFileSync 或 edit 工具；
单字段改动用行级外科编辑（§4.8）；git status 有 CRLF 噪声，判据用 git hash-object（§4.8）；
临时件只许放 build/ 并自删；改完 SVG/插画务必用 shoot-preview.mjs 截图肉眼核对，不要只看代码。
会话末：回填 §9 的实测数字，提交 docs: …
```

## 8. 归档（已执行完的历史计划，**不要当待办读**）

| 文件 | 内容 | 取回 |
| --- | --- | --- |
| `scripts/B-PHASE-HANDOFF.md.archived` | B 期 12 轮翻译实测手册、派发提示词、时间台账（395 min / 18 篇）、缺陷类 E 判据 | `git show <sha>:scripts/B-PHASE-HANDOFF.md` |
| `scripts/DEFECT-ROUND-2-PLAN.md.archived` | 缺陷修复轮 2 的执行计划（命令/预期输出/回退/逐篇 author 判定表，32 提交） | `git show <sha>:scripts/DEFECT-ROUND-2-PLAN.md` |
| `scripts/TRANSLATION-BRIEF.md.archived` | 翻译规范（雅信达标准、术语表、结构要求） | `git show <sha>:scripts/TRANSLATION-BRIEF.md` |
| `scripts/DISPATCH.md` | **仍有效**：补片派发的子代理提示词规范 | 直接读 |

更早的过期文档（`NEXT.md`、`PLAYBOOK.md`、`WEEKEND-PLAN.md`、`NEXT-PLAN.md`）已在 git 历史里。

## 9. 站点改进轮（文案 / 视觉 / 图版）· 状态与坑

> 本轮范围：**只有一级、二级页面**（首页 / 书架 / 听经 / 祈福 / 灵签 / 关于 + 页头页脚），
> **没有深入文章正文**。文章正文的翻译仍是 §1 的状态，未改动。

### 9.1 这一轮改了什么

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

### 9.2b 备选图源调查结论（2026）

| 源 | 结论 |
| --- | --- |
| Wikimedia Commons | **主源**。中国佛教题材覆盖最广（分类 + 搜索），但限流凶，须按 §9.2 节流。 |
| Met Open Access | `collectionapi.metmuseum.org` 的 `/objects`、`/objects/{id}` 可用，但 `/search` **已于 2026-10-01 退役**（改用 `/public/collection/v1.1/search`）；连续请求约 270 次后整段 API 返回 403（Cloudflare 拦截）。**图片 CDN `images.metmuseum.org` 没有限流**（实测直链 200、2.8MB）。若要用 Met，正确做法是**从别处取 objectID**（Met 在 GitHub 上发全量 CSV），再只用 CDN 取图。脚本骨架留在 `scripts/fetch-met-photos.mjs`（含 `--probe`）。 |
| Art Institute of Chicago / 其它博物馆 | 未测（时间所限）。若 Commons 继续恶化，按同一思路：**列表/元数据用一个源，图片用其 CDN**。 |

### 9.3 建议下一轮做（都不是缺陷，按价值排序）

| 项 | 规模 | 说明 |
| --- | --- | --- |
| (a) 补齐空桶 | 约 50 张 | **`halls` / `sutras` / `landscape` 三个桶还没抓完**（见 §9.4）。重跑 `PACE_MS=14000 node scripts/fetch-cn-picked.mjs` 即可续抓，已有的会自动复用。 |
| (b) 图版转 WebP | 约 150 张 / 缩减 40% | `public/` 现约 100MB。WebP q80 目视无差。改 Pillow 输出格式 + `photoUrl()` 后缀即可；**需要重跑下载**。 |
| (c) 具名图改为清单驱动 | 小 | `NAMED_PHOTOS` 按「桶内第 N 张」硬编码索引，桶内容一变就漂移（本轮已因桶未抓满而换过两次）。应把具名映射写进 `photos-cn.json` 的 `named` 字段。 |
| (d) 色板令牌改名 | 大（约 200 处） | `sandalwood-*` 实际是青瓷灰绿、`tibetan-*` 实际是朱砂红、`gold-*` 基本不用。名字与含义不符，是最大的可读性债。 |
| (e) 主包瘦身 | 中 | 主 js 约 815KB（gzip 271KB）。可细化 `build.rollupOptions.output.codeSplitting.groups`，把 three / 字体 / i18n 分开。 |
| (f) 文案再打磨 | 小 | 本轮只动了一二级页面；若允许，可逐段复核 `verses.ts` 每日法语的中英对应。 |

### 9.4 本轮实测数字（会话末回填）

| 指标 | 值 |
| --- | --- |
| `npx tsc --noEmit` | 通过（exit 0） |
| `npx vite build` | 通过（主 js 815KB / gzip 271KB；CSS 854KB） |
| `validate-en` | ok=294 crit=0 warn=0 parts=0（未改动英文正文） |
| `scan-mojibake` | 0 / 294 |
| 已抓中国佛教图版 | **126 张**：paintings 41 / grottoes 45 / statues 32 / lotus 7 / halls 1（**halls · sutras · landscape 尚未抓完**） |
| `public/` 总体积 | 约 100MB（图版 + 音档） |
| 配图分配 | 相邻文章零重复；`halls` 为空时自动跳过该桶，不会出现空图 |
| 中英词典 | zh/en 键完全对齐（`tsc` 保证） |
