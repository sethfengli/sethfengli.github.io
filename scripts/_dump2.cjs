const zh = JSON.parse(require('fs').readFileSync('src/content/articles/502yuanjuejingjj.json','utf8'));
for(let i=549;i<=656;i++){
  const b=zh.blocks[i];
  let desc=`${i}: ${b.t}`;
  if(b.inline){desc+=` inline=${b.inline.length}`;}
  else if(b.text){desc+=` text`;}
  if(b.inline){ desc += ' | ' + b.inline.map((s)=>'['+s.s.slice(0,8)+(s.href?'H':'')+']').join(' '); }
  console.log(desc);
}
console.log('total', zh.blocks.length, 'prev548:', zh.blocks[548].t, 'next657:', zh.blocks[657].t);
