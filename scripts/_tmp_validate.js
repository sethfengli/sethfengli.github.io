const fs = require('fs');
const path = process.argv[2];
const txt = fs.readFileSync(path, 'utf8');
try {
  const j = JSON.parse(txt);
  console.log('Parsed OK. firstBlock=' + j.firstBlock + ' blocks=' + j.blocks.length);
  const cjk = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u30fb]/;
  console.log('CJK/fullwidth present: ' + cjk.test(txt));
  const types = {};
  j.blocks.forEach(b => { types[b.t] = (types[b.t] || 0) + 1; });
  console.log('types: ' + JSON.stringify(types));
  const segs = j.blocks.map(b => Array.isArray(b.inline) ? b.inline.length : (b.t));
  console.log('per-block: ' + segs.join(','));
  process.exit(0);
} catch (e) {
  console.log('PARSE ERROR: ' + e.message);
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const idx = parseInt(m[1], 10);
    console.log('context: ' + JSON.stringify(txt.slice(idx - 40, idx + 40)));
    console.log('codes: ' + [...txt.slice(idx - 40, idx + 40)].map(c => c.charCodeAt(0)).join(','));
  }
  process.exit(1);
}
