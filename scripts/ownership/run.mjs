import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createHash } from 'node:crypto'
import { cases } from './cases.mjs'
import { readers, names } from './readers.mjs'
import { pins } from './build.mjs'
import { partition } from './projection.mjs'

const { values } = parseArgs({ options: { output: { type: 'string' }, check: { type: 'string' } } })
const adapters = await readers()
const rows = cases().map(row => {
  const outputs = Object.fromEntries(names.map(name => {
    try { return [name, adapters[name](row.source)] }
    catch (error) { throw new Error(`${row.family}/${row.id}/${name}: ${error.message}`, { cause: error }) }
  }))
  return { ...row, outputs, groups: partition(outputs) }
})
const digest = createHash('sha256').update(JSON.stringify(cases())).digest('hex')
const result = { pins, projectionVersion: 1, suiteSha256: digest, rows }
if (values.check) assert.deepEqual(result, JSON.parse(readFileSync(values.check)), 'Ownership evidence changed')
if (values.output) writeFileSync(values.output, JSON.stringify(result, null, 2) + '\n')
for (const family of new Set(rows.map(row => row.family))) {
  const selected = rows.filter(row => row.family === family)
  console.log(`${family}: ${selected.length} inputs, ${selected.filter(row => row.groups.length > 1).length} disagreements`)
}
