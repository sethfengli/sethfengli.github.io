import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import type { ArticleDoc, Block, Inline } from '../../lib/content'
import { headingAnchorMap, headingId } from '../../lib/content'

/**
 * è¡Œå†…ç‰‡æ®µæ¸²æŸ“ï¼šæ”¯æŒç«™å†…æ–‡ç« é“¾æŽ¥ï¼ˆ/articles/<slug>ï¼‰
 *
 * ç‰‡æ®µä¹‹é—´**æ²¡æœ‰**éšå¼åˆ†éš”ç¬¦ï¼Œä¸­æ–‡æºæŠŠ `["ä¸€ã€æ— é—¨ä¸ºæ³•é—¨"]["äºŒã€äº”æ³•ä¸‰è‡ªæ€§"]` å­˜æˆä¸¤ç‰‡æ®µ
 * ï¼ˆä¸­æ–‡æ— ç©ºæ ¼ä¹Ÿè¯»å¾—é€šï¼‰ï¼Œè‹±æ–‡ç…§æŠ„å°±ä¼šæ¸²æŸ“æˆ `Gate2. The Fiveâ€¦`ã€‚çœŸå®žç¼ºé™·å½¢æ€æ˜¯
 * ç›¸é‚»ç‰‡æ®µåœ¨è¾¹ç•Œå¤„ã€Œç²˜ä½ã€ï¼š`easy,` + `continuity`ã€`said:` + `â€œThe`ã€`(blessing)` + `is like`ã€‚
 * å› æ­¤æŒ‰éœ€è¡¥ä¸€ä¸ªç©ºæ ¼ï¼Œä¸”åªåœ¨ä¸¤ä¾§éƒ½æ²¡æœ‰ç©ºç™½ã€ä¸”è¾¹ç•Œç¡®å®žæ˜¯ã€Œè¯/é—­å¼•å·ã€æŽ¥ã€Œè¯/å¼€å¼•å·ã€æ—¶è¡¥ï¼Œ
 * è¿™æ · `(` + `701`ã€`â€œ` + `Moreover`ã€`Â·` + `Chapter` ç­‰æœ¬æ¥å°±æ­£ç¡®çš„æŽ¥å¤´ä¿æŒä¸å˜ã€‚
 * **åªåœ¨è‹±æ–‡æ–‡æ¡£é‡Œå¯ç”¨**ï¼šä¸­æ–‡æ­£æ–‡é‡Œæ•°å­—å­—æ¯ç‰‡æ®µï¼ˆå¦‚ `H`+`2`â†’`Hâ‚‚`ã€`1981`+`å¹´`ï¼‰çš„æ¸²æŸ“å¿…é¡»ä¸Ž
 * ä¹‹å‰å®Œå…¨ä¸€è‡´ï¼Œæ‰€ä»¥ä¸­æ–‡ doc ä¸€å¾‹èµ°åŽŸè·¯å¾„ã€‚
 */
const WORD_OR_CLOSE = /[A-Za-z0-9\u00C0-\u024F)\]â€â€™Â»}]$/
const WORD_OR_OPEN = /^[A-Za-z0-9\u00C0-\u024Fâ€œâ€˜([Â«]/

function segmentsNeedSpace(prev: string, next: string) {
  if (!prev || !next) return false
  if (/\s$/.test(prev) || /^\s/.test(next)) return false
  return WORD_OR_CLOSE.test(prev) && WORD_OR_OPEN.test(next)
}

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
  // 片段接头补空格只对英文正文生效；中文正文保持原有的无分隔符拼接。
  const applyJointSpacing = lang === 'en'
  return (
    <article className="article-body">
      {doc.blocks.map((b, i) => (
        <BlockView key={i} doc={doc} block={b} index={i} anchorMap={anchorMap} jumpLabel={(x) => t('common.jumpTo', { t: x })} applyJointSpacing={applyJointSpacing} />
      ))}
    </article>
  )
}
