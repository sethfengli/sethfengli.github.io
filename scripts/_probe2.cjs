const fs = require('fs');
const t = fs.readFileSync('D:/FengLi/Web/fou/huideng-chanlin/src/content/en/234wuliangshoujingyishu.p1.json', 'utf8');
// A content quote is a double quote preceded by a letter (closing a content quote) OR preceded by space/')'/'.' and followed by a letter (opening a content quote) — but exclude structural ones.
let hits = [];
for (let i = 0; i < t.length; i++) {
  if (t[i] !== '"') continue;
  const p = t[i - 1], p2 = t[i - 2], n = t[i + 1];
  // opening content: prev is space or ) or .  AND the word before is a letter (so not a key/value structural quote preceded by : , [ { )
  const prevIsSpaceOrPunct = /[\s).]/.test(p || '');
  const beforeLetter = /[A-Za-z]/.test(p2 || '');
  // closing content: prev is a letter
  const prevIsLetter = /[A-Za-z]/.test(p || '');
  if ((prevIsLetter) ) hits.push('CLOSE ' + i + ': "' + t.slice(i - 20, i + 4) + '"');
  else if (prevIsSpaceOrPunct && beforeLetter && /[A-Za-z]/.test(n || '')) hits.push('OPEN ' + i + ': "' + t.slice(i - 20, i + 20) + '"');
}
console.log(hits.join('\n'));
console.log('TOTAL' + hits.length);
