const fs=require('fs');
const dir='D:/FengLi/Web/fou/huideng-chanlin/src/content/en/';
const src=JSON.parse(fs.readFileSync(dir+'401amtj.p5.json','utf8'));
const full=src.blocks;                    // 86 blocks
const mid=Math.ceil(full.length/2);       // 43
const a={firstBlock:282,blocks:full.slice(0,mid)};
const b={firstBlock:282+mid,blocks:full.slice(mid)};
fs.writeFileSync(dir+'401amtj.p5.json',JSON.stringify(a));
fs.writeFileSync(dir+'401amtj.p11.json',JSON.stringify(b));
console.log('p5 blocks',a.blocks.length,'first',a.firstBlock);
console.log('p11 blocks',b.blocks.length,'first',b.firstBlock);
