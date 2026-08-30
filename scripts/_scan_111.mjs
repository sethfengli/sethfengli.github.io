import { readFileSync, writeFileSync } from 'fs';

const results = JSON.parse(readFileSync('scripts/_elements_111.json', 'utf8'));

// Analyze each p element: classify by prefix character and div type
function classify(p) {
  const t = p.text;
  let prefix = '';
  if (t.startsWith('【疏】')) prefix = 'shu';
  else if (t.startsWith('【鈔】')) prefix = 'chao';
  else if (t.startsWith('△')) prefix = 'tri';
  else if (t.startsWith('○')) prefix = 'circle';
  return { type: p.type, prefix, text: t };
}

const rows = results.filter(r => r.name === 'p').map(classify);
const summary = {};
for (const r of rows) {
  const key = `${r.type}/${r.prefix}`;
  summary[key] = (summary[key] || 0) + 1;
}
console.log('=== type/prefix distribution ===');
for (const [k, v] of Object.entries(summary).sort()) console.log(k.padEnd(22), v);

// List paragraphs that are 'orig' type but NOT 【疏】 (potential sutra text)
console.log('\n=== orig div, no 【疏】 prefix ===');
rows.filter(r => r.type === 'orig' && r.prefix === '').forEach((r, i) => {
  console.log(`[${String(i+1).padStart(3)}] ${r.text.slice(0, 50)}`);
});
