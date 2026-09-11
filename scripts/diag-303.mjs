// One-off diagnostic: locate U+008F / untranslated hanzi in src/content/en/303liuzutanjing.json
import fs from "node:fs";

const P = "src/content/en/303liuzutanjing.json";
const raw = fs.readFileSync(P, "utf8");
const doc = JSON.parse(raw);
console.log("top keys:", Object.keys(doc).join(", "));
console.log("blocks:", doc.blocks.length, "firstBlock:", doc.firstBlock);

const isHan = (ch) => {
  const c = ch.codePointAt(0);
  return (c >= 0x3400 && c <= 0x4dbf) || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff);
};
const isFull = (ch) => {
  const c = ch.codePointAt(0);
  return (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
};
const isCtl = (ch) => {
  const c = ch.codePointAt(0);
  return c >= 0x80 && c <= 0x9f;
};

const report = (path, s) => {
  let bad = false;
  const marks = [];
  for (const ch of s) {
    if (isHan(ch)) { marks.push(`HAN ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase()}`); bad = true; }
    else if (isFull(ch)) { marks.push(`FULL ${JSON.stringify(ch)} U+${ch.codePointAt(0).toString(16).toUpperCase()}`); bad = true; }
    else if (isCtl(ch)) { marks.push(`CTL U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`); bad = true; }
  }
  if (bad) console.log(`\n--- ${path}\n  text: ${JSON.stringify(s)}\n  marks: ${marks.join(" | ")}`);
};

doc.blocks.forEach((b, bi) => {
  if (b.title) report(`blocks[${bi}].title`, b.title);
  if (b.text) report(`blocks[${bi}].text`, b.text);
  const scanSegs = (segs, label) => (segs || []).forEach((sg, si) => {
    if (sg.s) report(`${label}[${si}].s`, sg.s);
  });
  if (b.inline) scanSegs(b.inline, `blocks[${bi}].inline`);
  if (b.rows) b.rows.forEach((r, ri) => r.forEach((cell, ci) => scanSegs(cell, `blocks[${bi}].rows[${ri}][${ci}]`)));
  if (b.items) b.items.forEach((it, ii) => {
    if (it) scanSegs(it.inline, `blocks[${bi}].items[${ii}].inline`);
  });
});
console.log("\ndone");
