// One-off: remove the mis-tagged chapter-heading author from the 502xiuxinjue source article
// (scripts/meta-scan.mjs flagged author="普照国师简介" as a body-block heading, not a byline).
import fs from "node:fs";

const P = "src/content/articles/502xiuxinjue.json";
const raw = fs.readFileSync(P, "utf8");
const doc = JSON.parse(raw);

if (!Object.prototype.hasOwnProperty.call(doc, "author")) {
  console.log("[skip] no author field");
  process.exit(0);
}
if (doc.author !== "普照国师简介") {
  throw new Error("unexpected author value: " + JSON.stringify(doc.author));
}

const nBlocks = doc.blocks.length;
delete doc.author;

if (doc.blocks.length !== nBlocks) throw new Error("block count changed");
if (Object.prototype.hasOwnProperty.call(doc, "author")) throw new Error("author still present");

const out = JSON.stringify(doc, null, 1);
JSON.parse(out); // validity gate
fs.writeFileSync(P, out + "\n", "utf8");
console.log("[fixed] removed author from", P, "| blocks:", nBlocks);
console.log("  keys:", Object.keys(doc).join(","));
