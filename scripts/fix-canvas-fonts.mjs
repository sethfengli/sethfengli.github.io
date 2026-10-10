/**
 * 把 zen3d 组件里写死的 canvas 字体串从已移除的 webfont 名换成项目子集名。
 * 这些字符串是 `ctx.font = '...px "LXGW WenKai","KaiTi",cursive'` 形式的硬编码，
 * 不是 CSS 字体栈，所以 index.css 的改动覆盖不到，必须单独改。
 *
 * 用法：node scripts/fix-canvas-fonts.mjs
 */
import fs from 'node:fs'

const RE = /"LXGW WenKai"/g
const NEW = '"MaShanZhengSubset","KaiTi"'
const RE2 = /"Ma Shan Zheng"/g
const NEW2 = '"MaShanZhengSubset"'

const files = [
  'src/components/zen3d/stage.ts',
  'src/components/zen3d/LotCylinder3D.tsx',
  'src/components/zen3d/censer.ts',
  'src/components/zen3d/Bell3D.tsx',
]

let changed = 0
for (const f of files) {
  const s0 = fs.readFileSync(f, 'utf8')
  let s = s0.replace(RE, NEW).replace(RE2, NEW2)
  if (s !== s0) {
    fs.writeFileSync(f, s, 'utf8')
    const n = (s0.match(RE) || []).length + (s0.match(RE2) || []).length
    console.log(`  ${f}: ${n} 处`)
    changed += n
  }
}
console.log(`\n共替换 ${changed} 处 canvas 字体名`)
