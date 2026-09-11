# 周末专项（非 A 期 72 片）— 修正后的任务与工时

> 本文档由 2026-09-10 之后的会话在**不占用 A 期 5 片/轮预算**的前提下写成（只做诊断，不做修改）。
> 所有数字都是本仓库实测结果，命令可直接复制执行。

## 1. `303liuzutanjing` —— 纠正：不是「重译 555–822」，是**±1 错位，只需删 1 块 + 译 1 块**

**旧结论（错）**：`RESUME.md` 写「英文整篇块 555–822 错位（89 块 t/inline 不匹配、块 671 丢 href）——需重译/重对齐该区间」，
听起来要重译 268 块。实测证明**内容全部正确，只是在 551 处多插了一块、在 822 处少了一块**。

**实测证据**（命令见文末）：

| 检查 | 结果 |
| --- | --- |
| 块总数 | ZH 1530 / EN 1530（相等） |
| `en[i] === zh[i-1]`（t + inline 数 + rows 数） | **272/272 成立，0 例外**（i = 551..822） |
| 错位起点 | `en[550]` 与 `en[551]` 都是 ZH[550]（「问：达摩初见梁武帝…」）的译文 → **en[551] 是多余块** |
| 错位终点 | `en[822] ↔ zh[821]`，`en[823] ↔ zh[823]` → 缺的正是 **ZH[822] 的译文**（「善知识！自心归依自己本性…」长段） |
| 块 671 丢 href | href `/articles/152sizukaishifarong` 实际在 `en[672]`（= ZH[671] 的译文）→ **同一错位的症状，不用单独修** |

**修法（预计 15 分钟）**：
1. 删除 `src/content/en/303liuzutanjing.json` 的 `blocks[551]`（多余的 "Question: When Bodhidharma first met Emperor Wu…" 那条）。
2. 翻译 ZH[822]（`善知识！自心归依自己本性（自性佛）…`，单块 `p`，1 个 inline 片段），插入为新的 `blocks[822]`。
3. `node scripts/verify-slices.mjs` 不适用于整篇，直接跑 `node scripts/validate-en.mjs` → 期望 `303liuzutanjing` 不再出现在 `CRITICAL:` 行。

要点：**不要重译 555–822**；删 1 块 + 补 1 块后，href 与全部 272 块的 `t/inline` 都会自动对齐。

## 2. CJK 残留（068 / 101）—— 是「部分翻译」，不是「脏数据」

| 文件 | 块数 | 含 CJK 的块 | 首个位置 | 处理 |
| --- | --- | --- | --- | --- |
| `068xiangxujs` | 84 | **25** | 1, 3, 5, 8, 10, 11, 12, 13 … | 派 1 个子代理，只补这 25 块（其余块保留英译，逐块对齐） |
| `101yebunengxi` | 64 | **8** | 7, 12, 14, 27, 42, 45, 48, 53 | 派 1 个子代理，只补这 8 块 |

- 这是**整篇文件**（不是分片），派发提示必须写死：只改含中文的块，其他块的措辞一律不动，块数不变、`t` 不变、inline 数不变。
- 派发前先打印这 25/8 块的索引与中文原文给子代理（不要让它自己猜哪些块要改）。
- 预计：068 约 20 分钟，101 约 10 分钟，可并行。

## 3. `crit` 缺片（043 / 187 / 239）—— 实测：**全部是 B 期（>300KB），A 期一个都不占**

| 文章 | 中文源 | 归属 | 实测现状 |
| --- | --- | --- | --- |
| `043mengyouji` | **2146KB** | B 期 | 计划 74 片，**全部 MISSING**，无任何英文文件 |
| `187hanshandashinianpushu` | **365KB** | B 期 | 计划 13 片，全部 MISSING |
| `187hanshandashinianpushu-old` | **244KB** | **A 期** | 计划 9 片：p4/p8/p9 **OK**；p1 **PARTIAL 44/90**、p3 **PARTIAL 24/43**；p2/p5/p6/p7 MISSING |
| `239wuliangshoujing-jiaohuibenzhu-zhu` | **341KB** | B 期 | 计划 13 片全部 MISSING |
| `239wuliangshoujing-huiyi` | **359KB** | B 期 | 只有 `p13.json` 一个孤片 |

**重要纠正（避免浪费预算）**：
1. `187hanshandashinianpushu-old` 不是主篇的「错名分片」，而是**目录里真实存在、且已进 `catalog.json`/`catalog-en.json` 的独立文章**（`-old.json` 是另行路由的旧版）。所以 `-old.pN.json` 是它的**合法英文分片**，不要改名、不要删除。
2. `187hanshandashinianpushu-old` 是这 4 篇里**唯一属于 A 期**的，9 片里 3 片已 OK、2 片只缺后半段 → 剩余工作量约 261 块（≈ 4–5 片），是周末性价比最高的一项。
3. `187...-old` 的 p5 **已经出现在 `plan-slices --next` 的可派列表里**（显示为 `187hanshandashinianpushu-old.p5.json`）。派发时**必须用全名**（含 `-old`），否则会写错文件名。
4. 结论：**A 期翻译做完后，A 期残留 `crit` 只剩 303（±1 错位）、068（25 块）、101（8 块）三项**；其余缺失项全部落 B 期，不要按「A 期 crit=6」去估工时。

## 4. 10 处 `STALE_PARTIAL`（旧分片挡路）

`plan-slices` 会打印 10 处，例如 `002baiyunxy.p1.json=47/60`、`013zhufasx.p2.json=30/63`、`032xyxing.p2.json=33/68`、
`052wangshengyuanli.p1.json=28/57`、`071shandaosixiang.p1.json=27/54`、`083ribenbenyuanfamenxie.p1.json=21/42`、
`085mituobenyuan.p1.json=27/48`、`088linzhongshinianxiangxu.p2.json=30/67`、`102lengqiejingxuanzhu.p6.json=44/88`、
`017jdwsswl.p4.json=22/42`。

**统一策略（推荐，别再做「跳过」这种把 72 片缩水的做法）**：
1. 先 `node scripts/verify-slices.mjs <partName>` 逐片看它到底缺多少、结构是否对齐。
2. 若只是「块数不足」（前半段正确）→ **保留已译部分**，只派子代理补译剩余块（省时）。
3. 若结构本身错位（`t/inline` 不匹配）→ 删除该分片，再 `plan-slices --next` 重新派发整个区间。
4. 处理完后 `node scripts/plan-slices.mjs` 的「可立即派发」数应上升（这些正是当前 156 缺片里被挡住的 84 片的一部分）。

## 5. B 期（>300KB，约 6 小时+）

**已验证**：`plan-slices --next 72` 的 72 片**全部**属于 ≤300KB 的 51 篇文章（最大 `258quanzhenqizizhuan` 288KB、`022taishanggy-3` 288KB、`023taishanggy-4` 283KB、`304fozangj` 282KB），**没有一片混入 B 期**。所以「72 片」这个数字是可信的 A 期工作量，不需要再按 300KB 过滤（`build/next-batch.mjs` 里那道 300KB 过滤是冗余保险，保留无害）。

B 期启动时注意：`043mengyouji` 中文源 **2146KB / 74 片**、`187hanshandashinianpushu` 365KB / 13 片、`239wuliangshoujing-huiyi` 359KB / 13 片、`239wuliangshoujing-jiaohuibenzhu-zhu` 341KB / 13 片——这 4 篇仅自身就 ≥113 片，是 B 期的主体，别按「B 期约 15 篇」的旧数字估工时。

保持延后；周末若有余力只做「B 期第一轮 5 片」试水（选 ≥300KB 里最小的），不要一次性展开。
`npm run build`（vite）在本沙箱因 `spawn EPERM` 失败，属正常，本地可跑。

## 6. 工作流坑（A 期实测）与工时修正

### 6.1 【必避】`plan-slices --next` 会把「已派出但尚未落盘」的片当成可派 → 重复派发

实测：第 1 轮已派 `127feixiange.p1`，其子代理尚未写文件，此时 `plan-slices --next 12` **仍把 `127feixiange.p1.json` 列为可派**。
（已落盘但未写完的片则相反：`124/126/133.p1` 有半成品文件，就被算作旧 partial 而不再列出。）

**规则**：每轮派发前先 `plan-slices --next N`，再**减去当前在飞的 partName 清单**，然后取前 5 个。不要直接把 `--next 5` 的结果原样派出去。
同理，**同一片绝不允许两个子代理同时写**（会互相覆盖成半成品）。

**注意 `--next N` 的截断语义**：它只取前 N 名，排序是「按篇缺口数升序」。按「只差 1 片优先」挑片时，
高价值片可能排在很后面（实测 `401amtj.p4` 第 65、`502yuanjuejingjj.p1` 第 38）。
**做法**：`--next 72`（或 100）取全量候选，再用 `scripts/analyze-eta.mjs` 的「只差 1 片」清单筛前 5，
最后减去在飞清单。可派池总数会随合并收缩（实测 72 → 67 = 5 篇整篇 × 1 片），可作为「无重复计数」的校验。

**另一个同类坑（本轮实测）**：**不要在子代理还在跑的时候合并它负责的那篇**。实测 `127feixiange` 合并后，
仍在收尾的子代理又「修复」出 `127feixiange.p1.json`，整篇与孤儿分片并存，`validate-en` 立即从
`ok=210 parts=76` 退化为 `ok=209 parts=77`（孤儿分片被判为不合格）。处理：删掉孤儿分片（内容已在整篇里），
并改为**等该篇全部子代理发完成通知后再 merge**。

### 6.2 A 期真实工作量：**103 片 / 49 篇**（不是 156 片）
`node scripts/analyze-eta.mjs`（本次新增，只读）实测：

| 口径 | 数字 |
| --- | --- |
| A 期（≤300KB、有中文源、整篇未完成）缺失分片 | **103 片 / 49 篇** |
| 其中当前可立即派发 | 72 片 |
| 被旧 partial / 前序未齐挡住 | 31 片 |
| `plan-slices` 报的「缺 156 片」 | 含 B 期与无任何英文产出的篇，不能直接当 A 期工时 |

**关键结构性发现：21 篇只差 1 片就能合并成整篇**（`analyze-eta.mjs` 会列出）：
`127feixiange`、`148pingjingtuzongjiaozhang`、`158xinqiujileyanlisuopo-baihua`、`160boerenzhengjishuo`、
`169ergenyuantongfamen`、`172canjiunianfo`、`174dahuichanfa`、`175xuyunchanfa`、`189sanxinnianfo-dakewen`、
`204ssydj`、`230guanjingzhu`、`235wuliangshoujinghuijiben-dakewen`、`244guanxin`、`247lingxinanranzhu`、
`275zhengdaogezhu`、`276sanshixinian`、`304fozangj`、`401amtj`、`502xiuxinjue`、`502yuanjuejingjj`、
`502zhenxinzhishuojingjie`。
其中 `304fozangj` 9/10、`401amtj` 8/9、`502yuanjuejingjj` 7/8 片已就绪，补 1 片即出整篇。

另有 **12 篇只差 2 片**（`050ningjingspeaks`、`083ribenbenyuanfamenxie`、`095luelunmxjx`、`102lengqiejingxuanzhu`、
`105wangfengyijiayanlu`、`113neiguanchanxiulianxi`、`186hanshandashideyisheng`、`193guanwuliangshoufojingjijie`、
`204danian`、`261lengqiejing`、`302xinj`、`404nianfosanmei`）。

**派发优先级（修正）**：优先派「只差 1 片」的 21 片 → 每片立刻换来 1 篇完整英文文章；再派「只差 2 片」的。
比按 `plan-slices` 默认顺序（按缺口少的篇优先）更划算，因为它优先兑现整篇。

### 6.3 修订后的预计完成时间

| 口径 | 估计 | 依据 |
| --- | --- | --- |
| 单轮 5 片（含核验 + commit） | **15–20 分钟** | 上一会话 6 轮/2 小时；本会话 132 片从派发到 `ok` 约 12 分钟 |
| A 期 103 片 | **21 轮 ≈ 5–7 小时** | 103 ÷ 5，含核验与提交开销 |
| 前 21 片（只差 1 片的篇） | **约 5 轮 ≈ 1.5 小时** | 每片直接兑现 1 篇整篇 |
| 整篇产出预期 | 前 5 轮 ≈ **21 篇**，其后每 2 轮 ≈ 5 篇 | 21 篇只差 1 片、12 篇只差 2 片 |

> 旧估法「72 片 ≈ 4–5 小时」只算了分片、没算「一篇只差一片」的兑现效应，也没把 31 片被挡片计入 —— 实际应把 103 片作为 A 期分母。

### 6.4 【本会话最大发现】旧网格分片：`merge-parts` 不看文件名，只 `firstBlock` 连续性

`slice-plan.json` 曾按更粗的网格重生成，但仓库里大量英文分片是**早前用更细网格**产出的：
典型特征是文件名与边界不符（`p9` 夹在 `p2`/`p3` 之间）、并多出 plan 之外的孤儿（`p10`/`p11`/`p12`/`p40`/`p51`/`p70`）。
这些分片**块级结构是对齐的**（`scripts/coverage.mjs` 的「异常」列基本为 0），只是切法不同。

**因此**：只要这些分片的块区间**刚好首尾相接覆盖全篇**，`node scripts/merge-parts.mjs` 就能直接合并 —— 它与文件名无关。
本会话跑一次无参数 `merge-parts` 即**白捡 2 篇**（`174dahuichanfa` 217 块、`502yuanjuejingjj` 706 块，均 `t` 不匹配 0、无 CJK）。

**操作纪律**：
- 每轮核验后跑一次**无参数** `merge-parts` 收割「其实已齐」的篇；
- 但**有子代理在飞时只能用 `merge-parts <slug>`**（无参数版会删掉在飞分片 → 代理复活文件 → 孤儿分片 → `ok` 数字退化，`127` 已实测）。
- 派发前用 `node scripts/overlap.mjs <slug>` 检查「计划切片区间已被其它分片覆盖 X/Y 块」，只派真正未覆盖的缺口，
  否则会重复翻译（`401amtj.p4` 实测多译约 51 块）。

### 6.5 ETA 分母改为「未覆盖块数」

`node scripts/coverage.mjs`（新增，只读）实测：A 期（≤300KB 且未合并）**共 6152 块未覆盖 ≈ 100+ 片量**（每片约 60 块）。
「缺片数」会低估，因为旧 partial 既不算缺片也不算完成 —— `analyze-eta.mjs` 已修正为显式列出 partial（51 片、需补 1849 块）
与 plan 之外的多余分片（22 个）。

## 7. 【新增·质量缺陷】两类 validate-en 查不出来的问题

### 7.1 乱码（mojibake）：12 个文件，`303liuzutanjing` 一个文件 371 处

**成因**：这些英文 JSON 里的文字曾被「UTF-8 字节按 CP1252 解码后又存成 UTF-8」，于是
`“` 变成 `â€œ`、`—` 变成 `â€”`，中文更会变成 `Ã¥ÂÃ¥Â©` 这种双重编码。
**为什么一直没被发现**：`validate-en.mjs` 只查 CJK/全角字符，而 `â`、`€`、`œ` 都不是 CJK，
所以这些文件一直是 `ok`/`warn`，但**英文模式下用户会看到一串乱码**。

**扫描**：`node scripts/scan-mojibake.mjs`（本次新增，只读）实测 **12 个文件**：

| 文件 | 命中数 |
| --- | --- |
| `303liuzutanjing.json` | **371** |
| `204ssydj.p3.json` / `.p4.json` | 78 / 43 |
| `502xiuxinjue.p4.json` / `.p5.json` | 64 / 6 |
| `251zhenqiyunxingfa.p1.json` / `.p2.json` | 17 / 17 |
| `187hanshandashinianpushu-old.p1.json` / `.p11.json` | 10 / 10 |
| `502zhenxinzhishuo…p6.json` / `030gonggg.json` / `261lengqiejing.p3.json` | 6 / 1 / 1 |

**修法（分两步，别只做第一步）**：
1. **还原**：把字符串按 `latin1` 编回字节、再按 `utf8` 解码，可恢复原本的 `“”—` 与中文；
2. **重译**：还原出来的如果是中文（如 `303` 里的 `参助`），那部分**仍需翻译**——
   也就是说乱码文件里可能同时藏着「符号乱码」和「未翻译中文」两种问题。
3. 还原+重译后必须 `repair-json` → `validate-en` → `scan-mojibake` 三重确认（乱码数应为 0）。

### 7.2 旧网格分片合并后会暴露「隐性 inline 片段数偏差」

旧网格分片从未经过 `verify-slices` 校验（它们的文件名在 `build/slices/` 里没有对应 `.src.json`），
所以**片段数与中文不符的缺陷一直被掩盖**，直到合并成整篇才被 `validate-en` 记为 `warn`：

| 文章 | 块 | 英文片段数/中文片段数 | 偏差 |
| --- | --- | --- | --- |
| `013zhufasx` | 66 | 10 / 11 | **少 1 个片段** |
| `032xyxing` | 28 | 14 / 13 | **多 1 个片段** |

（本会话合并这两篇后 `warn` 由 2 升到 4；另两个既有 warn 为 `151sizuanxingyaomen`、`240yinguangdashilunhuijiben`。）
**修法**：按中文该块的片段边界，把英文多出的那个片段合并回去 / 把漏掉的补出来；改完 `validate-en` 应回到 `warn=2`。

## 附：诊断命令（可复现）

```bash
# 303 错位验证：应打印 272/272、exceptions: []
node -e "const fs=require('fs');const zh=JSON.parse(fs.readFileSync('src/content/articles/303liuzutanjing.json','utf8'));const en=JSON.parse(fs.readFileSync('src/content/en/303liuzutanjing.json','utf8'));let g=0,b=[];for(let i=551;i<=822;i++){const a=zh.blocks[i-1],c=en.blocks[i];if(a&&c&&a.t===c.t&&(a.inline||[]).length===(c.inline||[]).length&&(a.rows||[]).length===(c.rows||[]).length)g++;else b.push(i);}console.log('shift holds',g,'/',822-551+1,'exceptions',JSON.stringify(b));"

# CJK 残留块数与索引
node -e "const fs=require('fs');const CJK=/[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/;for(const s of ['068xiangxujs','101yebunengxi']){const d=JSON.parse(fs.readFileSync('src/content/en/'+s+'.json','utf8'));let n=0,idx=[];d.blocks.forEach((b,i)=>{if(CJK.test(JSON.stringify(b))){n++;idx.push(i);}});console.log(s,d.blocks.length,n,idx.join(','));}"

# A 期真实缺口 / 只差 1 片的篇（本次新增的临时只读脚本，build/ 已 gitignore）
node scripts/analyze-eta.mjs
node scripts/check-parts.mjs <slug> [<slug> ...]   # 合并前预检已有分片，避免 merge-parts 失败
```
