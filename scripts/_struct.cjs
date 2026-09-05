const fs = require('fs');
const src = JSON.parse(fs.readFileSync('D:/FengLi/Web/fou/huideng-chanlin/src/content/articles/234wuliangshoujingyishu.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('D:/FengLi/Web/fou/huideng-chanlin/src/content/en/234wuliangshoujingyishu.p1.json', 'utf8'));
const N = en.blocks.length; // 46
let mismatch = 0;
for (let i = 0; i < N; i++) {
  const sb = src.blocks[i], eb = en.blocks[i];
  if (!eb.t) { console.log(`block ${i} MISSING t`); mismatch++; continue; }
  if (sb.t !== eb.t) { console.log(`block ${i} t mismatch src=${sb.t} en=${eb.t}`); mismatch++; }
  const sc = (sb.inline ? sb.inline.length : 0);
  const ec = (eb.inline ? eb.inline.length : 0);
  if (sc !== ec) { console.log(`block ${i} inline mismatch src=${sc} en=${ec} t=${eb.t} :: ${eb.inline?.[0]?.s?.slice(0,40)}`); mismatch++; continue; }
  if (sb.inline) {
    for (let k = 0; k < sc; k++) {
      const sh = sb.inline[k].href, eh = eb.inline[k].href;
      if ((sh && !eh) || (!sh && eh) || (sh && eh && sh !== eh)) { console.log(`block ${i} seg${k} href mismatch src=${sh} en=${eh}`); mismatch++; }
    }
  }
}
console.log('Blocks compared:', N, 'mismatches:', mismatch);
console.log('title:', en.title, '| author:', en.author, '| excerpt:', en.excerpt);
