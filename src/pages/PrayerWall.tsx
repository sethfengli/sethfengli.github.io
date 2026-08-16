import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useI18n, type I18nCtx } from '../i18n'
import { createWishRepository, type Wish } from '../lib/wishes'
import { downloadFile, getDeviceId } from '../lib/storage'

const MAX_WISH = 120

export function PrayerWall() {
  const { t } = useI18n()
  const repoRef = useRef(createWishRepository())
  const [wishes, setWishes] = useState<Wish[]>([])
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [justLit, setJustLit] = useState<string | null>(null)
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
    setJustLit(wish.id)
    window.setTimeout(() => setJustLit(null), 2600)
    setName('')
    setText('')
    showToast(t('prayer.lampLit'))
  }

  const remove = async (id: string) => {
    if (!window.confirm(t('prayer.deleteConfirm'))) return
    if (await repoRef.current.remove(id)) {
      setWishes((prev) => prev.filter((w) => w.id !== id))
    }
  }

  const exportJson = () => {
    downloadFile(
      `慧灯禅院-祈福备份-${new Date().toISOString().slice(0, 10)}.json`,
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

  return (
    <div>
      {/* 页头 */}
      <header className="relative overflow-hidden bg-gradient-to-b from-tibetan-800 to-tibetan-900 py-16 text-center text-rice-50">
        <div className="pointer-events-none absolute inset-0">
          {/* 星点灯光背景 */}
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="absolute animate-glow rounded-full bg-gold-300"
              style={{
                width: `${3 + (i % 4)}px`,
                height: `${3 + (i % 4)}px`,
                left: `${(i * 53) % 100}%`,
                top: `${(i * 31) % 100}%`,
                animationDelay: `${(i % 6) * 0.6}s`,
                opacity: 0.5,
              }}
            />
          ))}
        </div>
        <div className="relative">
          <p className="font-serif text-sm tracking-[0.5em] text-gold-300">供 灯</p>
          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">{t('prayer.title')}</h1>
          <p className="mt-3 font-serif text-sm text-rice-100/85">{t('prayer.subtitle')}</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* ---------- 供灯表单 ---------- */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-sandalwood-200/70 bg-white p-6 shadow-md">
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
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-sandalwood-200/70 bg-white p-4">
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

          {/* ---------- 愿望灯海 ---------- */}
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

            {shown.length === 0 ? (
              <div className="mt-10 rounded-3xl border-2 border-dashed border-sandalwood-200 bg-rice-100/50 p-14 text-center">
                <div className="mx-auto h-16 w-16 animate-glow rounded-full bg-gold-200/70 text-3xl leading-[4rem]">🪔</div>
                <p className="mt-5 font-serif text-sandalwood-600">{t('prayer.wallEmpty')}</p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {shown.map((w, idx) => (
                  <article
                    key={w.id}
                    className={`relative rounded-2xl border border-gold-300/50 bg-gradient-to-br from-rice-50 to-rice-100/80 p-5 shadow-sm transition hover:shadow-md ${
                      justLit === w.id ? 'ring-2 ring-gold-400 animate-fade-up' : ''
                    }`}
                    style={{ animationDelay: `${Math.min(idx, 8) * 0.06}s` }}
                  >
                    {/* 灯焰 */}
                    <div className="absolute -top-3 left-5 flex flex-col items-center">
                      <span className="h-5 w-3.5 animate-candle rounded-t-full bg-gradient-to-t from-gold-500 via-gold-300 to-rice-100 shadow-[0_0_12px_2px_rgba(201,162,39,0.55)]" />
                      <span className="h-2.5 w-5 rounded-b-md bg-gold-600/80" />
                    </div>
                    <p className="mt-3 font-serif text-[15px] leading-relaxed text-ink-900">{w.text}</p>
                    <div className="mt-4 flex items-center justify-between border-t border-sandalwood-200/60 pt-3 text-xs text-sandalwood-500">
                      <span className="font-serif">{w.name}</span>
                      <span className="flex items-center gap-3">
                        <time dateTime={new Date(w.createdAt).toISOString()}>{formatAgo(w.createdAt, t)}</time>
                        {w.owner === deviceId && (
                          <button
                            type="button"
                            onClick={() => void remove(w.id)}
                            className="cursor-pointer text-tibetan-500 underline underline-offset-2 transition hover:text-tibetan-700"
                          >
                            {t('prayer.delete')}
                          </button>
                        )}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

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
