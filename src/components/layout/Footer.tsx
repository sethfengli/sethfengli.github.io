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

/**
 * 页脚（新中式极简）：深墨底 + 发丝分隔 + 朱砂小标，
 * 取消金色渐变线与书法体大标题，改为宋体字距标题。
 */
export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-sandalwood-950 text-paper">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <PhotoLogo className="h-9 w-9" />
            <div className="leading-tight">
              <p className="font-serif text-lg tracking-[0.18em] text-paper">{t('appName')}</p>
              <p className="mt-1 font-sans text-[9px] tracking-[0.28em] text-paper/45 uppercase">{t('appNameEn')}</p>
            </div>
          </div>
          <p className="mt-6 max-w-md font-serif text-sm leading-relaxed text-paper/70">{t('common.footerIntro')}</p>
          <p className="mt-4 font-serif text-xs tracking-wide text-paper/45">「{t('slogan')}」</p>
        </div>

        <nav aria-label={t('common.footerNav')}>
          <h3 className="font-sans text-[11px] tracking-[0.28em] text-tibetan-400 uppercase">{t('common.footerNav')}</h3>
          <ul className="mt-5 space-y-3 font-sans text-sm">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  viewTransition
                  className="text-paper/70 transition-colors duration-200 hover:text-paper"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="font-sans text-[11px] tracking-[0.28em] text-tibetan-400 uppercase">{t('common.footerMore')}</h3>
          <ul className="mt-5 space-y-3 font-sans text-sm">
            <li>
              <a
                href="https://github.com/sethfengli/sethfengli.github.io"
                target="_blank"
                rel="noreferrer"
                className="text-paper/70 transition-colors duration-200 hover:text-paper"
              >
                GitHub Repository
              </a>
            </li>
            <li>
              <a
                href="https://github.com/sethfengli/sethfengli.github.io/issues/new"
                target="_blank"
                rel="noreferrer"
                className="text-paper/70 transition-colors duration-200 hover:text-paper"
              >
                {t('about.contactEmail')}
              </a>
            </li>
            <li>
              <Link to="/about" viewTransition className="text-paper/70 transition-colors duration-200 hover:text-paper">
                {t('about.contactTitle')}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-page flex flex-col gap-1.5 py-7 font-sans text-xs text-paper/40">
          <p>{t('common.footerCopyright', { year })}</p>
          <p>{t('common.footerDisclaimer')}</p>
          <p className="tracking-wide">{t('common.footerBuilt')}</p>
        </div>
      </div>
    </footer>
  )
}
