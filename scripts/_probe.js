const fs = require('fs');
const t = fs.readFileSync('D:/FengLi/Web/fou/huideng-chanlin/src/content/en/234wuliangshoujingyishu.p1.json', 'utf8');
let idxs = [];
for (let i = 0; i < t.length; i++) { if (t[i] === '"') idxs.push(i); }
console.log('Total double quotes:', idxs.length);
let content = [];
for (const i of idxs) {
  const prev = t[i - 1];
  const next = t[i + 1];
  // content quote heuristic: prev char is a letter/)/./space (not JSON struct) and next is letter
  const isContent = /[A-Za-z.)\s]/.test(prev || '') && /[A-Za-z]/.test(next || '');
  if (isContent) content.push(i + ' :: ...' + t.slice(i - 22, i + 22) + '...');
}
console.log('Content-like quotes:');
console.log(content.join('\n'));
