import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'carve-comparison'
import { parse as parseSpec } from '../spec/scripts/spec/layout.mjs'
import { regexWork } from '../scripts/profiling/instrument.mjs'
import { aggregateFrames, regexTotals } from '../scripts/profiling/summary.mjs'

test('regex instrumentation preserves results and restores exec after failure', () => {
  const original = RegExp.prototype.exec
  const patterns = regexWork(() => { assert.equal(/^a/.test('abc'), true); assert.equal('aaa'.replace(/a/g, 'b'), 'bbb') })
  assert.equal(RegExp.prototype.exec, original)
  assert.equal(patterns.find(p => p.pattern === '/^a/').calls, 1)
  assert.equal(patterns.find(p => p.pattern === '/a/g').calls, 4)
  assert.throws(() => regexWork(() => { throw new Error('fixture') }), /fixture/)
  assert.equal(RegExp.prototype.exec, original)
})
test('profile aggregation sums repeated call frames without mixing locations', () => {
  const rows = [{ function: 'f', file: 'a', line: 1, selfUs: 2 }, { function: 'f', file: 'a', line: 1, selfUs: 3 }, { function: 'f', file: 'a', line: 2, selfUs: 1 }]
  assert.deepEqual(aggregateFrames(rows, 'selfUs').map(r => r.selfUs), [5, 1])
})
const snapshot = JSON.parse(readFileSync(new URL('../reports/nesting-profile.json', import.meta.url)))
for (const reader of ['js', 'spec']) for (const family of ['quotes', 'lists']) test(`${reader}/${family}: repeated prefix regex work stays within the measured ceiling`, () => {
  for (const size of [32, 64, 128, 192]) {
    const source = (family === 'quotes' ? '> ' : '- ').repeat(size) + 'end\n', parser = reader === 'js' ? parse : parseSpec
    const before = parser(source)
    let after
    const actual = regexTotals(regexWork(() => { after = parser(source) }))
    assert.deepEqual(after, before, 'Instrumentation changed the parse result')
    const recorded = snapshot.groups.find(g => g.reader === reader && g.phase === 'parse' && g.family === family && g.size === size)
    const baseline = regexTotals(recorded.patterns)
    assert.ok(actual.calls >= baseline.calls * 0.5, `Regex calls fell by more than half at ${size}; review instrumentation and re-record improvements`)
    assert.ok(actual.inputChars >= baseline.inputChars * 0.5, `Regex input exposure fell by more than half at ${size}; review and re-record`)
    assert.ok(actual.calls > 0 && actual.calls <= Math.ceil(baseline.calls * 1.05), `Regex calls at ${size}: ${actual.calls} > baseline ${baseline.calls} + 5%`)
    assert.ok(actual.inputChars > 0 && actual.inputChars <= Math.ceil(baseline.inputChars * 1.05), `Regex input exposure at ${size} exceeded baseline + 5%`)
  }
})

test('sticky regex split expansion cannot silently enter the work totals', () => {
  const patterns = regexWork(() => 'alpha beta'.split(/ /))
  assert.throws(() => regexTotals(patterns), /Sticky regex calls need review/)
})

test('post-fix JavaScript keeps simple nesting regex-call growth near doubling', () => {
  for (const family of ['quotes', 'lists']) {
    const marker = family === 'quotes' ? '> ' : '- '
    const counts = [64, 128, 192].map(depth => regexTotals(regexWork(() => parse(marker.repeat(depth) + 'end\n'))).calls)
    assert.ok(counts[1] <= counts[0] * 2.1, `${family}: depth doubling repeats excess regex work`)
    assert.ok(counts[2] <= counts[1] * 1.6, `${family}: depth growth repeats excess regex work`)
  }
})
