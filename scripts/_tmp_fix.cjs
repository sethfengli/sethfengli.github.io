const fs = require('fs');
const p = 'src/content/en/087benyuanfamen.p1.json';
let t = fs.readFileSync(p, 'utf8');

// Fix 1: block 21 split "article)" -> "article"},{"s":")"
const a1 = '{"s": "article)"}, {"s": "it destroys the right Dharma by exterminating those who differ from it."}';
const b1 = '{"s": "article"}, {"s": ")"}, {"s": "it destroys the right Dharma by exterminating those who differ from it."}';
if (t.indexOf(a1) === -1) console.log('FIX1 anchor NOT found');
else { t = t.replace(a1, b1); console.log('FIX1 applied'); }

// Fix 2: block 24 add href to Sutra Praising segment
const a2 = '{"s": "\\u201cSutra Praising the Pure Land of the Buddha\\u2019s Reception\\u201d"}';
const b2 = '{"s": "\\u201cSutra Praising the Pure Land of the Buddha\\u2019s Reception\\u201d", "href": "/articles/056chengzanjingtujing"}';
if (t.indexOf(a2) === -1) console.log('FIX2 anchor NOT found');
else { t = t.replace(a2, b2); console.log('FIX2 applied'); }

// Fix 3: block 30 split "assembly."“ -> assembly"},{"s":"."},{"s":"”"
const a3 = '{"s": "such a person would rather cut out his tongue with a sharp knife than teach impurely in the assembly.\\u201d"}, {"s": " (The Buddha\\u2019s Treasury Sutra)"}';
const b3 = '{"s": "such a person would rather cut out his tongue with a sharp knife than teach impurely in the assembly"}, {"s": "."}, {"s": "\\u201d"}, {"s": " (The Buddha\\u2019s Treasury Sutra)"}';
if (t.indexOf(a3) === -1) console.log('FIX3 anchor NOT found');
else { t = t.replace(a3, b3); console.log('FIX3 applied'); }

// Write back as UTF-8 without BOM
fs.writeFileSync(p, t, 'utf8');
console.log('written');
