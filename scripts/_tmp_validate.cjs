const fs = require('fs');

// Extract top-level blocks between lineStart..lineEnd of the source by parsing the whole source JSON
function loadBlocks(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  return j.blocks;
}

function check(file, outFile, fb, lb) {
  const src = loadBlocks(file);
  const out = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  if (out.firstBlock !== fb) { console.log('MISMATCH firstBlock: out=' + out.firstBlock + ' expected=' + fb); return; }
  const target = src.slice(fb, lb + 1);
  if (target.length !== out.blocks.length) {
    console.log('MISMATCH count: out=' + out.blocks.length + ' expected=' + target.length);
  }
  let issues = 0;
  // Count segments and types
  let segSummary = [];
  for (let i = 0; i < out.blocks.length; i++) {
    const s = target[i];
    const o = out.blocks[i];
    if (s.t !== o.t) { console.log('TYPE MISMATCH @' + (fb + i) + ': src=' + s.t + ' out=' + o.t); issues++; }
    let sSegs = (s.inline || []).length;
    let oSegs = (o.inline || []).length;
    if (sSegs !== oSegs) { console.log('SEG COUNT MISMATCH @' + (fb + i) + ': src=' + sSegs + ' out=' + oSegs); issues++; }
    // verify each inline element is an object with 's'
    for (const el of (o.inline || [])) {
      if (typeof el !== 'object' || el === null || typeof el.s !== 'string') { console.log('BAD inline element @' + (fb + i)); issues++; }
    }
    segSummary.push(oSegs);
  }
  console.log(outFile + ' -> firstBlock=' + out.firstBlock + ' blocks=' + out.blocks.length +
    ' | typesIssue=' + issues + ' | segCounts=' + segSummary.join(','));
}

// Only run checks here; args: src, out, fb, lb
check(process.argv[2], process.argv[3], parseInt(process.argv[4], 10), parseInt(process.argv[5], 10));
