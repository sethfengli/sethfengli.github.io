import { useCallback, useState } from 'react'
import { useI18n } from '../../i18n'

declare global {
  interface Window {
    google?: {
      translate: {
        TranslateElement: new (
          opts: Record<string, unknown>,
          el: string,
        ) => unknown
        InlineLayout: { SIMPLE: number }
      }
    }
    googleTranslateElementInit?: () => void
  }
}

/**
 * Google 翻译集成（翻译本文按钮）
 * - 按需惰性加载 translate.google.com 的官方小组件，不暴露任何密钥；
 * - 小组件在页面内就地翻译 DOM，适配 HashRouter 单页应用
 *   （URL 翻译方案拿不到 hash 后的正文，故采用组件内嵌方案）；
 * - 离线/被墙时优雅降级：显示提示，不影响其余功能。
 */
export function TranslateWidget() {
  const { t } = useI18n()
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  const load = useCallback(() => {
    if (state === 'ready' || state === 'loading') return
    setState('loading')
    try {
      window.googleTranslateElementInit = () => {
        const gt = window.google?.translate
        if (!gt) {
          setState('error')
          return
        }
        new gt.TranslateElement(
          {
            pageLanguage: 'zh-CN',
            includedLanguages: 'en,zh-CN',
            layout: gt.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          'hdc-translate-element',
        )
        setState('ready')
      }
      const s = document.createElement('script')
      s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      s.async = true
      s.onerror = () => setState('error')
      document.body.appendChild(s)
    } catch {
      setState('error')
    }
  }, [state])

  if (state === 'ready') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-sandalwood-400">{t('reader.translate')}:</span>
        <div id="hdc-translate-element" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={load}
        className="btn-secondary !px-4 !py-1.5 text-xs"
        title={t('reader.translateHint')}
      >
        {state === 'loading' ? t('reader.translateLoading') : `${t('reader.translate')} · EN`}
      </button>
      {state === 'error' && <span className="text-xs text-tibetan-500">{t('common.offlineNotice')}</span>}
    </div>
  )
}
