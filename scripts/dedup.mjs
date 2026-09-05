import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs'
const remove = [
  '235wuliangshoujinghuijiben-dakewen-ziliao2',
  '239wuliangshoujing-huiyi-zhu',
  '239wuliangshoujing-jiaohuibenzhu',
  '240yinguangdashilunhuijiben-lun',
  '241wuliangshoujing-huiyi-wj2',
]
// catalog.json
const cat = JSON.parse(readFileSync('src/content/catalog.json','utf8'))
const cat2 = cat.filter(a=>!remove.includes(a.slug))
writeFileSync('src/content/catalog.json', JSON.stringify(cat2,null,1)+'\n')
// catalog-en
const ce = JSON.parse(readFileSync('src/content/catalog-en.json','utf8'))
for(const s of remove) delete ce[s]
writeFileSync('src/content/catalog-en.json', JSON.stringify(ce,null,1)+'\n')
// article files + en overlays
let removedFiles=0
for(const s of remove){
  for(const base of ['src/content/articles/'+s, 'src/content/en/'+s]){
    if(existsSync(base+'.json')){ rmSync(base+'.json'); removedFiles++ }
  }
  for(const f of readdirSync('src/content/en').filter(x=>x.startsWith(s+'.p') && /\.p\d+\.json$/.test(x))){ rmSync('src/content/en/'+f); removedFiles++ }
}
writeFileSync('scripts/dedup.log','removed: '+remove.join(', ')+' | articles-removed-from-catalog:'+(cat.length-cat2.length)+' | filesDeleted:'+removedFiles+'\n')
console.log('catalog entries:', cat2.length, '| removed slugs:', remove.length, '| files deleted:', removedFiles)
