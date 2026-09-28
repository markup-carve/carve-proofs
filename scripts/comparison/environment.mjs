import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { evidenceEnvironment } from '../evidence-environment.mjs'
const read = p => JSON.parse(readFileSync(new URL('../../' + p, import.meta.url)))
export function comparisonEnvironment() {
  const metadata = evidenceEnvironment(), project = read('package.json'), lock = read('package-lock.json'), installed = read('node_modules/.package-lock.json')
  metadata.parsers = {}
  for (const name of ['@markup-carve/carve', '@djot/djot', 'commonmark']) {
    const p = `node_modules/${name}`, entry = lock.packages[p]
    assert.ok(entry && installed.packages[p], `Missing installed ${name}`)
    for (const key of ['version', 'resolved', 'integrity']) assert.equal(installed.packages[p][key], entry[key], `${name}: installed ${key} differs`)
    if (name !== '@markup-carve/carve') assert.equal(project.devDependencies[name], entry.version, `${name}: require an exact version`)
    metadata.parsers[name] = { version: entry.version, resolved: entry.resolved, ...(entry.integrity ? { integrity: entry.integrity } : {}) }
  }
  assert.equal(metadata.specDirty, false)
  return metadata
}
export function digest(files) { return createHash('sha256').update(files.map(p => readFileSync(new URL('../../' + p, import.meta.url))).join('')).digest('hex') }
export const comparisonFiles = ['scripts/comparison/adapters.mjs', 'scripts/comparison/collect.mjs', 'tests/comparison/fixtures.mjs']
