import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { CATALOG, NAMED_PHOTOS, PHOTO_NAMES } from '../lib/content'
import { CHANTS } from '../data/chants'
import { LOTS } from '../data/lots'
import { CoverImage } from '../components/zen/CoverImage'
import { HuiLamp } from '../components/zen/HuiLamp'
import { PageBanner, SectionHeading, Section, Ornament } from '../components/ui/PageBanner'
import { PhotoLightbox, type PhotoItem } from '../components/ui/PhotoLightbox'
import { Reveal } from '../components/ui/Reveal'
import { PlusIcon } from '../components/ui/Icons'
import { Contained3D } from '../components/zen3d/Contained3D'
import type { Props as Lamp3DProps } from '../components/zen3d/Lamp3D'

/**
 * 3D 慧灯按需加载：three.js（707 KB）只在滚到「灯传」一段前 400px 才下载。
 * 类型取自真实组件（`import type` 不产生运行时代码）。
 */
const Lamp3D = lazy(() =>
  import('../components/zen3d/Lamp3D').then((m) => ({ default: m.Lamp3D })),
) as ComponentType<Lamp3DProps>

const SECTIONS = [
  { id: 'story', key: 'about.storyTitle' },
  { id: 'heritage', key: 'about.heritageTitle' },
  { id: 'contact', key: 'about.contactTitle' },
  { id: 'faq', key: 'about.faqTitle' },
  { id: 'copyright', key: 'about.copyrightTitle' },
] as const

type PhotoKey = 'garden' | 'diamond' | 'hero' | 'guanyin' | 'lotus' | 'ink'

/** 信封图形：细线内联 SVG，用于联系区块（取代旧版 emoji） */
function MailIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5.5" width="18" height="13" rx="1" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </svg>
  )
}

/** 书本图形：细线内联 SVG，用于文库入口（取代旧版 emoji） */
function BookIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v12.5a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v12.5a2 2 0 0 1 2-2h6Z" />
    </svg>
  )
}

/** 可点击的照片块：整张图是一个按钮，hover 只做极轻的缩放，不位移 */
function PhotoTile({
  photo,
  onOpen,
  aspect = 'aspect-[4/3]',
  position,
  className = '',
}: {
  photo: PhotoItem
  onOpen: () => void
  aspect?: string
  position?: string
  className?: string
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t('common.photoView')}：${photo.caption ?? photo.alt}`}
      className={`group relative block w-full cursor-zoom-in overflow-hidden rounded-xs border border-hairline bg-rice-100 focus-visible:ring-2 focus-visible:ring-cinnabar-400 focus-visible:ring-offset-2 focus-visible:ring-offset-rice-50 focus-visible:outline-none ${aspect} ${className}`}
    >
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        style={position ? { objectPosition: position } : undefined}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-xs border border-paper/35 bg-celadon-950/55 text-paper opacity-75 transition-opacity duration-200 group-hover:opacity-100"
      >
        <ExpandIcon />
      </span>
    </button>
  )
}

/** 图注：序号 + 题材，下面一条发丝线把照片与下一段隔开 */
function PhotoCaption({ index, label }: { index: number; label: string }) {
  return (
    <figcaption className="mt-3 flex items-center gap-3 font-sans text-[11px] tracking-[0.14em] text-ink-500">
      <span className="font-serif text-cinnabar-600 tabular-nums">{String(index + 1).padStart(2, '0')}</span>
      <span className="font-song text-sm tracking-normal text-ink-700">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-hairline" />
    </figcaption>
  )
}

export function About() {
  const { t, arr } = useI18n()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [active, setActive] = useState('story')
  const [viewer, setViewer] = useState<number | null>(null)
  const faqs = arr('about.faq') as Array<{ q: string; a: string }>
  const heritage = arr('about.heritage') as Array<{ title: string; desc: string }>
  const captions = arr('about.galleryCaptions') as string[]

  /* 分节导航滚动高亮 */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  /*
   * 照片顺序 = 灯箱的左右切换顺序：缘起（山水 / 写经）→ 照片墙（佛殿 / 观音 / 莲池 / 古寺）。
   * 每张都带图注；点击后由同一个灯箱承接，不再出现「点了没反应」。
   */
  const photos: Record<PhotoKey, PhotoItem> = {
    garden: {
      src: NAMED_PHOTOS.garden(),
      alt: captions[0] ?? '山水',
      caption: t('about.storyPhotoCaption'),
    },
    diamond: {
      src: NAMED_PHOTOS.diamond(),
      alt: captions[3] ?? '写经',
      caption: t('about.storySutraCaption'),
    },
    hero: { src: NAMED_PHOTOS.hero(), alt: captions[1] ?? '佛殿', caption: captions[1] ?? '佛殿' },
    guanyin: { src: NAMED_PHOTOS.guanyinArt(), alt: captions[2] ?? '观音', caption: captions[2] ?? '观音' },
    lotus: { src: NAMED_PHOTOS.lotus(), alt: captions[4] ?? '莲池', caption: captions[4] ?? '莲池' },
    ink: { src: NAMED_PHOTOS.ink(), alt: captions[5] ?? '古寺', caption: captions[5] ?? '古寺' },
  }
  const viewerItems: PhotoItem[] = [
    photos.garden,
    photos.diamond,
    photos.hero,
    photos.guanyin,
    photos.lotus,
    photos.ink,
  ]
  // 「一脉相承」三卡：经卷扉画 / 水墨山水 / 莲池。
  // 第一张不用 sutras-03（米色纸上的小字，缩小后近乎空白），改用金泥扉画，
  // 既与「如说修行」对得上，也让三张卡在缩略图尺寸下有足够的视觉重量。
  const heritagePhotos: PhotoItem[] = [
    { src: NAMED_PHOTOS.gate(), alt: captions[3] ?? '写经', caption: captions[3] ?? '写经' },
    photos.ink,
    photos.lotus,
  ]
  const openPhoto = (key: PhotoKey) => {
    const idx = viewerItems.findIndex((p) => p.src === photos[key].src)
    setViewer(idx < 0 ? 0 : idx)
  }

  return (
    <div>
      {/* 页头：水墨山水长卷。⚠ 必须是 landscape 桶的图，不能退回石窟特写 */}
      <PageBanner
        image={NAMED_PHOTOS.garden()}
        position="50% 50%"
        kicker={t('about.kicker')}
        title={t('about.title')}
        subtitle={t('about.subtitle')}
      />

      {/* 数字带：发丝线分隔的统计行 */}
      <section className="border-b border-hairline bg-surface">
        <div className="container-page grid grid-cols-2 gap-8 py-12 text-center sm:grid-cols-4 sm:gap-10">
          <Stat value={String(CATALOG.length)} label={t('about.statArticles')} />
          <Stat value={String(PHOTO_NAMES.length)} label={t('about.statPhotos')} />
          <Stat value={String(CHANTS.length + 1)} label={t('about.statAudio')} />
          <Stat value={`${LOTS.length}+125`} label={t('about.statLots')} />
        </div>
      </section>

      <Section>
        <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-20">
          {/* 吸附分节导航 */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1" aria-label={t('about.sectionNav')}>
              {SECTIONS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xs px-2 py-2.5 text-left font-sans text-sm transition-colors duration-200 ${
                    active === s.id ? 'text-cinnabar-700' : 'text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {/* 序号：方形朱砂小印（替换旧版圆形徽章） */}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-xs font-song text-xs ${
                      active === s.id ? 'bg-cinnabar-600 text-paper' : 'border border-hairline text-ink-300'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {t(s.key)}
                </button>
              ))}
            </nav>
          </aside>

          <div className="min-w-0 space-y-24 lg:space-y-32">
            {/* ---------- 缘起：左文右图，两张照片错落，不再三张竖着挤成一列 ---------- */}
            <Reveal>
              <section id="story" className="scroll-mt-24">
                <div className="grid gap-12 lg:grid-cols-12 lg:items-start lg:gap-14">
                  <div className="lg:col-span-7">
                    <h2 className="section-title">{t('about.storyTitle')}</h2>
                    <div className="mt-8 space-y-6 font-song text-[15px] leading-loose text-ink-700">
                      <p className="text-indent-2em">{t('about.story1')}</p>
                      <p className="text-indent-2em">{t('about.story2')}</p>
                      <p className="text-indent-2em">{t('about.story3')}</p>
                    </div>
                    <blockquote className="mt-10 border-l border-cinnabar-600/60 pl-5 font-song text-sm leading-loose text-ink-500">
                      {t('about.storyQuote')}
                      <span className="mt-2 block font-sans text-[11px] tracking-[0.18em] text-ink-300">{t('about.storyQuoteSource')}</span>
                    </blockquote>
                  </div>

                  <div className="lg:col-span-5">
                    <figure>
                      <PhotoTile
                        photo={photos.ink}
                        aspect="aspect-[4/3]"
                        position="50% 42%"
                        onOpen={() => openPhoto('ink')}
                      />
                      <PhotoCaption index={0} label={captions[5] ?? '古寺'} />
                    </figure>
                    <figure className="mt-7 ml-auto w-[82%]">
                      <PhotoTile photo={photos.diamond} aspect="aspect-[4/3]" onOpen={() => openPhoto('diamond')} />
                      <PhotoCaption index={1} label={t('about.storySutraCaption')} />
                    </figure>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* ---------- 一脉相承：三张可点的入口卡（图 + 文 + 去处） ---------- */}
            <Reveal>
              <section id="heritage" className="scroll-mt-24">
                <p className="section-kicker">{t('about.kicker')}</p>
                <h2 className="section-title mt-3">{t('about.heritageTitle')}</h2>
                <div className="mt-10 grid gap-6 sm:grid-cols-3 lg:gap-8">
                  {heritage.map((h, i) => {
                    const to = (['/articles', '/dharma', '/prayer'] as const)[i] ?? '/articles'
                    const photo = heritagePhotos[i] ?? heritagePhotos[0]
                    const fallback = (['sutra', 'mountains', 'lotus'] as const)[i] ?? 'sutra'
                    return (
                      <Link
                        key={i}
                        to={to}
                        viewTransition
                        className="group flex flex-col overflow-hidden rounded-card border border-hairline bg-surface transition-colors duration-300 hover:border-celadon-400"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden border-b border-hairline bg-rice-100">
                          <CoverImage
                            src={photo.src}
                            alt={photo.alt}
                            fallbackVariant={fallback}
                            className="h-full w-full transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                          <span className="absolute top-3 left-3 bg-rice-50/90 px-2 py-1 font-sans text-[10px] tracking-[0.18em] text-ink-500 tabular-nums">
                            0{i + 1}
                          </span>
                        </div>
                        <div className="flex flex-1 flex-col p-5 sm:p-6">
                          <h3 className="font-serif text-lg font-normal tracking-tight text-ink-900 transition-colors duration-200 group-hover:text-cinnabar-600">
                            {h.title}
                          </h3>
                          <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{h.desc}</p>
                          <span className="mt-auto inline-flex items-center gap-2 pt-6 font-sans text-[11px] tracking-[0.16em] text-celadon-700 transition-colors duration-200 group-hover:text-cinnabar-600">
                            {t('about.heritageCta')}
                            <ArrowUpRight />
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            </Reveal>

            {/* ---------- 禅院掠影：一大四小，留白优先；每张都可点开灯箱 ---------- */}
            <Reveal>
              <section id="gallery">
                <SectionHeading align="left" title={t('about.galleryTitle')} subtitle={t('about.gallerySubtitle')} />
                <p className="mt-3 inline-flex items-center gap-2 font-sans text-[11px] tracking-wider text-ink-300">
                  <ExpandIcon className="h-3.5 w-3.5" />
                  {t('about.photoHint')}
                </p>

                <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-12 sm:gap-6">
                  <figure className="col-span-2 sm:col-span-8">
                    <PhotoTile
                      photo={photos.garden}
                      aspect="aspect-[16/10]"
                      position="50% 50%"
                      onOpen={() => openPhoto('garden')}
                    />
                    <PhotoCaption index={0} label={captions[0] ?? '山水'} />
                  </figure>
                  <figure className="sm:col-span-4">
                    <PhotoTile photo={photos.hero} aspect="aspect-[4/3]" onOpen={() => openPhoto('hero')} />
                    <PhotoCaption index={1} label={captions[1] ?? '佛殿'} />
                  </figure>
                  <figure className="sm:col-span-4">
                    <PhotoTile
                      photo={photos.guanyin}
                      aspect="aspect-[4/3]"
                      position="50% 36%"
                      onOpen={() => openPhoto('guanyin')}
                    />
                    <PhotoCaption index={2} label={captions[2] ?? '观音'} />
                  </figure>
                  <figure className="sm:col-span-4">
                    <PhotoTile photo={photos.diamond} aspect="aspect-[4/3]" onOpen={() => openPhoto('diamond')} />
                    <PhotoCaption index={3} label={captions[3] ?? '写经'} />
                  </figure>
                  <figure className="sm:col-span-4">
                    <PhotoTile photo={photos.lotus} aspect="aspect-[4/3]" onOpen={() => openPhoto('lotus')} />
                    <PhotoCaption index={4} label={captions[4] ?? '莲池'} />
                  </figure>
                </div>
              </section>
            </Reveal>

            {/* ---------- 联系 ---------- */}
            <Reveal>
              <section id="contact" className="scroll-mt-24">
                <h2 className="section-title">{t('about.contactTitle')}</h2>
                <p className="mt-5 max-w-2xl font-song text-sm leading-loose text-ink-700">{t('about.contactDesc')}</p>
                <div className="mt-8 grid gap-6 sm:grid-cols-2">
                  <a
                    href="https://github.com/sethfengli/sethfengli.github.io/issues/new"
                    target="_blank"
                    rel="noreferrer"
                    className="card-link flex items-center gap-4 p-6"
                  >
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline text-celadon-600">
                      <MailIcon />
                    </span>
                    <span>
                      <span className="block font-song text-base text-ink-900">{t('about.contactEmail')}</span>
                      <span className="mt-1 block font-sans text-xs leading-relaxed text-ink-500">{t('about.contactEmailDesc')}</span>
                    </span>
                  </a>
                  <Link to="/articles" viewTransition className="card-link flex items-center gap-4 p-6">
                    <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs border border-hairline text-celadon-600">
                      <BookIcon />
                    </span>
                    <span>
                      <span className="block font-song text-base text-ink-900">{t('about.contactBrowse')}</span>
                      <span className="mt-1 block font-sans text-xs leading-relaxed text-ink-500">{t('about.contactBrowseDesc')}</span>
                    </span>
                  </Link>
                </div>
              </section>
            </Reveal>

            {/* ---------- FAQ ---------- */}
            <Reveal>
              <section id="faq" className="scroll-mt-24">
                <h2 className="section-title">{t('about.faqTitle')}</h2>
                <div className="mt-8 border-t border-hairline">
                  {faqs.map((f, i) => (
                    <div key={i} className="border-b border-hairline">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left transition-colors duration-200"
                        aria-expanded={openFaq === i}
                      >
                        <span className="font-song text-base font-normal tracking-tight text-ink-900">{f.q}</span>
                        <span
                          className={`shrink-0 text-cinnabar-600 transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}
                          aria-hidden
                        >
                          <PlusIcon />
                        </span>
                      </button>
                      {openFaq === i && (
                        <div className="pb-6">
                          <div className="max-w-2xl font-song text-sm leading-loose text-ink-500">{f.a}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>

            {/* ---------- 版权与技术 ---------- */}
            <Reveal>
              <section id="copyright" className="scroll-mt-24 grid gap-6 sm:grid-cols-2">
                <div className="card p-6">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.copyrightTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.copyright')}</p>
                </div>
                <div className="card p-6">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.techTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.techDesc')}</p>
                </div>
                <div className="card p-6 sm:col-span-2">
                  <h3 className="font-serif text-base font-normal tracking-tight text-ink-900">{t('about.creditsTitle')}</h3>
                  <p className="mt-3 font-song text-sm leading-[1.9] text-ink-500">{t('about.creditsDesc')}</p>
                  <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs">
                    <a href="/photos/cn/CREDITS.md" target="_blank" rel="noreferrer" className="text-cinnabar-600 underline underline-offset-4 transition-colors duration-200 hover:text-cinnabar-500">
                      public/photos/cn/CREDITS.md
                    </a>
                    <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer" className="text-cinnabar-600 underline underline-offset-4 transition-colors duration-200 hover:text-cinnabar-500">
                      public/audio/CREDITS.md
                    </a>
                  </p>
                </div>
              </section>
            </Reveal>
          </div>
        </div>

        {/* ---------- 灯传：慧灯 3D 在「慧灯常照，点亮心灯」之上 ---------- */}
        <Reveal className="mt-24 border-t border-hairline pt-16 lg:mt-32 lg:pt-20">
          <section id="lamp" className="scroll-mt-24 grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="section-kicker">{t('about.lampKicker')}</p>
              <h2 className="section-title mt-3">{t('about.lampTitle')}</h2>
              <p className="section-sub mt-5 max-w-md">{t('about.lampBody')}</p>
              <Link to="/prayer" viewTransition className="btn-secondary mt-8">
                {t('about.lampCta')}
              </Link>
            </div>
            <div className="flex justify-center lg:col-span-7">
              <Contained3D minHeight={400} placeholder={<HuiLamp className="h-[400px] w-full max-w-[440px]" />}>
                <Suspense fallback={<HuiLamp className="h-[400px] w-full max-w-[440px]" />}>
                  <Lamp3D
                    heightClass="h-[400px] w-full max-w-[440px]"
                    fallback={<HuiLamp className="h-[400px] w-full max-w-[440px]" />}
                  />
                </Suspense>
              </Contained3D>
            </div>
          </section>
        </Reveal>

        <div className="mt-20 flex flex-col items-center gap-6">
          <Ornament />
          <p className="text-center font-song text-sm text-ink-500">「{t('slogan')}」</p>
        </div>
      </Section>

      <PhotoLightbox key={viewer ?? 'closed'} items={viewerItems} index={viewer} onClose={() => setViewer(null)} />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-song text-3xl font-normal tracking-tight text-cinnabar-600">{value}</p>
      <p className="mt-2 font-sans text-xs tracking-widest text-ink-500">{label}</p>
    </div>
  )
}

function ExpandIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
  )
}

function ArrowUpRight({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  )
}
