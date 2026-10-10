import { useState } from 'react'
import { useI18n } from '../../i18n'
import { applySiteTheme, loadSiteTheme, type SiteTheme } from '../../lib/siteTheme'

const OPTIONS: Array<{
  id: SiteTheme
  labelKey: 'theme.rice' | 'theme.vermilion' | 'theme.celadon' | 'theme.night'
  swatches: string[]
}> = [
  { id: 'rice', labelKey: 'theme.rice', swatches: ['#fbfaf7', '#789085', '#b8382e'] },
  { id: 'vermilion', labelKey: 'theme.vermilion', swatches: ['#faf6f2', '#8a6e5e', '#c1362b'] },
  { id: 'celadon', labelKey: 'theme.celadon', swatches: ['#f8fbf9', '#559278', '#b8382e'] },
  { id: 'night', labelKey: 'theme.night', swatches: ['#14161a', '#ab8940', '#ebe9e4'] },
]

/** 配色主题切换器（Header 内使用）：细边小签 + 方形色块，无胶囊、无投影 */
export function ThemeSwitcher() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<SiteTheme>(loadSiteTheme)

  const pick = (id: SiteTheme) => {
    setCurrent(id)
    applySiteTheme(id)
    setOpen(false)
  }

  const currentOption = OPTIONS.find((o) => o.id === current)!

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t('theme.label')}
        title={t('theme.label')}
        className="flex cursor-pointer items-center gap-1.5 rounded-xs border border-hairline px-2.5 py-1.5 transition-colors duration-200 hover:border-celadon-500"
      >
        <span className="flex gap-0.5" aria-hidden>
          {currentOption.swatches.map((s) => (
            <span key={s} className="h-3 w-1.5 rounded-xs border border-ink-900/10" style={{ background: s }} />
          ))}
        </span>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 text-ink-300" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            aria-label={t('theme.label')}
            className="absolute right-0 z-50 mt-2 w-44 rounded-card border border-hairline bg-surface p-1"
          >
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={current === o.id}
                onClick={() => pick(o.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left font-sans text-sm transition-colors ${
                  current === o.id ? 'text-cinnabar-600' : 'text-ink-700 hover:bg-rice-100'
                }`}
              >
                <span className="flex gap-0.5" aria-hidden>
                  {o.swatches.map((s) => (
                    <span key={s} className="h-4 w-1.5 rounded-xs border border-ink-900/10" style={{ background: s }} />
                  ))}
                </span>
                {t(o.labelKey)}
                {current === o.id && (
                  <svg viewBox="0 0 24 24" className="ml-auto h-3.5 w-3.5 text-cinnabar-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5l5.5 5.5L20 6.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
