import { Evaluator } from '../../erdl-landing/dist/index.js'

const ev = new Evaluator()
const rule = {
  id: 'T', name: 't',
  conditions: [{ expr: { gt: [{ epoch_ms: { field: 't' } }, 1767229200000 - 1000] } }],
  conditionLogic: 'AND',
  action: { decision: 'DENY', reason: 't' }, priority: 1, enabled: true,
}

let n = 0, fails = 0
function check(label, actual, expected) {
  n++
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

// B1: evidence chain — canonicalTrees hash + asOf + errored + evalWarnings
const r1 = ev.evaluate([rule], { t: '2026-01-01T01:00:00Z' })
check('正常匹配 decision=DENY', r1.decision, 'DENY')
check('canonicalTrees 存在且有 hash', Array.isArray(r1.canonicalTrees) && r1.canonicalTrees.length > 0, true)
check('hash 以 sha256: 开头', r1.canonicalTrees?.[0]?.hash?.startsWith('sha256:') ?? false, true)
check('hash 长度 = 71 (sha256: + 64 hex)', r1.canonicalTrees?.[0]?.hash?.length ?? 0, 71)
check('asOf 是 ISO 时间戳', r1.asOf !== undefined && r1.asOf.startsWith('20') && r1.asOf.includes('-'), true)
check('正常匹配 errored 为 undefined', r1.errored, undefined)

// B2: fail-close on evaluation error
const r2 = ev.evaluate([rule], { t: '2026-02-30' })
check('无效日期 decision=DENY (fail-close)', r2.decision, 'DENY')
check('无效日期 errored=true', r2.errored, true)
check('无效日期 evalWarnings 含 invalid_date', r2.evalWarnings?.some((w) => w.kind === 'invalid_date') ?? false, true)

console.log(`\n${n - fails}/${n} 证据字段断言通过`)
process.exit(fails === 0 ? 0 : 1)
