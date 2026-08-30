import { readFileSync, readdirSync } from 'node:fs'
const CJK=/[\u4e00-\u9fff]/g
// 常见双重编码乱码串：â€ ã€ Ã« æ å œ Ã¯ etc.
const MOJI=/(\u00e2\u20ac|\u00e3\u20ac|\u00c3|\u00e6|\u00e5|\u0153|\u00c2|\u00b0)/g
const FFFD=/\uFFFD/g
// 严重异常的字符（常用汉字区外的罕见/乱码分布）
function suspicious(s){
  let m=0
  for(const c of s){
    const cp=c.codePointAt(0)
    if(cp>=0x4e00&&cp<=0x9fff) continue // 常用汉字
    if(cp>=0x20&&cp<0x7f) continue      // ASCII
    if(/[\u3000-\u303f\u00b7\uff00-\uffe5]/.test(c)) continue // 全角标点/中点
    if(cp>=0xff61&&cp<=0xff9f) continue // 半角假名
    if(/[\u2018\u2019\u201c\u201d\u2014\u2013]/.test(c)) continue // 中文引号破折号
    m++
    if(m>40) break
  }
  return m
}
const bad=[]
for(const f of readdirSync('src/content/articles').filter(x=>x.endsWith('.json'))){
  let s
  try{ s=readFileSync('src/content/articles/'+f,'utf8') }catch(e){ bad.push(f+'  READ_FAIL'); continue }
  const flags=[]
  if(FFFD.test(s)) flags.push('U+FFFD')
  if(MOJI.test(s)) flags.push('latin-moji')
  // 标题层面的强疑似：标题含非常用分布
  let d
  try{ d=JSON.parse(s) }catch(e){ bad.push(f+'  JSON_FAIL'); continue }
  const t=d.title+''
  const titleSusp = (t.match(CJK)||[]).length ? suspicious(t) : -1
  const bodySusp = suspicious((d.blocks||[]).slice(0,30).map(b=>(b.text||(b.inline||[]).map(i=>i.s).join(''))).join(''))
  if(flags.length || titleSusp>6 || bodySusp>60) bad.push(`${f}  flags=${flags.join('/')||'-'} titleSusp=${titleSusp} bodySusp=${bodySusp}`)
}
console.log('articles scanned; suspicious/corrupted:')
for(const x of bad) console.log(' ', x)
