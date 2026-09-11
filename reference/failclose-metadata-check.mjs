import { Evaluator } from '../../erdl-landing/dist/index.js'

const ev = new Evaluator()

const rule = {
  id: 'T', name: 't',
  conditions: [{ expr: { gt: [{ epoch_ms: { field: 't' } }, 1767229200000 - 1000] } }],
  conditionLogic: 'AND',
  action: { decision: 'DENY', reason: 't' }, priority: 1, enabled: true,
}
const rule2 = {
  id: 'T2', name: 't2',
  conditions: [{ expr: { gt: [{ field: 'x' }, 50] } }],
  conditionLogic: 'AND',
  action: { decision: 'DENY', reason: 't' }, priority: 1, enabled: true,
}

let fails = 0
function check(label, actual, expected) {
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${actual} expected=${expected}`)
}

// 1. 求值异常 + fallbackDecision=ALLOW → 应 DENY（fail-close 覆盖 fallback，不能 fail-open）
check('无效日期 + fallbackDecision=ALLOW → DENY', ev.evaluate([rule], { t: '2026-02-30' }, { fallbackDecision: 'ALLOW' }).decision, 'DENY')
// 2. 求值异常 + 无 fallbackDecision → DENY
check('无效日期 + 无 fallbackDecision → DENY', ev.evaluate([rule], { t: '2026-02-30' }).decision, 'DENY')
// 3. 正常不匹配 + fallbackDecision=ALLOW → ALLOW（正常 fallback，不受影响）
check('正常不匹配 + fallbackDecision=ALLOW → ALLOW', ev.evaluate([rule2], { x: 10 }, { fallbackDecision: 'ALLOW' }).decision, 'ALLOW')
// 4. 正常匹配 DENY → DENY（正常求值不受影响）
check('正常匹配(应 DENY) → DENY', ev.evaluate([rule], { t: '2026-01-01T01:00:00Z' }).decision, 'DENY')

console.log(`\n${4 - fails}/4 通过`)
process.exit(fails === 0 ? 0 : 1)
