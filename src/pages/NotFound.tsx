import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { ZenIllustration } from '../components/zen/ZenIllustration'

export function NotFound() {
  const { t } = useI18n()
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <ZenIllustration variant="enso" className="h-44 w-80 rounded-3xl" />
      <h1 className="mt-8 font-brush text-4xl text-sandalwood-800">{t('common.notFoundTitle')}</h1>
      <p className="mt-3 font-serif text-sandalwood-500">{t('common.notFoundDesc')}</p>
      <Link to="/" className="btn-primary mt-8">
        {t('common.backHome')}
      </Link>
    </div>
  )
}
