const fs = require('fs');
function isCJK(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x4E00 && c <= 0x9FFF) || (c >= 0x3400 && c <= 0x4DBF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0x3000 && c <= 0x303F) || (c >= 0xFF00 && c <= 0xFFEF);
}
const enFile = process.argv[2];
const srcFile = process.argv[3];
const fb = parseInt(process.argv[4], 10);
const lb = parseInt(process.argv[5], 10);
const en = JSON.parse(fs.readFileSync('src/content/en/' + enFile, 'utf8'));
const src = JSON.parse(fs.readFileSync('src/content/articles/' + srcFile, 'utf8'));
const bl = en.blocks;
console.log('file:', enFile, 'size(bytes):', fs.statSync('src/content/en/' + enFile).size);
console.log('firstBlock:', en.firstBlock, '(expected', fb + ')');
console.log('block count:', bl.length, '(expected', (lb - fb + 1) + ')');
// CJK check
let bad = [];
const walk = (o, path) => {
  if (typeof o === 'string') {
    for (const ch of o) if (isCJK(ch)) bad.push(path + ': ' + ch);
  } else if (Array.isArray(o)) {
    o.forEach((v, i) => walk(v, path + '[' + i + ']'));
  } else if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) walk(o[k], path + '.' + k);
  }
};
walk(bl, 'blocks');
console.log('CJK/fullwidth count:', bad.length, bad.slice(0, 20).join(' | '));
// segment-count and href comparison
let mismatch = 0;
for (let i = 0; i < bl.length; i++) {
  const s = src.blocks[fb + i];
  const e = bl[i];
  if (s.t !== e.t) { console.log('TYPE mismatch at', i, s.t, e.t); mismatch++; }
  if (s.t === 'p' || s.t === 'quote') {
    if (s.inline.length !== e.inline.length) { console.log('SEGCOUNT mismatch at', i, s.inline.length, e.inline.length); mismatch++; }
    for (let k = 0; k < s.inline.length; k++) {
      const sh = !!s.inline[k].href, eh = !!e.inline[k].href;
      if (sh !== eh) { console.log('HREF mismatch at', i, k, sh, eh); mismatch++; }
      if (sh && s.inline[k].href !== e.inline[k].href) { console.log('HREF VALUE mismatch at', i, k, s.inline[k].href, e.inline[k].href); mismatch++; }
    }
  } else if (s.t === 'h2' || s.t === 'h3' || s.t === 'h4') {
    if (typeof s.text !== 'undefined' && typeof e.text === 'undefined') { console.log('TEXT missing at', i); mismatch++; }
  }
}
console.log('structural mismatches:', mismatch);
// verify valid JSON round-trip
console.log('JSON round-trip OK:', JSON.stringify(en).length > 0);
