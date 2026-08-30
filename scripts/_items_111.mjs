import { readFileSync, writeFileSync } from 'fs';

const xml = readFileSync('scripts/_111cbeta.xml', 'utf8');
const body = xml.slice(xml.indexOf('<body>') + 6, xml.indexOf('</body>'));

function cleanText(raw) {
  let t = raw.replace(/<note[^>]*>[\s\S]*?<\/note>/g, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/[\u0000-\u0020\u007f]+/g, '');
  return t;
}

const tokens = [];
function push(off, obj) { tokens.push({ off, ...obj }); }
let m;
const openDivRe = /<cb:div\b[^>]*\btype="([^"]*)"/g;
while ((m = openDivRe.exec(body)) !== null) push(m.index, { kind: 'opendiv', type: m[1] });
const closeDivRe = /<\/cb:div>/g;
while ((m = closeDivRe.exec(body)) !== null) push(m.index, { kind: 'closediv' });
const elemRe = /<(p|cb:jhead|cb:mulu|head)\b[^>]*>|<\/(p|cb:jhead|cb:mulu|head)>/g;
while ((m = elemRe.exec(body)) !== null) {
  const isClose = m[0].startsWith('</');
  push(m.index, { kind: isClose ? 'elemclose' : 'elemopen', name: isClose ? m[2] : m[1], tag: m[0] });
}
tokens.sort((a, b) => a.off - b.off);

function tagEnd(off) { const g = body.indexOf('>', off); return g === -1 ? body.length : g + 1; }

const divStack = [];
const elemStack = [];
const out = [];
for (const t of tokens) {
  if (t.kind === 'opendiv') divStack.push(t.type);
  else if (t.kind === 'closediv') divStack.pop();
  else if (t.kind === 'elemopen') {
    elemStack.push({ name: t.name, start: t.off });
  } else {
    const open = elemStack.pop();
    if (!open || open.name !== t.name) { continue; }
    const inner = body.slice(tagEnd(open.start), t.off);
    const text = cleanText(inner);
    out.push({ name: t.name, start: open.start, divType: divStack.length ? divStack[divStack.length - 1] : null, text });
  }
}
out.sort((a, b) => a.start - b.start);

console.log('Total out items:', out.length);
const counts = {};
for (const o of out) counts[o.name] = (counts[o.name] || 0) + 1;
console.log('counts:', counts);

console.log('\n=== non-p items ===');
out.filter(o => o.name !== 'p').forEach((o, i) => {
  console.log(`[${o.name}] div=${o.divType} :: ${o.text}`);
});

console.log('\n=== ordered 0..72 ===');
for (let i = 0; i < Math.min(72, out.length); i++) {
  const o = out[i];
  let pre = '';
  if (o.name === 'p') {
    if (o.text.startsWith('【疏】')) pre = 'SHU';
    else if (o.text.startsWith('【鈔】')) pre = 'CHAO';
    else if (o.text.startsWith('△')) pre = 'TRI';
    else if (o.text.startsWith('○')) pre = 'CIRC';
  }
  console.log(`[${String(i).padStart(3)}] ${o.name}/${o.divType}/${pre.padEnd(5)} :: ${o.text.slice(0, 44)}`);
}

writeFileSync('scripts/_items_111.json', JSON.stringify(out, null, 1));
console.log('\nwrote _items_111.json');
