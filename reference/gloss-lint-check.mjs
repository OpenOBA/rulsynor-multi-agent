import { parseErdlDocument } from '../../erdl-landing/dist/index.js'
import { lintGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'
import { ruleWhenToExpr } from '../../erdl-landing/dist/expr-tree/rule-to-expr.js'

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
// B5-e: every rule MUST carry a gloss (G2)
check('规则 gloss 存在且非空', rule.gloss !== undefined && rule.gloss.length > 0, true)

const tree = ruleWhenToExpr(rule)
check('规则可编译为表达式树', tree !== null, true)

// B5-e: lintGloss(rule) MUST verify gloss == render(tree) (G5)
check('lintGloss 正确 gloss 通过', lintGloss(tree, rule.action.decision, rule.gloss, 'en'), true)
const tampered = rule.gloss + ' (tampered)'
check('lintGloss 篡改后失败', lintGloss(tree, rule.action.decision, tampered, 'en'), false)

// B3: decision table rows must also get a gloss
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
check('决策表展开 2 行', dt.rules.length, 2)
check('决策表每行都有 gloss', dt.rules.every((r) => r.gloss !== undefined && r.gloss.length > 0), true)

console.log(`\n${n - fails}/${n} gloss lint 断言通过`)
process.exit(fails === 0 ? 0 : 1)
