const fs = require('fs');
const wholePath = 'src/content/en/087benyuanfamen.json';
const j = JSON.parse(fs.readFileSync(wholePath, 'utf8'));
let n = 0;

// Fix 1: block 21 (0-based index 21 in blocks) split "article)" -> "article", ")"
j.blocks[21].inline = j.blocks[21].inline.flatMap((el) => {
  if (el.s === 'article)') { n++; return [{ s: 'article' }, { s: ')' }]; }
  return [el];
});

// Fix 2: block 24 add href to the Sutra Praising segment
j.blocks[24].inline.forEach((el) => {
  if (el.s.indexOf('Sutra Praising the Pure Land of the Buddha') !== -1 && !el.href) {
    el.href = '/articles/056chengzanjingtujing'; n++;
  }
});

// Fix 3: block 30 split '...assembly."“' -> [assembly][.][”]
j.blocks[30].inline = j.blocks[30].inline.flatMap((el) => {
  if (el.s.indexOf('cut out his tongue') !== -1 && el.s.endsWith('\u201d')) {
    n++;
    const base = el.s.replace(/\u201d$/, '');
    // base ends with "...assembly." ; split last '.' off
    if (base.endsWith('.')) {
      const head = base.slice(0, -1);
      return [{ s: head }, { s: '.' }, { s: '\u201d' }];
    }
    return [{ s: base }, { s: '\u201d' }];
  }
  return [el];
});

console.log('fixes applied: ' + n);
fs.writeFileSync(wholePath, JSON.stringify(j, null, 1) + '\n', 'utf8');

// Now derive the correct part file from blocks 0-33 + meta
const meta = {};
for (const k of ['title', 'author', 'excerpt']) if (typeof j[k] === 'string' && j[k].trim()) meta[k] = j[k].trim();
const part = { firstBlock: 0, ...meta, blocks: j.blocks.slice(0, 34) };
fs.writeFileSync('src/content/en/087benyuanfamen.p1.json', JSON.stringify(part, null, 1) + '\n', 'utf8');
console.log('part blocks: ' + part.blocks.length);
