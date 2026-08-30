import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { PhotoLogo } from '../zen/PhotoLogo'
import { ThemeSwitcher } from './ThemeSwitcher'

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
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

  // 滚动后收窄、提实底色（毛玻璃 + 阴影）
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 路由变化时收起移动菜单
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'border-sandalwood-200/80 bg-rice-50/95 shadow-sm shadow-sandalwood-900/5 backdrop-blur-lg'
          : 'border-sandalwood-200/60 bg-rice-50/85 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" viewTransition className="group flex items-center gap-2.5" aria-label={t('appName')}>
          <PhotoLogo className="h-9 w-9 transition-transform duration-300 group-hover:scale-105" />
          <span className="flex flex-col leading-none">
            <span className="font-brush text-xl tracking-wider text-sandalwood-800">
              {t('appName')}
            </span>
            <span className="mt-0.5 text-[10px] tracking-[0.22em] text-sandalwood-400 uppercase">
              {lang === 'zh' ? 'Huideng Zen Temple' : '慧灯禅院'}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={t('common.mainNav')}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              viewTransition
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-sm transition duration-200 ${
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
          <ThemeSwitcher />
          <button
            type="button"
            onClick={toggleLang}
            className="cursor-pointer rounded-full border border-sandalwood-300/70 px-3 py-1.5 text-xs font-medium text-sandalwood-700 transition duration-200 hover:border-gold-500 hover:bg-gold-50"
            title={t('langSwitchTitle')}
          >
            {t('langLabel')}
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-full p-2 text-sandalwood-700 transition hover:bg-sandalwood-100 lg:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="mobile-nav"
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

      {/* 移动端菜单（滑下淡入） */}
      <div
        id="mobile-nav"
        inert={!open}
        className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <nav className="border-t border-sandalwood-200/60 px-4 pt-2 pb-4" aria-label={t('common.mobileNav')}>
            <ul className="flex flex-col gap-0.5">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    viewTransition
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-xl px-4 py-2.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-sandalwood-100 font-semibold text-sandalwood-800'
                          : 'text-ink-700 hover:bg-sandalwood-50 hover:text-sandalwood-700'
                      }`
                    }
                  >
                    {t(`nav.${item.key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
