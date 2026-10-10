/**
 * Regression witness for the "slot 01 cannot match {3}" false alarm.
 *
 * A two-digit slot name such as `grottoes-01.webp` has only two digits before
 * the dot, so ANY pattern that demands three consecutive digits (or three
 * consecutive `[0-9]`) correctly fails on it. That is not a regex bug -- it is
 * the check being wrong. Always widen to `[0-9][0-9][0-9]?` when slot numbers
 * may be one, two or three digits wide.
 */
const cases = [
  ['grottoes-048.webp', true],
  ['grottoes-046.webp', true],
  ['grottoes-01.webp', false],
  ['paintings-12.webp', false],
]
const three = /^([a-z]+)-([0-9][0-9][0-9])\./
const widen = /^([a-z]+)-([0-9][0-9][0-9]?)\./
let fail = 0
for (const [name, wantThree] of cases) {
  const got = three.test(name)
  const wide = widen.test(name)
  const slot = wide ? Number(name.match(widen)[2]) : NaN
  const ok = got === wantThree && !Number.isNaN(slot)
  if (!ok) fail++
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(20)} threeDigits=${String(got).padEnd(5)} widened=${String(wide).padEnd(5)} slot=${slot}`,
  )
}
console.log(fail === 0 ? 'RESULT: regex semantics as documented' : `RESULT: ${fail} unexpected`)
process.exit(fail === 0 ? 0 : 1)
