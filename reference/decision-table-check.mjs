import { parseErdlDocument, Evaluator } from '../../erdl-landing/dist/index.js'

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
          priority: 100
        - when: [["gte", 5000]]
          then: "ESCALATE"
          priority: 90
        - when: []
          then: "ALLOW"
          priority: 1
`)

console.log('展开的规则数:', doc.rules.length)
doc.rules.forEach((r) => console.log('  ', r.name, '->', r.action.decision, '| priority', r.priority, '| cond', JSON.stringify(r.conditions)))

const ev = new Evaluator()
console.log('amount=15000 ->', ev.evaluate(doc.rules, { context: { amount: 15000 } }).decision, '(期望 REQUEST_HUMAN)')
console.log('amount=8000  ->', ev.evaluate(doc.rules, { context: { amount: 8000 } }).decision, '(期望 ESCALATE)')
console.log('amount=100   ->', ev.evaluate(doc.rules, { context: { amount: 100 } }).decision, '(期望 ALLOW)')
