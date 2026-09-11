import { parseErdlDocument, Evaluator } from '../../erdl-landing/dist/index.js'

let n = 0, fails = 0
function check(label, actual, expected) {
  n++
  const ok = actual === expected
  if (!ok) fails++
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}

const doc = parseErdlDocument(`
protocol: "erdl/v2"
version: "2.1.0"
metadata: { name: "amount-approval", decision: ALLOW }
rules:
  - name: "SEC-030-amount-table"
    description: "申请金额分级审批"
    when:
      kind: decision_table
      columns:
        - field: "context.amount"
          label: "申请金额"
      rows:
        - when: [["gte", 10000]]
          then: "REQUEST_HUMAN"
        - when: [["gte", 5000]]
          then: "ESCALATE"
        - when: []
          then: "ALLOW"
`)

// B3: rows expand into one RuleDefinition each; priority = row order (i+1), not the row's own number
check('决策表展开 3 条规则', doc.rules.length, 3)
check('row-1 名称', doc.rules[0]?.name, 'SEC-030-amount-table-row-1')
check('row-1 decision', doc.rules[0]?.action.decision, 'REQUEST_HUMAN')
check('row-1 priority=1 (行序)', doc.rules[0]?.priority, 1)
check('row-2 名称', doc.rules[1]?.name, 'SEC-030-amount-table-row-2')
check('row-2 decision', doc.rules[1]?.action.decision, 'ESCALATE')
check('row-2 priority=2 (行序)', doc.rules[1]?.priority, 2)
check('row-3 名称', doc.rules[2]?.name, 'SEC-030-amount-table-row-3')
check('row-3 decision', doc.rules[2]?.action.decision, 'ALLOW')
check('row-3 priority=3 (行序)', doc.rules[2]?.priority, 3)
// empty row compiles to a literal-true condition (catch-all); toSExpr(literal true) = true
check('row-3 空行 = literal true', JSON.stringify(doc.rules[2]?.conditions), JSON.stringify([{ expr: true }]))

// B3: hit semantics — first matching row wins (single-hit policy)
const ev = new Evaluator()
check('amount=15000 -> REQUEST_HUMAN', ev.evaluate(doc.rules, { context: { amount: 15000 } }).decision, 'REQUEST_HUMAN')
check('amount=8000  -> ESCALATE', ev.evaluate(doc.rules, { context: { amount: 8000 } }).decision, 'ESCALATE')
check('amount=100   -> ALLOW', ev.evaluate(doc.rules, { context: { amount: 100 } }).decision, 'ALLOW')

console.log(`\n${n - fails}/${n} 决策表断言通过`)
process.exit(fails === 0 ? 0 : 1)
