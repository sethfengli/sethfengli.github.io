// One-off: fix the untranslated hanzi remnant in src/content/en/303liuzutanjing.json
import fs from "node:fs";

const P = "src/content/en/303liuzutanjing.json";
const raw = fs.readFileSync(P, "utf8");
const doc = JSON.parse(raw);

const before = JSON.stringify(doc.blocks[1073].inline);
if (doc.blocks[1073].inline.length !== 1) throw new Error("expected 1 inline seg, got " + doc.blocks[1073].inline.length);

// Locate the segment containing U+008F (not mojibake-pair per scan, but a CP1252-inverted hanzi pair)
let hit = -1;
for (let i = 0; i < doc.blocks[1073].inline.length; i++) {
  if (/\u008f/.test(doc.blocks[1073].inline[i].s)) { hit = i; break; }
}
if (hit !== 0) throw new Error("U+008F segment not found");

const seg = doc.blocks[1073].inline[0];
// Preserve href / other keys; only replace the text.
seg.s = "[National Teacher Anguo] This is Chan Master Hui\u2019an, whom Empress Wu Zetian honored as National Teacher. From princes and high ministers down to the common people of the capital, all vied to come and pay their respects, prostrating themselves in the dust, as many as ten thousand each day. [Can-kou (seeking and inquiring)] Also written \u201ccan-kou\u201d (can-kou: \u201cto deliberate and inquire\u201d).";

// Self-checks
if (doc.blocks.length !== 1530) throw new Error("block count changed: " + doc.blocks.length);
if (doc.blocks[1073].inline.length !== 1) throw new Error("inline seg count changed");
for (const ch of seg.s) {
  const c = ch.codePointAt(0);
  const han = (c >= 0x3400 && c <= 0x4dbf) || (c >= 0x4e00 && c <= 0x9fff) || (c >= 0xf900 && c <= 0xfaff);
  const full = (c >= 0x3000 && c <= 0x303f) || (c >= 0xff00 && c <= 0xffef);
  const ctl = c >= 0x80 && c <= 0x9f;
  if (han || full || ctl) throw new Error("forbidden char remains: U+" + c.toString(16));
}

const out = JSON.stringify(doc, null, 1);
JSON.parse(out); // final validity gate
fs.writeFileSync(P, out + "\n", "utf8");
console.log("[fixed] blocks[1073].inline[0].s");
console.log("  before:", JSON.stringify(before.slice(before.indexOf("Can-kou"), before.length - 2)));
console.log("  after :", JSON.stringify(seg.s.slice(seg.s.indexOf("Can-kou"))));
