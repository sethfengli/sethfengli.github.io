const fs = require('fs');
function check(srcFile, outFile, fb, lb) {
  const src = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
  const txt = fs.readFileSync(outFile, 'utf8');
  const out = JSON.parse(txt);
  const cjk = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u30fb\u3010\u3011\u300a\u300b\u3014\u3015]/;
  if (cjk.test(txt)) console.log('  !!! CJK/fullwidth present');
  if (out.firstBlock !== fb) console.log('  !!! firstBlock mismatch');
  const t = src.blocks.slice(fb, lb + 1);
  if (t.length !== out.blocks.length) console.log('  !!! count mismatch out=' + out.blocks.length + ' exp=' + t.length);
  let issues = 0;
  for (let i = 0; i < out.blocks.length; i++) {
    const s = t[i], o = out.blocks[i];
    if (s.t !== o.t) { console.log('  !!! TYPE @' + (fb + i) + ': ' + s.t + '/' + o.t); issues++; }
    const ss = (s.inline || []).length, os = (o.inline || []).length;
    if (ss !== os) { console.log('  !!! SEG @' + (fb + i) + ': ' + ss + '/' + os); issues++; }
    for (let j = 0; j < os; j++) {
      const se = (s.inline || [])[j], el = o.inline[j];
      if ((el.href || null) !== (se.href || null)) { console.log('  !!! HREF @' + (fb + i) + ',' + j + ': ' + (se.href || 'NONE') + '/' + (el.href || 'NONE')); issues++; }
    }
  }
  console.log('RESULT ' + outFile.split(/[\\\/]/).pop() + ' firstBlock=' + out.firstBlock + ' blocks=' + out.blocks.length + ' issues=' + issues + ' noCJK=' + !cjk.test(txt) + ' size=' + (Buffer.byteLength(txt) / 1024).toFixed(1) + 'KB');
}
check('src/content/articles/110yimengmanyan.json', 'src/content/en/110yimengmanyan.p2.json', 39, 64);
check('src/content/articles/304fozangj.json', 'src/content/en/304fozangj.p9.json', 533, 598);
check('src/content/articles/087benyuanfamen.json', 'src/content/en/087benyuanfamen.json', 0, 72);
check('src/content/articles/087benyuanfamen.json', 'src/content/en/087benyuanfamen.p1.json', 0, 33);
