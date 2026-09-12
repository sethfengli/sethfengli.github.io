import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import type { ArticleDoc, Block, Inline } from '../../lib/content'
import { headingAnchorMap, headingId } from '../../lib/content'

/**
 * 行内片段渲染：支持站内文章链接（/articles/<slug>）
 *
 * 片段之间没有隐式分隔符，所以英文在“词尾 / 句读标点 / 闭引号”接“词首 / 开引号”的接头会粘住
 * （如 easy,+continuity、said:+The、(blessing)+is like），因此按需补一个空格；
 * 本来就正确的接头（如 (+701、·+Chapter）保持不变。
 * 仅对英文文章生效：中文正文里 H+2、1981+年 这类片段的渲染必须保持原样。
 */
const TAIL_OK = /[A-Za-z0-9\u00C0-\u024F)\]”’»}.,;:!?]$/
const HEAD_OK = /^[A-Za-z0-9\u00C0-\u024F“‘([«]/

function segmentsNeedSpace(prev: string, next: string) {
  if (!prev || !next) return false
  if (/\s$/.test(prev) || /^\s/.test(next)) return false
  return TAIL_OK.test(prev) && HEAD_OK.test(next)
}

/** 行内片段渲染：支持站内文章链接（/articles/<slug>） */
function InlineSegs({ segs, applyJointSpacing }: { segs: Inline[]; applyJointSpacing: boolean }) {
  return (
    <>
      {segs.map((seg, i) => {
        const prev = i > 0 ? segs[i - 1] : undefined
        const gap =
          applyJointSpacing && prev && !prev.href && !seg.href && segmentsNeedSpace(prev.s, seg.s) ? ' ' : ''
        return seg.href ? (
          <Link key={i} to={seg.href.replace(/^#/, '')}>
            {seg.s}
          </Link>
        ) : (
          <Fragment key={i}>
            {gap}
            {seg.s}
          </Fragment>
        )
      })}
    </>
  )
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function BlockView({
  doc,
  block,
  index,
  anchorMap,
  jumpLabel,
  applyJointSpacing,
}: {
  doc: ArticleDoc
  block: Block
  index: number
  anchorMap: Map<string, string>
  jumpLabel: (text: string) => string
  applyJointSpacing: boolean
}) {
  switch (block.t) {
    case 'h2':
    case 'h3':
    case 'h4': {
      const id = headingId(doc, index)
      if (block.t === 'h2') return <h2 id={id}>{block.text}</h2>
      if (block.t === 'h3') return <h3 id={id}>{block.text}</h3>
      return (
        <h3 id={id} className="!text-[1.08em]">
          {block.text}
        </h3>
      )
    }
    case 'p':
      return (
        <p>
          <InlineSegs segs={block.inline} applyJointSpacing={applyJointSpacing} />
        </p>
      )
    case 'quote':
      return (
        <blockquote>
          <p className="no-indent">
            <InlineSegs segs={block.inline} applyJointSpacing={applyJointSpacing} />
          </p>
        </blockquote>
      )
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    const joined = cell.map((s) => s.s).join('')
                    const anchor = anchorMap.get(joined)
                    return (
                      <td key={ci}>
                        {anchor ? (
                          <a
                            href={`#${anchor}`}
                            onClick={(e) => {
                              e.preventDefault()
                              scrollToHeading(anchor)
                            }}
                            title={jumpLabel(joined)}
                          >
                            <InlineSegs segs={cell} applyJointSpacing={applyJointSpacing} />
                          </a>
                        ) : (
                          <InlineSegs segs={cell} applyJointSpacing={applyJointSpacing} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'hr':
      return <hr />
  }
}

export function ArticleBody({ doc }: { doc: ArticleDoc }) {
  const { t, lang } = useI18n()
  const anchorMap = useMemo(() => headingAnchorMap(doc), [doc])
  // 仅英文正文补接头空格；中文正文保持原有拼接。
  const applyJointSpacing = lang === 'en'
  return (
    <article className="article-body">
      {doc.blocks.map((b, i) => (
        <BlockView key={i} doc={doc} block={b} index={i} anchorMap={anchorMap} jumpLabel={(x) => t('common.jumpTo', { t: x })} applyJointSpacing={applyJointSpacing} />
      ))}
    </article>
  )
}
