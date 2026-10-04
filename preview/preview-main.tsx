import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nProvider } from '../src/i18n'
import { WishTree } from '../src/components/zen/WishTree'
import { ZenIllustration, type IllustrationVariant } from '../src/components/zen/ZenIllustration'
import { IncenseBurner } from '../src/components/zen/IncenseBurner'
import { initSiteTheme } from '../src/lib/siteTheme'
import type { Wish } from '../src/lib/wishes'
import '../src/index.css'

initSiteTheme()

/** 示例心愿：中文竖排飘带看起来最真实 */
const WISHES: Wish[] = [
  '愿父母身体安康，少病少恼',
  '愿此一生不退初心，念佛成片',
  '愿众生离苦得乐，共成佛道',
  '愿小儿学业顺遂，心性柔和',
  '愿工作顺缘，不与人结怨',
  '愿道业精进，早得一心不乱',
  '愿亡者超生，莲品增上',
  '愿天下无灾，风雨调顺',
  '愿我慢心渐薄，慈悲日增',
  '愿家人和合，常生欢喜',
  '愿能遇善知识，闻法不疑',
  '愿病苦心苦，皆得解脱',
  '愿持戒清净，不犯不毁',
  '愿临命终时，心不颠倒',
  '愿学法无障，正见日明',
  '愿以慈悲心，待一切人',
  '愿少欲知足，随缘度日',
  '愿此功德，回向法界众生',
].map((text, i) => ({
  id: `w-${i}`,
  name: '慧明',
  text,
  createdAt: Date.now() - i * 3600_000,
  owner: 'dev',
}))

const VARIANTS: IllustrationVariant[] = [
  'lotus',
  'incense',
  'bell',
  'bamboo',
  'mountains',
  'moon',
  'enso',
  'bodhi',
  'sutra',
  'koi',
  'meditation',
  'clouds',
]

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-hairline px-8 py-10">
      <h2 className="font-serif text-xl tracking-tight text-ink-900">{title}</h2>
      {note && <p className="mt-2 max-w-3xl font-serif text-xs leading-relaxed text-ink-500">{note}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-rice-50">
      <header className="border-b border-hairline bg-surface px-8 py-6">
        <p className="font-serif text-sm tracking-[0.2em] text-ink-900">慧灯禅院 · 视觉预览</p>
        <p className="mt-1 font-sans text-xs text-ink-500">
          SVG 组件与水墨插画单独渲染，用于无头浏览器截图核对（不参与正式构建）
        </p>
      </header>

      <Section
        title="许愿树（水墨松柏）"
        note="18 条心愿 → 18 处真实枝桠系结点；飘带随系结点摆动，竖排朱砂绸面，燕尾剪两瓣。"
      >
        <div className="rounded-card border border-hairline bg-rice-100/40 p-4">
          <WishTree wishes={WISHES} onRibbonClick={() => {}} />
        </div>
      </Section>

      <Section title="许愿树 · 空枝" note="无心愿时：树形与苔点、松果、远山自成画面，不显得残缺。">
        <div className="rounded-card border border-hairline bg-rice-100/40 p-4">
          <WishTree wishes={[]} onRibbonClick={() => {}} />
        </div>
      </Section>

      <Section title="禅意插画 · 十二式（水墨卷）" note="宣纸底 + 墨分五色 + 单点朱砂印。每格为封面回退态。">
        <div className="grid grid-cols-3 gap-4">
          {VARIANTS.map((v) => (
            <figure key={v}>
              <ZenIllustration variant={v} className="aspect-5/3 w-full rounded-xs border border-hairline" />
              <figcaption className="mt-2 font-sans text-xs tracking-wider text-ink-500">{v}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="香炉 · 未点 / 已点" note="点击后香柱立起、炭火明灭、青烟上升。">
        <div className="flex flex-wrap items-start gap-10">
          <IncenseBurner />
          <IncenseBurner />
          <IncenseBurner bare />
        </div>
      </Section>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('preview')!).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
)
