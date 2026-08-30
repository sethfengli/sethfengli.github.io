const fs = require('fs');
const p = 'src/content/en/258quanzhenqizizhuan.p5.json';
let txt = fs.readFileSync(p, 'utf8');
const lines = txt.split('\n');
const out = lines.map(l => {
  const m = l.match(/^(\s*\{\s*"s":\s*")(.*)("\}\s*,?\s*)$/);
  if (!m) return l;
  let inner = m[2];
  inner = inner.replace(/\"/g, '\\"');
  return m[1] + inner + m[3];
});
txt = out.join('\n');
fs.writeFileSync(p, txt);
try {
  const d = JSON.parse(txt);
  console.log('OK blocks', d.blocks.length, 'firstBlock', d.firstBlock, 'bytes', Buffer.byteLength(txt));
} catch (e) {
  console.log('FAIL', e.message);
}
