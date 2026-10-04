import { useLayoutEffect, useState } from 'react'
import { I18nProvider } from '../src/i18n'
import { Section, SectionHeading } from '../src/components/ui/PageBanner'
import { Reveal } from '../src/components/ui/Reveal'
import './font-compare.css'

/**
 * 字体对比预览：同一段真实页面结构渲染两版，并排比对。
 *
 * 问题（由 scripts/style-audit.mjs 量化）：全站 font-serif 94 处（54%）
 * 而 font-weight 29 处**全是 font-normal** —— 标题与正文同属一个楷体族、
 * 同一个字重，只靠字号区分层级。楷体本身笔画粗细差小，层级因此被抹平。
 *
 * 两版差异**只在这一处**：汉字正文字体族
 *   现状（左）：正文与标题都走 --font-serif（汉字回退到霞鹜文楷 · 楷体）
 *   提案（右）：正文改走宋体（Noto Serif SC），标题仍用楷体
 * 其余（字号、字距、颜色、留白、字重一律不加粗）完全相同。
 */

const HERO = {
  kicker: '千年钟声 · 一念心灯',
  title: '慧灯禅院',
  subtitle:
    '学佛可以从每天十分钟读起。这里有话头浅近的开示、可以慢慢读进去的经论，也有安顿身心的法子——不讲门槛，由浅入深。愿您在此点亮心中那盏慧灯。',
}

const VERSE = {
  text: '「一切有为法，如梦幻泡影，如露亦如电，应作如是观。」',
  source: '《金刚经》',
}

const QUICK = [
  { n: '01', title: '初学入门', desc: '从浅近的开示入门，一步一步走进经典' },
  { n: '02', title: '静心听经', desc: '钟声与梵音，把忙碌里最安静的几分钟留给耳朵' },
  { n: '03', title: '点亮心愿', desc: '写下一个心愿，系上许愿树，点起一盏心灯' },
  { n: '04', title: '观音灵签', desc: '静一静，摇一支签，听听心里那句话' },
]

const ARTICLES = [
  { title: '《觉知念佛》', author: '湛然', excerpt: '其修也，有从入之阶；其证也，有自得之实。念佛一法，看似至简，实则统摄万行。' },
  { title: '《六祖坛经》', author: '慧能', excerpt: '菩提本无树，明镜亦非台；本来无一物，何处惹尘埃。此偈道尽顿悟之旨。' },
  { title: '《般若波罗蜜多心经》', author: '鸠摩罗什', excerpt: '照见五蕴皆空，度一切苦厄。心经二百六十字，为般若部之精要。' },
]

/** 一版渲染：variant 决定正文汉字用什么字体族 */
function Variant({ variant }: { variant: 'now' | 'proposed' }) {
  const label = variant === 'now' ? '现状 · 正文与标题同为楷体' : '提案 · 正文改宋体，标题仍用楷体'

  return (
    <div className={`bg-rice-50 ${variant === 'now' ? 'fc-now' : 'fc-proposed'}`}>
      <div className="border-b border-hairline bg-surface px-6 py-3">
        <p className="font-sans text-xs tracking-[0.2em] text-tibetan-600 uppercase">{label}</p>
      </div>

      {/* 题头：与正式 PageBanner 同结构，只是去掉照片以便专注文字 */}
      <header className="border-b border-hairline">
        <div className="px-6 pt-8 pb-10 lg:px-10">
          <p className="section-kicker">{HERO.kicker}</p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.15] font-normal tracking-tight text-ink-900 text-balance sm:text-5xl">
            {HERO.title}
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-base leading-[1.9] text-ink-500">{HERO.subtitle}</p>
        </div>
      </header>

      {/* 每日法语 */}
      <section className="border-b border-hairline">
        <div className="px-6 py-10 lg:px-10">
          <div className="max-w-3xl">
            <p className="section-kicker">每日一语</p>
            <blockquote className="mt-7 font-serif text-xl leading-[2] text-ink-900 text-balance sm:text-2xl">
              {VERSE.text}
            </blockquote>
            <footer className="mt-6 flex items-center gap-3 font-sans text-xs tracking-wider text-ink-500">
              <span className="h-px w-6 bg-hairline" />
              {VERSE.source}
            </footer>
          </div>
        </div>
      </section>

      {/* 导览四卡 */}
      <Section rhythm="tight" className="!px-6 lg:!px-10">
        <SectionHeading align="left" kicker="首页" title="从哪里进门" subtitle="四扇门都开着，走哪一扇都不算绕路" />
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {QUICK.map((q, i) => (
            <Reveal key={q.n} delay={i * 60}>
              <div className="card h-full p-5">
                <span className="font-sans text-[11px] tracking-[0.2em] text-ink-300">{q.n}</span>
                <h3 className="mt-3 font-serif text-lg font-normal text-ink-900">{q.title}</h3>
                <p className="mt-3 font-serif text-sm leading-[1.9] text-ink-500">{q.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* 文章条目列表：最能看出正文可读性的地方 */}
      <Section rhythm="tight" tone="muted" className="!px-6 lg:!px-10">
        <SectionHeading align="left" kicker="初学入门" title="今天，读一部经典" subtitle="不艰深 · 不难懂 · 从读得进去的那一部开始" />
        <ul className="mt-8 border-t border-hairline">
          {ARTICLES.map((a) => (
            <li key={a.title} className="border-b border-hairline py-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-serif text-lg font-normal text-ink-900">{a.title}</h3>
                <span className="font-sans text-xs tracking-wider text-ink-300">作者：{a.author}</span>
              </div>
              <p className="mt-2 font-serif text-sm leading-[1.95] text-ink-500">{a.excerpt}</p>
            </li>
          ))}
        </ul>
        {/* 正文段落：阅读器里的实际字号与行距 */}
        <div className="mt-8 max-w-2xl">
          <p className="section-kicker">正文（阅读器 18px / 1.9）</p>
          <div className="article-body mt-5">
            <p>
              学佛就是修行，而且是如佛所说地修行。「如我所说，名为佛说；不如此说，即波旬说。」
              此语出自《楞严经》，为「如说修行」四字之所本。今人学佛，多求快捷，不肯在一句佛号上死心塌地，
              于是终日换法门、终日不得力。
            </p>
            <p>
              实则万念归一，一归于无。信愿持名，一心不乱——不是把念头压死，而是把念头收拢到一处。
              收拢到极处，自然脱落。
            </p>
          </div>
        </div>
      </Section>
    </div>
  )
}

/**
 * 探针：把关键元素的 computed font-family 渲染成纯文本，
 * 供 scripts/probe-fonts.mjs 用 --dump-dom 取回。
 * 用「读计算样式」而不是「看截图猜字形」来验证「两版只有正文变了」。
 */
function FontProbe() {
  const [lines, setLines] = useState<string[]>([])
  useLayoutEffect(() => {
    const rows: string[] = []
    const show = (sel: string, label: string) => {
      const el = document.querySelector(sel) as HTMLElement | null
      if (!el) {
        rows.push(`${label}: (未找到 ${sel})`)
        return
      }
      const cs = getComputedStyle(el)
      // 字体族整条链都打出来：只看第一个会漏掉「汉字回退到哪一档」
      rows.push(`${label}: ${cs.fontFamily.replace(/["']/g, '')}`)
      // 量一下实际排版宽度：若两版标题宽度一致，说明标题走的是同一档字体
      const r = el.getBoundingClientRect()
      rows.push(`${label} 宽: ${Math.round(r.width)}px`)
    }
    show('.fc-now h1', '现状/大标题')
    show('.fc-proposed h1', '提案/大标题')
    show('.fc-now .article-body p', '现状/正文')
    show('.fc-proposed .article-body p', '提案/正文')
    setLines(rows)
  }, [])
  // 用 [data-probe] 而非 id：probe-fonts.mjs 按 id 找 <pre>，这里保持 id
  return (
    <pre id="font-probe" className="hidden">
      {lines.join('\n')}
    </pre>
  )
}

export function FontCompare() {
  return (
    <I18nProvider>
      <FontProbe />
      <div className="min-h-screen bg-rice-200">
        <div className="fc-bar border-b border-hairline px-6 py-4">
          <p className="font-sans text-sm tracking-wider text-paper">字体对比 · 一级页面「标题 vs 正文」</p>
          <p className="mt-1 font-sans text-xs text-paper/60">
            左右两版只有一处不同：汉字的正文（body / 列表摘要 / 正文段落）用什么字体族。字号、字距、颜色、留白、字重全部相同，且一律不加粗。
          </p>
        </div>
        <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-hairline">
          <Variant variant="now" />
          <Variant variant="proposed" />
        </div>
      </div>
    </I18nProvider>
  )
}
