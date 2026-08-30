// Validate an English part file against a source article's block range.
// usage: node _validate.cjs <sourceArticle> <enFile> <firstBlock> <lastBlock>
const fs = require('fs');
const [, , srcPath, enPath, fb, lb] = process.argv;
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const first = Number(fb), last = Number(lb);
const srcBlocks = src.blocks.slice(first, last + 1);
const enBlocks = en.blocks;
if (en.firstBlock !== first) { console.error('FAIL firstBlock', en.firstBlock, '!==', first); process.exit(1); }
if (enBlocks.length !== srcBlocks.length) { console.error('FAIL block count', enBlocks.length, '!==', srcBlocks.length); process.exit(1); }

// CJK check on the whole en document
const cjk = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3040-\u30FF\uAC00-\uD7AF\u3000-\u303F\uFF00-\uFFEF]/g;
function cjkMatches(str){ const m = str.match(cjk); return m ? m.join('') : ''; }
const cjkAll = cjkMatches(JSON.stringify(en));
if (cjkAll) { console.error('FAIL CJK found:', cjkAll); process.exit(1); }

let segTotal = 0, hrefErr = 0, errs = 0;
for (let i = 0; i < srcBlocks.length; i++) {
  const sb = srcBlocks[i], eb = enBlocks[i];
  const gidx = first + i;
  if (sb.t !== eb.t) { console.error('FAIL t at idx', gidx, sb.t, '!==', eb.t); errs++; }
  const si = sb.inline || [], ei = eb.inline || [];
  if (si.length !== ei.length) { console.error('FAIL seg count idx', gidx, si.length, '!==', ei.length, 't='+sb.t); errs++; }
  segTotal += si.length;
  for (let j = 0; j < Math.min(si.length, ei.length); j++) {
    if (!!si[j].href !== !!ei[j].href) { console.error('FAIL href presence idx', i, j); hrefErr++; }
    else if (si[j].href && si[j].href !== ei[j].href) { console.error('FAIL href value idx', i, j); hrefErr++; }
  }
  if (sb.rows !== undefined || eb.rows !== undefined) {
    if (sb.rows !== eb.rows) { console.error('FAIL rows mismatch idx', gidx); errs++; }
  }
}
console.log(errs === 0 ? 'PASS' : ('RESULT ' + errs + ' errors'), enBlocks.length, 'blocks', segTotal, 'segments, hrefErr='+hrefErr);
