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

/**
 * 站头（新中式极简）：
 * - 常驻实底 + 单条发丝下边线，取消毛玻璃与投影；
 * - 导航为文字 + 短朱砂下划线（非胶囊按钮）；
 * - 品牌字用宋体大字距，书法体不再出现在页头。
 */
export function Header() {
  const { t, lang, toggleLang } = useI18n()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()

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
      className={`sticky top-0 z-40 border-b bg-rice-50 transition-colors duration-300 ${
        scrolled ? 'border-hairline' : 'border-transparent'
      }`}
    >
      <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center gap-4 lg:gap-6">
        <Link to="/" viewTransition className="group flex min-w-0 items-center gap-2.5" aria-label={t('appName')}>
          <PhotoLogo className="h-8 w-8 transition-opacity duration-300 group-hover:opacity-80" />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="font-serif text-base font-normal tracking-[0.12em] whitespace-nowrap text-ink-900 sm:text-lg sm:tracking-[0.2em]">
              {t('appName')}
            </span>
            <span className="mt-1 font-sans text-[9px] tracking-[0.28em] text-ink-300 uppercase">
              {lang === 'zh' ? 'Huideng Zen Temple' : '慧灯禅院'}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-6 lg:flex xl:gap-8" aria-label={t('common.mainNav')}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              viewTransition
              className={({ isActive }) =>
                `relative py-1.5 font-sans text-[13px] whitespace-nowrap transition-colors duration-200 after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-tibetan-600 after:transition-transform after:duration-300 xl:text-sm ${
                  isActive
                    ? 'text-ink-900 after:scale-x-100'
                    : 'text-ink-500 after:scale-x-0 hover:text-ink-900 hover:after:scale-x-100'
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
            className="cursor-pointer rounded-xs border border-hairline px-2.5 py-1.5 font-sans text-xs text-ink-500 transition-colors duration-200 hover:border-sandalwood-500 hover:text-ink-900"
            title={t('langSwitchTitle')}
          >
            {t('langLabel')}
          </button>
          <button
            type="button"
            className="-mr-1.5 cursor-pointer p-2 text-ink-700 transition-colors hover:text-tibetan-600 lg:hidden"
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
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

      {/* 移动端菜单（滑下淡入，细线分隔，无胶囊） */}
      <div
        id="mobile-nav"
        inert={!open}
        className={`grid overflow-hidden border-hairline bg-rice-50 transition-[grid-template-rows,opacity] duration-300 ease-out lg:hidden ${
          open ? 'grid-rows-[1fr] border-t opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0">
          <nav className="px-5 py-3 sm:px-6" aria-label={t('common.mobileNav')}>
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.to} className="border-b border-hairline last:border-b-0">
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    viewTransition
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between py-3 font-sans text-sm transition-colors ${
                        isActive ? 'text-tibetan-600' : 'text-ink-700 hover:text-ink-900'
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
