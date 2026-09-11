import { renderGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'

let n = 0, fails = 0
function check(label, actual, expected) {
  n++
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

// B5-c: not(exists) -> "not (X exists)", NOT "X is absent"
const notExists = { type: 'not', arg: { type: 'exists', arg: { type: 'field', field: 'tool.name' } } }
const g1 = renderGloss(notExists, 'DENY', 'en')
check('not(exists) 含 "not (tool.name exists)"', g1.includes('not (tool.name exists)'), true)
check('not(exists) 不含 "absent"', g1.includes('absent'), false)

// B5-b: any quantifier -> "at least one element in X satisfy" (no duplicated "elements")
const anyQ = { type: 'quantifier', kind: 'any', over: { type: 'field', field: 'recipients' }, predicate: { type: 'compare', op: 'eq', left: { type: 'field', field: 'domain' }, right: { type: 'literal', value: 'internal.example.com' } } }
const g2 = renderGloss(anyQ, 'DENY', 'en')
check('any 量词含 "at least one element in recipients satisfy"', g2.includes('at least one element in recipients satisfy'), true)
check('any 量词不含 "element elements" (重复)', g2.includes('element elements'), false)
check('any 量词不含 "elements elements" (重复)', g2.includes('elements elements'), false)

// B5-a: month_last_day -> "the last day of the month of X" (has "the")
const mld = { type: 'month_last_day', arg: { type: 'field', field: 'date' } }
const g3 = renderGloss(mld, 'DENY', 'en')
check('month_last_day 含 "the last day of the month of date"', g3.includes('the last day of the month of date'), true)

// B5-d: not(eq) -> ne template ("does not equal"), NOT "not (A equals B)"
const notEq = { type: 'not', arg: { type: 'compare', op: 'eq', left: { type: 'field', field: 'a' }, right: { type: 'literal', value: 1 } } }
const g4 = renderGloss(notEq, 'DENY', 'en')
check('not(eq) 含 "does not equal"', g4.includes('does not equal'), true)
check('not(eq) 不含 "not ("', g4.includes('not ('), false)

console.log(`\n${n - fails}/${n} gloss 模板断言通过`)
process.exit(fails === 0 ? 0 : 1)
