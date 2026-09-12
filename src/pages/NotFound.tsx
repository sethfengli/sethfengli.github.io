import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { ZenIllustration } from '../components/zen/ZenIllustration'
import { Ornament } from '../components/ui/PageBanner'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-5 text-center">
      <ZenIllustration variant="enso" className="h-36 w-72 rounded-xs" />
      <Ornament className="mt-10" />
      <h1 className="mt-8 font-serif text-3xl font-normal tracking-tight text-ink-900 sm:text-4xl">
        {t('common.notFoundTitle')}
      </h1>
      <p className="mt-4 font-serif text-sm leading-relaxed text-ink-500">{t('common.notFoundDesc')}</p>
      <Link to="/" viewTransition className="btn-primary mt-10">
        {t('common.backHome')}
      </Link>
    </div>
  )
}
