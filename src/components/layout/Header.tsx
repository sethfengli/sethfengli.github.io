import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { LotusMark } from '../zen/LotusMark'

const NAV = [
  { to: '/', key: 'home' },
  { to: '/articles', key: 'articles' },
  { to: '/dharma', key: 'dharma' },
  { to: '/prayer', key: 'prayer' },
  { to: '/lots', key: 'lots' },
  { to: '/about', key: 'about' },
] as const

export function Header() {
  const { t, lang, toggleLang } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-sandalwood-200/70 bg-rice-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <LotusMark className="h-9 w-9" />
          <span className="flex flex-col leading-none">
            <span className="font-serif text-lg font-bold tracking-wider text-sandalwood-800">
              {t('appName')}
            </span>
            <span className="mt-0.5 text-[10px] tracking-[0.22em] text-sandalwood-400 uppercase">
              {lang === 'zh' ? 'Huideng Zen Temple' : '慧灯禅院'}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="主导航">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm transition ${
                  isActive
                    ? 'bg-sandalwood-100 font-semibold text-sandalwood-800'
                    : 'text-ink-700 hover:bg-sandalwood-50 hover:text-sandalwood-700'
                }`
              }
            >
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="cursor-pointer rounded-full border border-sandalwood-300/70 px-3 py-1.5 text-xs font-medium text-sandalwood-700 transition hover:border-gold-500 hover:bg-gold-50"
            title={t('langSwitchTitle')}
          >
            {t('langLabel')}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-lg p-2 text-sandalwood-700 transition hover:bg-sandalwood-100 lg:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              {open ? (
                <>
                  <path d="M6 6l12 12M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-sandalwood-200/60 bg-rice-50 px-4 pt-2 pb-4 lg:hidden" aria-label="移动导航">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2.5 text-sm ${
                      isActive
                        ? 'bg-sandalwood-100 font-semibold text-sandalwood-800'
                        : 'text-ink-700 hover:bg-sandalwood-50'
                    }`
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}
