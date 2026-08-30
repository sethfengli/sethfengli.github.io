const fs = require('fs');
const file = process.argv[2];
const fb = parseInt(process.argv[3], 10);
const lb = parseInt(process.argv[4], 10);
const j = JSON.parse(fs.readFileSync('src/content/articles/' + file, 'utf8'));
for (let i = fb; i <= lb; i++) {
  const b = j.blocks[i];
  if (b.t === 'h2' || b.t === 'h3' || b.t === 'h4') {
    console.log(i + ' |' + b.t + '| ["' + b.text + '"]');
    continue;
  }
  const segs = b.inline.map(s => s.href ? ('{LINK:' + s.href + '} ' + s.s) : s.s);
  console.log(i + ' |' + b.t + '| ' + b.inline.length + ' | ' + JSON.stringify(segs));
}
