const fs=require('fs');
const dir='src/content/en/502yuanjuejingjj.p7.json';
const en=JSON.parse(fs.readFileSync(dir,'utf8'));
const zh=JSON.parse(fs.readFileSync('src/content/articles/502yuanjuejingjj.json','utf8'));
console.log('EN blocks',en.blocks.length,'firstBlock',en.firstBlock);
let ok=true;
for(let i=0;i<en.blocks.length;i++){
  const b=i+en.firstBlock;
  const e=en.blocks[i], z=zh.blocks[b];
  const ty=(z.t==='text')?'text':z.t;
  if(e.t!==ty){console.log('t mismatch',b,e.t,ty);ok=false;}
  if(e.inline&&z.inline){const ec=e.inline.length,zc=z.inline.length;if(ec!==zc){console.log('seg mismatch',b,'en',ec,'zh',zc);ok=false;}}
}
console.log('structure check:',ok?'OK':'MISMATCH');
const len=fs.statSync(dir).size;
console.log('SizeBytes',len,'~',(len/1024).toFixed(2)+'KB');
const text=fs.readFileSync(dir,'utf8');
console.log(/[\u4e00-\u9fff\u3000-\u303f\u3040-\u30ff]/.test(text)?'CJK FOUND':'No CJK');
console.log('hrefs',(text.match(/"href":/g)||[]).length, '(zh)',(JSON.stringify(zh.blocks.slice(549,657)).match(/"href":/g)||[]).length);
