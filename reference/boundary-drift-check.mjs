import { Evaluator } from '../../erdl-landing/dist/index.js'

const ev = new Evaluator()
let n = 0, fails = 0
function check(label, actual, expected) {
  n++
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

// helper: evaluate one rule with one context, return decision
function decision(conditions, context) {
  const rule = {
    id: 'T1_boundary', name: 't1',
    conditions, conditionLogic: 'AND',
    action: { decision: 'DENY', reason: 'test' }, priority: 1, enabled: true,
  }
  return ev.evaluate([rule], context).decision
}

// ---- 1. epoch_ms 时区确定性：无 Z vs 有 Z 必须一致（UTC）----
// 2026-01-01T01:00:00Z 的 epoch 毫秒 = 1767229200000
const EPOCH = 1767229200000
const condEpoch = [{ expr: { gt: [{ epoch_ms: { field: 't' } }, EPOCH - 1000] } }]
const dNoZ = decision(condEpoch, { t: '2026-01-01T01:00:00' })      // 无时区 → 应 UTC
const dZ   = decision(condEpoch, { t: '2026-01-01T01:00:00Z' })     // 有时区
check('epoch_ms 无Z vs 有Z 一致性', dNoZ === dZ, true)
check('epoch_ms 无Z 按 UTC 解析(应 DENY)', dNoZ, 'DENY')

// ---- 2. 求值异常 → fail-closed（E12：求值错误折叠向拦截侧 DENY，非 fail-open ALLOW）----
check('epoch_ms 无效日期 2026-02-30 → fail-close DENY', decision(condEpoch, { t: '2026-02-30' }), 'DENY')
check('epoch_ms 非 ISO 字符串 → fail-close DENY', decision(condEpoch, { t: 'Jan 1 2026' }), 'DENY')

// ---- 3. gt 类型匹配：string "100" vs number 50 → 跨类型应 false（ALLOW）----
const condType = [{ expr: { gt: [{ field: 'x' }, 50] } }]
check('gt string"100" vs number50 跨类型(应 ALLOW)', decision(condType, { x: '100' }), 'ALLOW')
check('gt number100 vs 50(应 DENY)', decision(condType, { x: 100 }), 'DENY')

// ---- 4. 空值传播：字段缺失是「正常不匹配」（E11，errored=false），非求值异常 → ALLOW ----
check('gt 字段缺失 空值传播(应 ALLOW)', decision(condType, {}), 'ALLOW')

// ---- 5. 字符串比较用字典序（Unicode 码点），非数值序：'2' gt '10' 应为 true（DENY）----
const condStr = [{ expr: { gt: [{ field: 's' }, '10'] } }]
check("gt '2' vs '10' 字典序(应 DENY)", decision(condStr, { s: '2' }), 'DENY')

console.log(`\n${n - fails}/${n} 边界断言通过`)
process.exit(fails === 0 ? 0 : 1)
