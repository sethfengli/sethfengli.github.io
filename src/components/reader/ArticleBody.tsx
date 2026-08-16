import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleDoc, Block, Inline } from '../../lib/content'
import { headingAnchorMap, headingId } from '../../lib/content'

/** 行内片段渲染：支持站内文章链接（/articles/<slug>） */
function InlineSegs({ segs }: { segs: Inline[] }) {
  return (
    <>
      {segs.map((seg, i) =>
        seg.href ? (
          <Link key={i} to={seg.href.replace(/^#/, '')}>
            {seg.s}
          </Link>
        ) : (
          <Fragment key={i}>{seg.s}</Fragment>
        ),
      )}
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
}: {
  doc: ArticleDoc
  block: Block
  index: number
  anchorMap: Map<string, string>
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
          <InlineSegs segs={block.inline} />
        </p>
      )
    case 'quote':
      return (
        <blockquote>
          <p className="no-indent">
            <InlineSegs segs={block.inline} />
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
                            title={`跳转到「${joined}」`}
                          >
                            <InlineSegs segs={cell} />
                          </a>
                        ) : (
                          <InlineSegs segs={cell} />
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
  const anchorMap = useMemo(() => headingAnchorMap(doc), [doc])
  return (
    <article className="article-body">
      {doc.blocks.map((b, i) => (
        <BlockView key={i} doc={doc} block={b} index={i} anchorMap={anchorMap} />
      ))}
    </article>
  )
}
