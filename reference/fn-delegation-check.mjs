import { ERDLFnRegistry } from '../../erdl-landing/dist/fn-registry.js'
import { ExprTreeEvaluator } from '../../erdl-landing/dist/expr-tree/evaluator.js'
import { toSExpr, fromSExpr } from '../../erdl-landing/dist/expr-tree/s-expression.js'
import { renderGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'

// 1. s-expression roundtrip
const fnNode = { type: 'fn', name: 'is_internal_domain', args: [{ type: 'field', field: 'recipient.domain' }] }
const sexpr = toSExpr(fnNode)
console.log('[1] toSExpr:', JSON.stringify(sexpr))
const roundtripped = fromSExpr(sexpr)
console.log('[1] roundtrip name:', roundtripped.type === 'fn' ? roundtripped.name : 'FAIL', '| args:', roundtripped.type === 'fn' ? roundtripped.args.length : 'FAIL')

// 2. fn 求值：未注册 → errored；已注册 → 结果
const registry = new ERDLFnRegistry()
const evNoReg = new ExprTreeEvaluator() // 无 registry
const r1 = evNoReg.evaluate(fnNode, { resolveField: (f) => 'evil.com', resolveVar: () => undefined, asOf: undefined })
console.log('[2] 无 registry 求值: errored=' + r1.errored + ' value=' + JSON.stringify(r1.value))

registry.register({
  signature: { name: 'is_internal_domain', signature: 'is_internal_domain(domain) -> boolean', params: ['domain'], returns: 'boolean' },
  impl: (domain) => domain.endsWith('.internal.example.com'),
  deterministic: true,
})
const ev = new ExprTreeEvaluator(registry)
const r2 = ev.evaluate(fnNode, { resolveField: (f) => 'partner.internal.example.com', resolveVar: () => undefined, asOf: undefined })
console.log('[2] 已注册求值(内部域名): errored=' + r2.errored + ' value=' + JSON.stringify(r2.value) + '(期望 true)')

// 3. 未注册函数名 → errored
const ev2 = new ExprTreeEvaluator(registry)
const r3 = ev2.evaluate({ type: 'fn', name: 'not_registered', args: [] }, { resolveField: () => undefined, resolveVar: () => undefined, asOf: undefined })
console.log('[3] 未注册函数: errored=' + r3.errored + '(期望 true)')

// 4. gloss 渲染
console.log('[4] gloss:', renderGloss(fnNode, 'DENY', 'en'))

// 5. invokeSync 记录哈希
const reg2 = new ERDLFnRegistry()
reg2.register({ signature: { name: 'f', signature: 'f(x) -> number', params: ['x'], returns: 'number' }, impl: (x) => x * 2, deterministic: true })
reg2.invokeSync('f', 21)
const log = reg2.getCallLog()[0]
console.log('[5] invokeSync 哈希: argsHash=' + (log.argsHash?.length === 64) + ' resultHash=' + (log.resultHash?.length === 64) + ' result=' + log.result)
