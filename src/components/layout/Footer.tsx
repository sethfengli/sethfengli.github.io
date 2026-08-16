import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { PhotoLogo } from '../zen/PhotoLogo'

const NAV = [
  { to: '/', key: 'home' },
  { to: '/articles', key: 'articles' },
  { to: '/dharma', key: 'dharma' },
  { to: '/prayer', key: 'prayer' },
  { to: '/lots', key: 'lots' },
  { to: '/about', key: 'about' },
] as const

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-sandalwood-200/70 bg-sandalwood-900 text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <PhotoLogo className="h-10 w-10" />
            <div className="leading-tight">
              <p className="font-serif text-xl font-bold tracking-wider text-gold-300">{t('appName')}</p>
              <p className="text-[11px] tracking-[0.25em] text-paper/60 uppercase">{t('appNameEn')}</p>
            </div>
          </div>
          <p className="mt-4 max-w-md font-serif text-sm leading-relaxed text-paper/80">{t('common.footerIntro')}</p>
          <p className="mt-3 font-serif text-xs text-gold-300/90">「{t('slogan')}」</p>
        </div>

        <nav aria-label="页脚导航">
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-widest text-gold-300">{t('common.footerNav')}</h3>
          <ul className="space-y-2 text-sm text-paper/75">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition hover:text-gold-300">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-3 font-sans text-sm font-semibold tracking-widest text-gold-300">{t('common.footerMore')}</h3>
          <ul className="space-y-2 text-sm text-paper/75">
            <li>
              <a
                href="https://github.com/sethfengli/sethfengli.github.io"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-gold-300"
              >
                GitHub Repository
              </a>
            </li>
            <li>
              <a
                href="https://github.com/sethfengli/sethfengli.github.io/issues/new"
                target="_blank"
                rel="noreferrer"
                className="transition hover:text-gold-300"
              >
                {t('about.contactEmail')}
              </a>
            </li>
            <li>
              <Link to="/about" className="transition hover:text-gold-300">
                {t('about.contactTitle')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-5 text-center text-xs text-paper/55 sm:px-6">
          <p>{t('common.footerCopyright', { year })}</p>
          <p>{t('common.footerDisclaimer')}</p>
          <p className="font-sans tracking-wide">{t('common.footerBuilt')}</p>
        </div>
      </div>
    </footer>
  )
}
