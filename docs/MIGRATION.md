# 旧站内容迁移方案

旧站“如说修行网上佛学院”为 FrontPage 6.0 生成的 **GB2312 静态 HTML**（309 篇），
本方案用一条 Node 脚本（`scripts/migrate.mjs`）完成**编码还原 → 语义提取 → 站内链接重写 → 插画分配**，
输出新站直接消费的结构化数据，并可同步产出 Markdown 归档。

## 1. 流水线（七步）

```
旧 HTML (GB2312)
  │ 1. 编码还原      TextDecoder('gb18030')（GB2312 超集，向后兼容）
  ▼
UTF-8 文本
  │ 2. DOM 解析      cheerio
  ▼
语义块提取
  │ 3. 标题/作者      <title> 去站点后缀（含繁体变体）；作者 = 首个小节标题前
  │                  的极短纯汉字行（黑名单过滤“第一学年”等小标题）
  │ 4. 正文块         h2~h4 → 标题块（天然目录）；p → 段落（引号/加粗长段 → 引文块）；
  │                  table → 表格块（仅直接子行/单元格，穿透 tbody）
  │ 5. 噪音过滤       _vti_cnf 备份目录、_ 前缀文件、index*/style*、
  │                  导航行/品牌行/离线下载行、空白段、与后文标题重复的目录导航段
  │ 6. 内链重写       指向已迁移文章的 <a> → #/articles/<slug>；死链保留文字
  │ 7. 插画分配       slug 关键词（chan→禅圆、jing→经卷…）+ 稳定哈希 → 12 种禅意插画
  ▼
src/content/articles/<slug>.json + src/content/catalog.json   （--md 时另出 docs/markdown/*.md）
```

## 2. 数据结构（`src/lib/content.ts`）

```ts
interface ArticleDoc {
  slug: string; title: string; author: string
  school: 'jing' | 'chan' | 'xiuxue'   // 院系：由旧站两张索引页的链接关系自动判定
  illustration: IllustrationVariant
  excerpt: string; chars: number       // 字数 → 估算阅读时长（÷400）
  blocks: Block[]                      // h2/h3/h4 | p | quote | table | hr
}
```

选择 **JSON 而非 Markdown** 的理由：表格、行内站内链接、目录层级需要结构化表达；
Markdown 仅作人工审校/归档副本（`npm run migrate:md`）。

## 3. 运行

```bash
npm run migrate     # 生成 JSON（默认从 ../My Web Sites/ 读取旧站）
npm run migrate:md  # 同时输出 Markdown 归档到 docs/markdown/
```

输出统计（实际运行）：**309/309 篇全部迁移成功**——净修院 24、禅修院 5、修学园地 280。

## 4. 工具建议（若迁移其他类似旧站）

| 场景 | 建议 |
| --- | --- |
| 编码混乱（GBK/Big5/UTF-8 混杂） | `chardet` 或 `jschardet` 探测后再解码；Big5 用 `iconv-lite` |
| 排版更复杂的页面 | 保留 cheerio，先按“正文容器”定位（如 `.content`/`td` 主列），再提取块 |
| 质量要求高的大站 | 两轮制：脚本粗转 → 导出 Markdown 人工精校 → 以 Markdown 为最终源 |
| 图片资源 | 用 `images/` 旧图时压缩为 WebP 放 `public/`；本项目的插画已全部改为本地 SVG |

## 5. 已知取舍与“离线痕迹”处理

- **“离线”字样**：全站级“离线阅读/离线下载”入口与链接**整体弃迁**（cfou.html 与新站无关；
  旧 index 中的“离线阅读下载”链接目标 `_lixianyueduxiazaishuoming.html` 被 `_` 前缀规则跳过）。
  文章《电脑朗读网页》中“离线发音人”属 TTS 技术术语（指本地语音库），非站点离线痕迹，予以保留。
- **繁体版/修订版**（如 `001zyxuefo-ft`、`-jjb`、`-2018Jan`）作为独立版本保留，标题去后缀。
- 正文中提及“如说修行网上佛学院”的史实性表述予以保留——新站“关于本院”页已说明传承关系，
  这正是去“离线版”而留“法缘”的意图。
- 少量课程表列（如《教学大纲》）以表格块呈现；极个别纯链接页以文字列表呈现，均为忠实迁移。
