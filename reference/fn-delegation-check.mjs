import { ERDLFnRegistry } from '../../erdl-landing/dist/fn-registry.js'
import { ExprTreeEvaluator } from '../../erdl-landing/dist/expr-tree/evaluator.js'
import { toSExpr, fromSExpr } from '../../erdl-landing/dist/expr-tree/s-expression.js'
import { renderGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'

let n = 0, fails = 0
function check(label, actual, expected) {
  n++
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

const fnNode = { type: 'fn', name: 'is_internal_domain', args: [{ type: 'field', field: 'recipient.domain' }] }
const ctx = (field) => ({ resolveField: () => field, resolveVar: () => undefined, asOf: undefined })

// 1. s-expression roundtrip (B7: fn node key)
const sexpr = toSExpr(fnNode)
check('toSExpr = { fn: { name, args } }', JSON.stringify(sexpr), JSON.stringify({ fn: { name: 'is_internal_domain', args: [{ field: 'recipient.domain' }] } }))
const roundtripped = fromSExpr(sexpr)
check('roundtrip type = fn', roundtripped.type, 'fn')
check('roundtrip name', roundtripped.name, 'is_internal_domain')
check('roundtrip args 长度', roundtripped.args.length, 1)

// 2. fn 求值：无 registry → errored；已注册 deterministic → 结果
const evNoReg = new ExprTreeEvaluator()
const r1 = evNoReg.evaluate(fnNode, ctx('evil.com'))
check('无 registry → errored', r1.errored, true)

const registry = new ERDLFnRegistry()
registry.register({
  signature: { name: 'is_internal_domain', signature: 'is_internal_domain(domain) -> boolean', params: ['domain'], returns: 'boolean' },
  impl: (domain) => domain.endsWith('.internal.example.com'),
  deterministic: true,
})
const ev = new ExprTreeEvaluator(registry)
const r2 = ev.evaluate(fnNode, ctx('partner.internal.example.com'))
check('已注册 deterministic 求值 errored=false', r2.errored, false)
check('已注册 deterministic 求值 value=true', r2.value, true)

// 3. 未注册函数名 → errored
const r3 = ev.evaluate({ type: 'fn', name: 'not_registered', args: [] }, ctx(undefined))
check('未注册函数 → errored', r3.errored, true)

// 4. 非 deterministic 函数 → errored (Guard 路径必须确定性)
const regNonDet = new ERDLFnRegistry()
regNonDet.register({
  signature: { name: 'non_det', signature: 'non_det() -> number', params: [], returns: 'number' },
  impl: () => Math.random(),
  deterministic: false,
})
const evNonDet = new ExprTreeEvaluator(regNonDet)
const r4 = evNonDet.evaluate({ type: 'fn', name: 'non_det', args: [] }, ctx(undefined))
check('非 deterministic 函数 → errored', r4.errored, true)

// 5. gloss 渲染：fn 节点 + Grade C 标记
const g = renderGloss(fnNode, 'DENY', 'en')
check('gloss 含 fn 名', g.includes('is_internal_domain'), true)
check('gloss 含 Grade C 标记', g.includes('non-recomputable function delegation'), true)

// 6. invokeSync 记录 argsHash + resultHash（sha256 纳入 DO 原像）
const reg2 = new ERDLFnRegistry()
reg2.register({ signature: { name: 'f', signature: 'f(x) -> number', params: ['x'], returns: 'number' }, impl: (x) => x * 2, deterministic: true })
reg2.invokeSync('f', 21)
const log = reg2.getCallLog()[0]
check('argsHash 长度 64 (sha256 hex)', log.argsHash?.length ?? 0, 64)
check('resultHash 长度 64 (sha256 hex)', log.resultHash?.length ?? 0, 64)
check('invokeSync result = 42', log.result, 42)

// 7. async invoke 也记录 argsHash + resultHash（补齐 async 路径遗漏）
const reg3 = new ERDLFnRegistry()
reg3.register({ signature: { name: 'g', signature: 'g(x) -> number', params: ['x'], returns: 'number' }, impl: (x) => x * 3, deterministic: true })
await reg3.invoke('g', 7)
const log3 = reg3.getCallLog()[0]
check('async invoke argsHash 长度 64', log3.argsHash?.length ?? 0, 64)
check('async invoke resultHash 长度 64', log3.resultHash?.length ?? 0, 64)
check('async invoke result = 21', log3.result, 21)

console.log(`\n${n - fails}/${n} fn 委派断言通过`)
process.exit(fails === 0 ? 0 : 1)
