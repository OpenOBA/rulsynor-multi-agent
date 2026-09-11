import { parseErdlDocument } from '../../erdl-landing/dist/index.js'
import { renderGloss, lintGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'
import { ruleWhenToExpr } from '../../erdl-landing/dist/expr-tree/rule-to-expr.js'
import { fromSExpr } from '../../erdl-landing/dist/expr-tree/s-expression.js'

const doc = parseErdlDocument(`
protocol: "erdl/v2"
version: "2.1.0"
metadata: { name: "g", decision: ALLOW }
rules:
  - name: "SEC-040-read-file"
    description: "放行 read_file"
    when:
      logic: AND
      conditions:
        - field: "tool.name"
          operator: eq
          value: "read_file"
    then: ALLOW
`)

const rule = doc.rules[0]
console.log('规则 gloss:', JSON.stringify(rule.gloss))

// lintGloss 校验
const tree = ruleWhenToExpr(rule) ?? fromSExpr(rule.conditions[0].expr)
const ok = lintGloss(tree, rule.action.decision, rule.gloss, 'en')
console.log('lintGloss 校验通过:', ok)

// 篡改后应失败
const tampered = rule.gloss + ' (tampered)'
console.log('篡改后 lintGloss:', lintGloss(tree, rule.action.decision, tampered, 'en'), '(期望 false)')

// 决策表 gloss 也应生成
const dt = parseErdlDocument(`
protocol: "erdl/v2"
version: "2.1.0"
metadata: { name: "dt", decision: ALLOW }
rules:
  - name: "SEC-041-amount-table"
    when:
      kind: decision_table
      columns:
        - field: "context.amount"
      rows:
        - when: [["gte", 10000]]
          then: "REQUEST_HUMAN"
        - when: []
          then: "ALLOW"
`)
dt.rules.forEach((r) => console.log('决策表行 gloss:', r.name, '->', JSON.stringify(r.gloss)))
