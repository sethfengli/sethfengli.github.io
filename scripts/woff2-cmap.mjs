/**
 * Minimal woff2 reader: decompress the single brotli table stream and decode the
 * `cmap` subtables into a set of code points. Pure Node -- no Python/fonttools.
 *
 * Shared by scripts/check-font-coverage.mjs (does the shipped subset cover every
 * character the site uses?) and scripts/make-song-subset.mjs (keep the rebuilt
 * subset monotonic: never drop a glyph the previous subset already had).
 *
 * Two facts that are easy to get wrong (both cost real debugging time):
 *   1. woff2 keeps ONE brotli stream holding every table back to back, so an
 *      individual table's `origLength` can be larger than the whole file.
 *      Never slice the file by origLength -- decompress once, then cut.
 *   2. The table directory stores tag INDEXES (0x3F means "4-byte tag follows").
 */
import zlib from 'node:zlib'
import fs from 'node:fs'

const WOFF2_SIG = 0x774f4632 // 'wOF2'

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
]

/** @returns {{tables: Array, blob: Buffer}} decompressed sfnt tables in order */
export function readWoff2(buf) {
  if (buf.length < 48 || buf.readUInt32BE(0) !== WOFF2_SIG) throw new Error('not a woff2 file')
  const numTables = buf.readUInt16BE(12)
  const compressedSize = buf.readUInt32BE(20)
  let p = 48
  const readBase128 = () => {
    let v = 0
    for (let k = 0; k < 5; k++) {
      const x = buf[p++]
      v = (v << 7) | (x & 0x7f)
      if ((x & 0x80) === 0) break
    }
    return v
  }
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const flags = buf[p]
    const tagIndex = flags & 0x3f
    const transformVersion = (flags >> 6) & 3
    let tag
    if (tagIndex === 0x3f) {
      tag = buf.toString('latin1', p + 1, p + 5)
      p += 5
    } else {
      tag = KNOWN_TAGS[tagIndex]
      p += 1
    }
    const origLength = readBase128()
    const hasTransform = tag === 'glyf' ? transformVersion !== 3 : tag === 'loca' ? transformVersion !== 0 : false
    const transformLength = hasTransform ? readBase128() : null
    tables.push({ tag, origLength, transformLength })
  }
  const blob = zlib.brotliDecompressSync(buf.subarray(p, p + compressedSize))
  let off = 0
  for (const t of tables) {
    t.off = off
    off += t.origLength
  }
  if (off !== blob.length) {
    throw new Error(`sfnt length mismatch: directory says ${off}, brotli stream is ${blob.length}`)
  }
  return { tables, blob }
}

/** Decode cmap formats 4 and 12 of every subtable into a Set of code points. */
export function readCmap(blob, cmapOff) {
  const n = blob.readUInt16BE(cmapOff + 2)
  const subs = []
  for (let i = 0; i < n; i++) {
    const rec = 4 + i * 8
    subs.push({
      platformID: blob.readUInt16BE(cmapOff + rec),
      encodingID: blob.readUInt16BE(cmapOff + rec + 2),
      subOff: cmapOff + blob.readUInt32BE(cmapOff + rec + 4),
    })
  }
  const rank = ({ platformID, encodingID }) =>
    platformID === 3 && encodingID === 10 ? 3 : platformID === 3 && encodingID === 1 ? 2 : platformID === 0 ? 2 : 1
  subs.sort((a, b) => rank(b) - rank(a))

  const cps = new Set()
  const formats = []
  for (const s of subs) {
    const format = blob.readUInt16BE(s.subOff)
    if (format === 4) {
      const segX2 = blob.readUInt16BE(s.subOff + 6)
      const segs = segX2 / 2
      const endBase = s.subOff + 14
      const startBase = endBase + segX2 + 2
      const deltaBase = startBase + segX2
      const rangeBase = deltaBase + segX2
      for (let i = 0; i < segs; i++) {
        const end = blob.readUInt16BE(endBase + i * 2)
        const start = blob.readUInt16BE(startBase + i * 2)
        const delta = blob.readInt16BE(deltaBase + i * 2)
        const rangeOff = blob.readUInt16BE(rangeBase + i * 2)
        if (start === 0xffff) continue
        for (let ch = start; ch <= end && ch !== 0x10000; ch++) {
          let gid
          if (rangeOff === 0) {
            gid = (ch + delta) & 0xffff
          } else {
            const gi = rangeBase + i * 2 + rangeOff + (ch - start) * 2
            gid = blob.readUInt16BE(gi)
            if (gid !== 0) gid = (gid + delta) & 0xffff
          }
          if (gid !== 0) cps.add(ch)
        }
      }
      formats.push(4)
    } else if (format === 12) {
      const nGroups = blob.readUInt32BE(s.subOff + 12)
      for (let i = 0; i < nGroups; i++) {
        const g = s.subOff + 16 + i * 12
        const start = blob.readUInt32BE(g)
        const end = blob.readUInt32BE(g + 4)
        for (let ch = start; ch <= end; ch++) cps.add(ch)
      }
      formats.push(12)
    }
  }
  return { cps, formats }
}

/** Read a woff2 file from disk and return its code-point set. */
export function readWoff2Cmap(file) {
  const { tables, blob } = readWoff2(fs.readFileSync(file))
  const cmapTable = tables.find((t) => t.tag === 'cmap')
  if (!cmapTable) throw new Error('cmap table missing from woff2')
  return readCmap(blob, cmapTable.off).cps
}
