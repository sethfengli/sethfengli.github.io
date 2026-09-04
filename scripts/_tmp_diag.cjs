const fs = require('fs');
const p = 'src/content/en/087benyuanfamen.json';
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
function show(i) {
  const b = j.blocks[i];
  console.log('--- block ' + i + ' segs=' + b.inline.length + ' ---');
  b.inline.forEach((el, idx) => {
    console.log('  [' + idx + '] href=' + (el.href || '-') + ' s=' + JSON.stringify(el.s.slice(0, 70)));
  });
}
show(21);
show(24);
show(30);
