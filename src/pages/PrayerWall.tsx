import { lazy, useCallback, useEffect, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { useI18n, type I18nCtx } from '../i18n'
import { NAMED_PHOTOS } from '../lib/content'
import { createWishRepository, type Wish } from '../lib/wishes'
import { downloadFile, getDeviceId } from '../lib/storage'
import { WishTree } from '../components/zen/WishTree'
import type { Props as Tree3DProps } from '../components/zen3d/Tree3D'
import { Contained3D } from '../components/zen3d/Contained3D'
import { PageBanner } from '../components/ui/PageBanner'

/**
 * 3D 许愿树按需加载（第 9 轮）：three.js（707 KB）不再进首屏。
 * `Tree3D` 原本就接受 `fallback`（水墨 SVG 许愿树），这里再用 Suspense 把
 * 「还在下载 three.js」这段也交给同一棵 SVG 树，因此任何阶段都不会出现空白。
 * 类型取自真实组件（`import type` 不产生运行时代码）。
 */
const Tree3D = lazy(() =>
  import('../components/zen3d/Tree3D').then((m) => ({ default: m.Tree3D })),
) as ComponentType<Tree3DProps>

const MAX_WISH = 120
const TREE_CAPACITY = 24

/** 供灯图形：灯盏 + 火苗，细线内联 SVG（取代旧版 emoji） */
function LampIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <path d="M12 10.5c-1.9 1.8-2.6 3.1-2.6 4.3a2.6 2.6 0 0 0 5.2 0c0-1.2-.7-2.5-2.6-4.3Z" />
      <path d="M3.5 18c2.4-1.1 5.3-1.7 8.5-1.7s6.1.6 8.5 1.7" />
      <path d="M12 10.5V7.5" />
      <path d="M9.5 4.5c0-1 .8-2 2.5-2s2.5 1 2.5 2" />
    </svg>
  )
}

/** 下载 / 上传图形：细线内联 SVG（取代旧版箭头字符） */
function ArrowIcon({ up = false, className = 'h-3.5 w-3.5' }: { up?: boolean; className?: string }) {
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
      {up ? (
        <>
          <path d="M12 19V5" />
          <path d="M6 11l6-6 6 6" />
        </>
      ) : (
        <>
          <path d="M12 5v14" />
          <path d="M18 13l-6 6-6-6" />
        </>
      )}
    </svg>
  )
}

/** 锁形图形：细线内联 SVG，用于隐私说明（取代旧版 emoji） */
function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
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
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="1" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <path d="M12 14.5v2" />
    </svg>
  )
}

export function PrayerWall() {
  const { t } = useI18n()
  const repoRef = useRef(createWishRepository())
  const [wishes, setWishes] = useState<Wish[]>([])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [selected, setSelected] = useState<Wish | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<number>(0)

  const refresh = useCallback(() => {
    void repoRef.current.list().then(setWishes)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 3200)
  }

  const deviceId = getDeviceId()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(t('prayer.nameRequired'))
      return
    }
    if (!text.trim()) {
      setError(t('prayer.wishRequired'))
      return
    }
    setError('')
    const wish = await repoRef.current.create({ name: name.trim(), text: text.trim() })
    setWishes((prev) => [wish, ...prev])
    setName('')
    setText('')
    showToast(t('prayer.lampLit'))
  }

  const remove = async (id: string) => {
    if (!window.confirm(t('prayer.deleteConfirm'))) return
    if (await repoRef.current.remove(id)) {
      setWishes((prev) => prev.filter((w) => w.id !== id))
      setSelected(null)
    }
  }

  const exportJson = () => {
    downloadFile(
      `${t('prayer.backupPrefix')}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ app: 'huideng-chanlin', version: 1, wishes }, null, 2),
    )
    showToast(t('prayer.exportDone', { n: wishes.length }))
  }

  const importJson = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { wishes?: Wish[] } | Wish[]
        const list = Array.isArray(parsed) ? parsed : (parsed.wishes ?? [])
        void repoRef.current.importMany(list).then((n) => {
          if (n > 0) {
            refresh()
            showToast(t('prayer.importDone', { n }))
          } else {
            showToast(t('prayer.importNone'))
          }
        })
      } catch {
        showToast(t('prayer.importError'))
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const shown = mineOnly ? wishes.filter((w) => w.owner === deviceId) : wishes
  const onTree = shown.slice(0, TREE_CAPACITY)
  const rest = shown.slice(TREE_CAPACITY)

  const fieldClass =
    'w-full rounded-xs border border-hairline bg-rice-50 px-4 py-2.5 font-song text-sm text-ink-900 placeholder:text-ink-300 focus:border-cinnabar-500 focus:outline-none'

  return (
    <div>
      {/* 页头（图文并置，无漂浮灯火装饰） */}
      <PageBanner
        image={NAMED_PHOTOS.lantern()}
        kicker={t('prayer.kicker')}
        title={t('prayer.title')}
        subtitle={t('prayer.subtitle')}
      />

      <div className="container-page py-16 sm:py-20">
        {/* 桌面：左「供灯」表单吸附 / 右许愿树；移动端：先表单后树 */}
        <div className="lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-14">
          <aside className="lg:sticky lg:top-24">
            <div className="card p-7 sm:p-8">
              <h2 className="flex items-center gap-3 font-serif text-lg font-normal tracking-tight text-ink-900">
                <span aria-hidden className="seal px-1 py-0.5 leading-none">
                  <LampIcon className="h-3.5 w-3.5" />
                </span>
                {t('prayer.formTitle')}
              </h2>
              <form onSubmit={submit} className="mt-7 space-y-6">
                <div>
                  <label htmlFor="wish-name" className="mb-2 block font-sans text-xs tracking-wider text-ink-500">
                    {t('prayer.nameLabel')}
                  </label>
                  <input
                    id="wish-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    placeholder={t('prayer.namePlaceholder')}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="wish-text" className="mb-2 block font-sans text-xs tracking-wider text-ink-500">
                    {t('prayer.wishLabel')}
                  </label>
                  <textarea
                    id="wish-text"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_WISH))}
                    rows={4}
                    maxLength={MAX_WISH}
                    placeholder={t('prayer.wishPlaceholder')}
                    className={`${fieldClass} resize-none leading-relaxed`}
                  />
                  <p className="mt-2 text-right font-sans text-xs text-ink-300">
                    {t('prayer.wishCounter', { n: text.length })}
                  </p>
                </div>
                {error && <p className="font-sans text-sm text-cinnabar-600">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  <LampIcon className="h-4 w-4" />
                  {t('prayer.submit')}
                </button>
              </form>
              <p className="mt-6 flex items-start gap-2.5 border-t border-hairline pt-5 font-sans text-xs leading-relaxed text-ink-500">
                <LockIcon className="mt-px h-4 w-4 shrink-0 text-celadon-500" />
                <span>{t('prayer.privacyNote')}</span>
              </p>
            </div>

            {/* 备份工具 */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border border-hairline bg-surface p-4">
              <button type="button" onClick={exportJson} className="btn-secondary !px-4 !py-1.5 text-xs">
                <ArrowIcon />
                {t('prayer.export')}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary !px-4 !py-1.5 text-xs"
              >
                <ArrowIcon up />
                {t('prayer.import')}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) importJson(f)
                  e.target.value = ''
                }}
              />
              <span className="font-sans text-xs text-ink-300">{t('prayer.wishCount', { n: wishes.length })}</span>
            </div>
          </aside>

          {/* ---------- 许愿树 ---------- */}
          <section className="mt-14 lg:mt-0">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
              <h2 className="section-title">{t('prayer.wallTitle')}</h2>
              <label className="flex cursor-pointer items-center gap-2.5 font-sans text-sm text-ink-500">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                  className="h-4 w-4 accent-cinnabar-600"
                />
                {t('prayer.mineOnly')}
              </label>
            </div>
            <p className="mt-4 font-song text-xs leading-relaxed text-ink-500">{t('prayer.treeHint')}</p>

            {/* 许愿树（始终展示，无愿望时以提示语引导） */}
            <div className="mt-8 rounded-card border border-hairline bg-rice-100/50 p-3 sm:p-5">
              <Contained3D minHeight={420} placeholder={<WishTree wishes={onTree} onRibbonClick={setSelected} />}>
                <Tree3D
                  wishes={onTree}
                  onRibbonClick={setSelected}
                  fallback={<WishTree wishes={onTree} onRibbonClick={setSelected} />}
                />
              </Contained3D>
            </div>
            {shown.length === 0 && (
              <div className="mt-6 border border-hairline px-6 py-5 text-center">
                <p className="font-song text-sm text-ink-500">{t('prayer.wallEmpty')}</p>
              </div>
            )}

            {/* 其余心愿 */}
            {rest.length > 0 && (
              <div className="mt-14">
                <h3 className="font-sans text-xs tracking-[0.3em] text-ink-500 uppercase">
                  {t('prayer.moreWishes')}（{rest.length}）
                </h3>
                <ul className="mt-6 border-t border-hairline">
                  {rest.map((w) => (
                    <li key={w.id} className="border-b border-hairline py-5">
                      <p className="font-song text-sm leading-[1.9] text-ink-900">{w.text}</p>
                      <div className="mt-3 flex items-center justify-between font-sans text-xs text-ink-500">
                        <span className="font-song">{w.name} · {formatAgo(w.createdAt, t)}</span>
                        {w.owner === deviceId && (
                          <button
                            type="button"
                            onClick={() => void remove(w.id)}
                            className="cursor-pointer text-cinnabar-600 underline underline-offset-4 transition-colors duration-200 hover:text-cinnabar-700"
                          >
                            {t('prayer.delete')}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 飘带详情 */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-celadon-950/75" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md animate-fade-up rounded-card border border-hairline bg-surface p-7 shadow-lift sm:p-8">
            <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-xs bg-cinnabar-600 text-paper">
              <LampIcon className="h-6 w-6" />
            </span>
            <p className="mt-6 text-center font-song text-lg leading-[1.9] text-ink-900">{selected.text}</p>
            <p className="mt-4 text-center font-song text-sm text-ink-500">
              —— {selected.name} · {formatAgo(selected.createdAt, t)}
            </p>
            <hr className="hairline mt-7" />
            <div className="mt-6 flex items-center justify-center gap-3">
              <button type="button" onClick={() => setSelected(null)} className="btn-secondary !px-5 !py-2 text-sm">
                {t('nav.closeMenu')}
              </button>
              {selected.owner === deviceId && (
                <button type="button" onClick={() => void remove(selected.id)} className="btn-primary !px-5 !py-2 text-sm">
                  {t('prayer.delete')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 轻提示 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-xs border border-paper/15 bg-celadon-950 px-6 py-3 font-song text-sm text-paper">
          {toast}
        </div>
      )}
    </div>
  )
}

type TFunc = I18nCtx['t']

function formatAgo(ts: number, t: TFunc): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return t('prayer.fresh')
  if (min < 60) return t('prayer.minutesAgo', { n: min })
  const hours = Math.floor(min / 60)
  if (hours < 24) return t('prayer.hoursAgo', { n: hours })
  return t('prayer.daysAgo', { n: Math.floor(hours / 24) })
}
