import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { costReport, validateCostData } from '../scripts/profiling/cost-report.mjs'

const data = JSON.parse(readFileSync(new URL('../reports/current-costs.json', import.meta.url)))
test('cost investigation retains every phase and position variant at the installed pins', () => {
  validateCostData(data)
  assert.equal(costReport(data), readFileSync(new URL('../reports/current-costs.md', import.meta.url), 'utf8'))
})
test('cost evidence rejects missing observations and mismatched readers', () => {
  const missing = structuredClone(data); missing.groups.pop()
  assert.throws(() => validateCostData(missing))
  const altered = structuredClone(data); altered.groups[0].rounds[0].samples[0].wallMs += 1
  assert.throws(() => validateCostData(altered))
  const stale = structuredClone(data); stale.metadata.engine = 'github:markup-carve/carve-js#' + '0'.repeat(40)
  assert.throws(() => validateCostData(stale))
})
