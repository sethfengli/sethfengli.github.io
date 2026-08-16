import { useState } from 'react'
import { useI18n } from '../../i18n'
import { applySiteTheme, loadSiteTheme, type SiteTheme } from '../../lib/siteTheme'

const OPTIONS: Array<{
  id: SiteTheme
  labelKey: 'theme.rice' | 'theme.vermilion' | 'theme.celadon' | 'theme.night'
  swatches: string[]
}> = [
  { id: 'rice', labelKey: 'theme.rice', swatches: ['#fbf8f0', '#c9a227', '#6b4425'] },
  { id: 'vermilion', labelKey: 'theme.vermilion', swatches: ['#f5e9d8', '#93363a', '#c9a227'] },
  { id: 'celadon', labelKey: 'theme.celadon', swatches: ['#e6efea', '#47705d', '#8c2f39'] },
  { id: 'night', labelKey: 'theme.night', swatches: ['#22252d', '#c9a227', '#ecd9b8'] },
]

/** 佛教配色主题切换器（Header 内使用） */
export function ThemeSwitcher() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<SiteTheme>(loadSiteTheme)

  const pick = (id: SiteTheme) => {
    setCurrent(id)
    applySiteTheme(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('theme.label')}
        title={t('theme.label')}
        className="cursor-pointer rounded-full border border-sandalwood-300/70 px-3 py-1.5 text-xs font-medium text-sandalwood-700 transition hover:border-gold-500 hover:bg-gold-50"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="flex -space-x-1" aria-hidden>
            {OPTIONS.find((o) => o.id === current)!.swatches.map((s) => (
              <span key={s} className="h-3 w-3 rounded-full border border-ink-100/60" style={{ background: s }} />
            ))}
          </span>
          <span className="hidden sm:inline">🎨</span>
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            aria-label={t('theme.label')}
            className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-sandalwood-200/70 bg-surface p-2 shadow-xl"
          >
            <p className="px-3 pt-1 pb-2 text-[11px] tracking-wider text-sandalwood-400 uppercase">{t('theme.label')}</p>
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={current === o.id}
                onClick={() => pick(o.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-rice-100 ${
                  current === o.id ? 'font-semibold text-tibetan-600' : 'text-ink-700'
                }`}
              >
                <span className="flex -space-x-1" aria-hidden>
                  {o.swatches.map((s) => (
                    <span key={s} className="h-4 w-4 rounded-full border border-ink-100/50" style={{ background: s }} />
                  ))}
                </span>
                {t(o.labelKey)}
                {current === o.id && <span className="ml-auto text-tibetan-600">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
