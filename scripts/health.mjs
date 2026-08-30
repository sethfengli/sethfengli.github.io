import { readFileSync, readdirSync, existsSync } from 'node:fs'
const cat = JSON.parse(readFileSync('src/content/catalog.json','utf8'))
const arts = new Set(readdirSync('src/content/articles').filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')))
const en = new Set(readdirSync('src/content/en').filter(f=>f.endsWith('.json') && !/\.(p\d+|part\d+)\.json$/.test(f)).map(f=>f.replace(/\.json$/,'')))
const problems=[]
for(const a of cat){
  if(!arts.has(a.slug)) problems.push(`NO_SOURCE_FILE: ${a.slug} (${a.title})`)
}
// check zh article files parse
const zhBad=[]
for(const f of readdirSync('src/content/articles').filter(f=>f.endsWith('.json'))){
  try{ JSON.parse(readFileSync('src/content/articles/'+f,'utf8')) }catch(e){ zhBad.push(f+': '+e.message.split('\n')[0]) }
}
// check en whole files parse + no CJK
const enBad=[]
for(const f of readdirSync('src/content/en').filter(f=>f.endsWith('.json') && !/\.(p\d+|part\d+)\.json$/.test(f))){
  try{ const d=JSON.parse(readFileSync('src/content/en/'+f,'utf8')); if(/[\u3400-\u9fff]/.test(JSON.stringify(d))) enBad.push(f+': still-CJK') }catch(e){ enBad.push(f+': '+e.message.split('\n')[0]) }
}
console.log('catalog entries:', cat.length)
console.log('catalog slug w/o zh source file:', problems.length, problems.slice(0,20).join(' | '))
console.log('zh article files that FAIL to parse:', zhBad.length, zhBad.slice(0,20).join(' | '))
console.log('en whole files that FAIL/CJK:', enBad.length, enBad.slice(0,20).join(' | '))
