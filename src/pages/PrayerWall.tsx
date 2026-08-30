import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useI18n, type I18nCtx } from '../i18n'
import { createWishRepository, type Wish } from '../lib/wishes'
import { downloadFile, getDeviceId } from '../lib/storage'
import { WishTree } from '../components/zen/WishTree'
import { Tree3D } from '../components/zen3d/Tree3D'
import { PageBanner } from '../components/ui/PageBanner'

const MAX_WISH = 120
const TREE_CAPACITY = 24

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

  return (
    <div>
      {/* 页头（明亮浅色调 + 漂浮灯火） */}
      <PageBanner
        image="/photos/lantern.jpg"
        kicker={t('prayer.kicker')}
        title={t('prayer.title')}
        subtitle={t('prayer.subtitle')}
        decor={
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {Array.from({ length: 18 }).map((_, i) => (
              <span
                key={i}
                className="absolute animate-glow rounded-full bg-gold-400"
                style={{
                  width: `${3 + (i % 4)}px`,
                  height: `${3 + (i % 4)}px`,
                  left: `${(i * 53) % 100}%`,
                  top: `${(i * 31) % 100}%`,
                  animationDelay: `${(i % 6) * 0.6}s`,
                  opacity: 0.55,
                }}
              />
            ))}
          </div>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="space-y-10">
          {/* ---------- 供灯表单（居中，树在上方通栏展示） ---------- */}
          <aside className="mx-auto w-full max-w-2xl">
            <div className="rounded-3xl border border-sandalwood-200/70 bg-surface p-6 shadow-md">
              <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-sandalwood-800">
                <span aria-hidden>🪔</span>
                {t('prayer.formTitle')}
              </h2>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="wish-name" className="mb-1.5 block text-sm text-sandalwood-700">
                    {t('prayer.nameLabel')}
                  </label>
                  <input
                    id="wish-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={40}
                    placeholder={t('prayer.namePlaceholder')}
                    className="w-full rounded-xl border border-sandalwood-300/70 bg-rice-50 px-4 py-2.5 font-serif text-sm text-ink-900 placeholder:text-ink-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="wish-text" className="mb-1.5 block text-sm text-sandalwood-700">
                    {t('prayer.wishLabel')}
                  </label>
                  <textarea
                    id="wish-text"
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_WISH))}
                    rows={4}
                    maxLength={MAX_WISH}
                    placeholder={t('prayer.wishPlaceholder')}
                    className="w-full resize-none rounded-xl border border-sandalwood-300/70 bg-rice-50 px-4 py-2.5 font-serif text-sm leading-relaxed text-ink-900 placeholder:text-ink-300 focus:border-gold-500 focus:ring-2 focus:ring-gold-300 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-xs text-sandalwood-400">
                    {t('prayer.wishCounter', { n: text.length })}
                  </p>
                </div>
                {error && <p className="text-sm text-tibetan-600">{error}</p>}
                <button type="submit" className="btn-primary w-full">
                  <span aria-hidden>🪔</span>
                  {t('prayer.submit')}
                </button>
              </form>
              <p className="mt-4 rounded-xl bg-rice-100/80 p-3 text-xs leading-relaxed text-sandalwood-600">
                🔒 {t('prayer.privacyNote')}
              </p>
            </div>

            {/* 备份工具 */}
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-sandalwood-200/70 bg-surface p-4">
              <button type="button" onClick={exportJson} className="btn-secondary !px-4 !py-1.5 text-xs">
                ⤓ {t('prayer.export')}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary !px-4 !py-1.5 text-xs"
              >
                ⤒ {t('prayer.import')}
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
              <span className="text-xs text-sandalwood-400">{t('prayer.wishCount', { n: wishes.length })}</span>
            </div>
          </aside>

          {/* ---------- 许愿树 ---------- */}
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl font-bold text-sandalwood-800">{t('prayer.wallTitle')}</h2>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-sandalwood-700">
                <input
                  type="checkbox"
                  checked={mineOnly}
                  onChange={(e) => setMineOnly(e.target.checked)}
                  className="h-4 w-4 accent-tibetan-600"
                />
                {t('prayer.mineOnly')}
              </label>
            </div>
            <p className="mt-2 font-serif text-xs leading-relaxed text-sandalwood-500">{t('prayer.treeHint')}</p>

            {/* 许愿树（始终展示，无愿望时以提示语引导） */}
            <div className="mt-6 rounded-3xl border border-sandalwood-200/70 bg-gradient-to-b from-moon-50 to-rice-100/60 p-3 shadow-inner sm:p-5">
              <Tree3D
                wishes={onTree}
                onRibbonClick={setSelected}
                fallback={<WishTree wishes={onTree} onRibbonClick={setSelected} />}
              />
            </div>
            {shown.length === 0 && (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-sandalwood-200 bg-rice-100/40 px-6 py-4 text-center">
                <p className="font-serif text-sm text-sandalwood-600">{t('prayer.wallEmpty')}</p>
              </div>
            )}

            {/* 其余心愿 */}
            {rest.length > 0 && (
              <div className="mt-8">
                <h3 className="font-serif text-sm font-bold text-sandalwood-700">
                  {t('prayer.moreWishes')}（{rest.length}）
                </h3>
                <ul className="mt-4 space-y-3">
                  {rest.map((w) => (
                    <li key={w.id} className="rounded-2xl border border-sandalwood-200/60 bg-surface p-4">
                      <p className="font-serif text-sm leading-relaxed text-ink-900">{w.text}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-sandalwood-500">
                        <span className="font-serif">{w.name} · {formatAgo(w.createdAt, t)}</span>
                        {w.owner === deviceId && (
                          <button
                            type="button"
                            onClick={() => void remove(w.id)}
                            className="cursor-pointer text-tibetan-500 underline underline-offset-2 transition hover:text-tibetan-700"
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
          <div className="absolute inset-0 bg-sandalwood-950/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-gold-400/40 bg-surface p-7 shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-gold-300 to-gold-500 text-2xl shadow-md">
              🪔
            </div>
            <p className="mt-5 text-center font-serif text-lg leading-relaxed text-ink-900">{selected.text}</p>
            <p className="mt-4 text-center font-serif text-sm text-sandalwood-600">
              —— {selected.name} · {formatAgo(selected.createdAt, t)}
            </p>
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
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up rounded-full bg-sandalwood-900/95 px-6 py-3 font-serif text-sm text-gold-200 shadow-xl">
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
