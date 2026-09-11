import { Evaluator } from '../../erdl-landing/dist/index.js'

const ev = new Evaluator()
const rule = {
  id: 'T', name: 't',
  conditions: [{ expr: { gt: [{ epoch_ms: { field: 't' } }, 1767229200000 - 1000] } }],
  conditionLogic: 'AND',
  action: { decision: 'DENY', reason: 't' }, priority: 1, enabled: true,
}

// 1. 正常匹配 → canonicalTrees 有 sha256 哈希 + asOf 有值
const r1 = ev.evaluate([rule], { t: '2026-01-01T01:00:00Z' })
console.log('[1] 正常匹配: decision=' + r1.decision)
console.log('    canonicalTrees=' + JSON.stringify(r1.canonicalTrees?.map(c => ({ ruleId: c.ruleId, hash: c.hash.slice(0, 24) + '...' }))))
console.log('    asOf 有值=' + (r1.asOf !== undefined && r1.asOf.startsWith('20')) + ' (' + r1.asOf + ')')
console.log('    errored=' + r1.errored)

// 2. 无效日期 → errored=true + evalWarnings 有 invalid_date + decision=DENY（fail-close）
const r2 = ev.evaluate([rule], { t: '2026-02-30' })
console.log('[2] 无效日期: decision=' + r2.decision + ' errored=' + r2.errored)
console.log('    evalWarnings=' + JSON.stringify(r2.evalWarnings?.map(w => w.kind)))
