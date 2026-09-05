const fs = require('fs');
const t = fs.readFileSync('D:/FengLi/Web/fou/huideng-chanlin/src/content/en/234wuliangshoujingyishu.p1.json', 'utf8');
console.log('bytes:', Buffer.byteLength(t, 'utf8'));
try {
  const j = JSON.parse(t);
  console.log('JSON OK blocks=', j.blocks.length, 'firstBlock=', j.firstBlock);
} catch (e) {
  console.log('ERROR:', e.message);
  const m = e.message.match(/position (\d+)/);
  if (m) { const s = parseInt(m[1]); console.log('CTX:', JSON.stringify(t.slice(Math.max(0, s - 90), s + 90))); }
}
