// One-off: remove the duplicated boundary block at the end of 261lengqiejing.p8.json.
//
// The slice plan partitions p8=[919-1041] (123 blocks) and p9=[1042-1049] (8 blocks).
// p8 was written with 124 blocks (ending at abs 1042), duplicating p9's first block.
// zh[1042] = "安住慈心者，我说常厌离，" which p9 renders correctly; p8's abs-1042 block
// is a misplaced duplicate of zh[1041], so it is the one to drop.
import fs from "node:fs";

const P = "src/content/en/261lengqiejing.p8.json";
const ZH = "src/content/articles/261lengqiejing.json";

const doc = JSON.parse(fs.readFileSync(P, "utf8"));
const zh = JSON.parse(fs.readFileSync(ZH, "utf8"));
const p9 = JSON.parse(fs.readFileSync("src/content/en/261lengqiejing.p9.json", "utf8"));

const before = doc.blocks.length;
if (doc.firstBlock !== 919) throw new Error("unexpected firstBlock " + doc.firstBlock);
if (before !== 124) throw new Error("unexpected block count " + before);
if (p9.firstBlock !== 1042) throw new Error("unexpected p9 firstBlock " + p9.firstBlock);

// The dropped block must be the duplicate of p9's first block.
const dropped = doc.blocks[before - 1];
const droppedText = (dropped.inline || []).map((s) => s.s).join("");
const p9First = (p9.blocks[0].inline || []).map((s) => s.s).join("");
console.log("dropping abs", doc.firstBlock + before - 1, "=", JSON.stringify(droppedText));
console.log("p9 first      abs 1042 =", JSON.stringify(p9First));
if (!/disgust/i.test(droppedText)) throw new Error("dropped block does not look like the duplicate");

// zh[1042] corresponds to the retained p9 block; sanity-check the neighbours line up.
const zh1041 = (zh.blocks[1041].inline || []).map((s) => s.s).join("");
const zh1042 = (zh.blocks[1042].inline || []).map((s) => s.s).join("");
console.log("zh[1041] =", JSON.stringify(zh1041));
console.log("zh[1042] =", JSON.stringify(zh1042));

doc.blocks.pop();

if (doc.blocks.length !== 123) throw new Error("bad final count " + doc.blocks.length);
if (doc.firstBlock + doc.blocks.length - 1 !== 1041) throw new Error("bad final range");
// t sequence must still match the source range 919..1041
for (let i = 0; i < doc.blocks.length; i++) {
  if (doc.blocks[i].t !== zh.blocks[919 + i].t) {
    throw new Error("t mismatch at abs " + (919 + i));
  }
}

const out = JSON.stringify(doc, null, 1);
JSON.parse(out); // validity gate
fs.writeFileSync(P, out + "\n", "utf8");
console.log("[fixed]", P, before, "->", doc.blocks.length, "blocks; now covers 919-1041");
