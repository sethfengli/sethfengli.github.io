const fs=require('fs');
const dir='D:/FengLi/Web/fou/huideng-chanlin/src/content/';
const src=JSON.parse(fs.readFileSync(dir+'articles/401amtj.json','utf8'));
const out=JSON.parse(fs.readFileSync(dir+'en/401amtj.p5.json','utf8'));
const cjk=/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\u3400-\u4dbf]/;
const full=[/\u3010/g,/\u3011/g,/\u3014/g,/\u3015/g,/\u300a/g,/\u300b/g,/\u30fb/g,/\u2026/g,/\uff0c/g,/\u3002/g];
const first=out.firstBlock;
const L=out.blocks.length;
const S=282,E=367;
console.log('firstBlock',first,'blocks',L,'expect',(E-S+1));
let ok=true;
if(L!==(E-S+1)){console.log('COUNT MISMATCH');ok=false;}
if(first!==S){console.log('FIRSTBLOCK MISMATCH');ok=false;}
for(let k=0;k<L;k++){
  const b=src.blocks[S+k];
  const o=out.blocks[k];
  if(o.t!==b.t){console.log('T MISMATCH at output idx',k,'src',b.t,'out',o.t);ok=false;}
  const sN=(b.inline||[]).length, oN=(o.inline||[]).length;
  if(sN!==oN){console.log('SEG MISMATCH at block',S+k,'src',sN,'out',oN);ok=false;}
  (o.inline||[]).forEach((seg,si)=>{
    if(seg.href!==undefined && (!b.inline[si]||b.inline[si].href!==seg.href)){console.log('HREF MISMATCH at block',S+k,'seg',si);ok=false;}
    if(!seg.s || seg.s===''){console.log('EMPTY seg at block',S+k,'seg',si);ok=false;}
    if(cjk.test(seg.s)){console.log('CJK at block',S+k,'seg',si,'->',seg.s.slice(0,30));ok=false;}
    for(const r of full){ if(r.test(seg.s)){console.log('FULLWIDTH at block',S+k,'seg',si,'->',seg.s.slice(0,30));ok=false;} }
  });
}
const bytes=Buffer.byteLength(JSON.stringify(out),'utf8');
console.log('bytes',bytes, bytes>40960?'OVER 40KB':'ok');
console.log(ok?'ALL CHECKS PASS':'PROBLEMS FOUND');
