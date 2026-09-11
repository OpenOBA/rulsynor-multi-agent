import { renderGloss } from '../../erdl-landing/dist/expr-tree/gloss.js'

// 1. not(exists) → not (X exists)，不是 "X is absent"
const notExists = { type: 'not', arg: { type: 'exists', arg: { type: 'field', field: 'tool.name' } } }
console.log('[1] not(exists):', renderGloss(notExists, 'DENY', 'en'))

// 2. any 量词 → "at least one element in X satisfy"（无重复 elements）
const anyQ = { type: 'quantifier', kind: 'any', over: { type: 'field', field: 'recipients' }, predicate: { type: 'compare', op: 'eq', left: { type: 'field', field: 'domain' }, right: { type: 'literal', value: 'internal.example.com' } } }
console.log('[2] any quantifier:', renderGloss(anyQ, 'DENY', 'en'))

// 3. month_last_day → "the last day of the month of X"（有 the）
const mld = { type: 'month_last_day', arg: { type: 'field', field: 'date' } }
console.log('[3] month_last_day:', renderGloss(mld, 'DENY', 'en'))

// 4. not(eq) → ne 模板（不是 "not (A equals B)"）
const notEq = { type: 'not', arg: { type: 'compare', op: 'eq', left: { type: 'field', field: 'a' }, right: { type: 'literal', value: 1 } } }
console.log('[4] not(eq):', renderGloss(notEq, 'DENY', 'en'))
