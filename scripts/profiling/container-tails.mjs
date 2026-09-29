import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import { parse as baselineParse } from 'carve-comparison'
import { parse as candidateParse } from 'carve-tail-candidate'
import { comparisonEnvironment, digest } from '../comparison/environment.mjs'
import { regexWork, suffixWork } from './instrument.mjs'
import { regexTotals } from './summary.mjs'
const { layoutWork } = await import(new URL('./parse.js', import.meta.resolve('carve-tail-candidate')))

export const tailCases = {
  quotes: depth => '> '.repeat(depth) + 'end\n',
  bullets: depth => '- '.repeat(depth) + 'end\n',
  ordered: depth => '1. '.repeat(depth) + 'end\n',
  tasks: depth => '- [ ] '.repeat(depth) + 'end\n',
  attributes: depth => '-{.x} '.repeat(depth) + 'end\n',
  'lazy-quotes': depth => '> '.repeat(depth) + 'end\nlazy\n',
  'multiline-quotes': depth => '> '.repeat(depth) + 'a\n' + '> '.repeat(depth) + 'end\n',
  'blank-lists': depth => '- '.repeat(depth) + 'a\n\n' + '  '.repeat(depth) + 'end\n',
  'comment-lists': depth => '- '.repeat(depth) + 'end\n' + '  '.repeat(depth) + '%% note\n',
  'indented-lists': depth => '- '.repeat(depth) + 'a\n' + '  '.repeat(depth) + 'end\n',
}

function candidatePin() {
  const read = file => JSON.parse(readFileSync(new URL('../../' + file, import.meta.url)))
  const source = read('package.json').devDependencies['carve-tail-candidate']
  assert.match(source, /^github:markup-carve\/carve-js#[0-9a-f]{40}$/)
  const key = 'node_modules/carve-tail-candidate'
  const locked = read('package-lock.json').packages[key]
  const installed = read('node_modules/.package-lock.json').packages[key]
  assert.ok(locked && installed)
  assert.equal(locked.name, '@markup-carve/carve')
  assert.equal(installed.name, '@markup-carve/carve')
  assert.notEqual(source, comparisonEnvironment().engine)
  for (const field of ['version', 'resolved', 'integrity']) assert.equal(installed[field], locked[field])
  assert.ok(locked.resolved.endsWith('#' + source.split('#')[1]))
  return { source, version: locked.version, resolved: locked.resolved, integrity: locked.integrity }
}

function assertShape(ast, depth, source) {
  const points = Array.from(source)
  let containers = 0, leaf = 0
  function visit(node) {
    if (!node || typeof node !== 'object') return
    if (node.type === 'list' || node.type === 'block_quote') containers++
    if (node.pos) {
      const p = node.pos
      assert.ok(Number.isInteger(p.startOffset) && Number.isInteger(p.endOffset))
      assert.ok(p.startOffset >= 0 && p.endOffset >= p.startOffset && p.endOffset <= points.length)
    }
    if (node.type === 'text' && node.value === 'end') {
      leaf++
      assert.ok(node.pos, 'The terminal leaf must retain source positions')
      const p = node.pos, before = points.slice(0, p.startOffset).join('').split('\n')
      assert.equal(points.slice(p.startOffset, p.endOffset).join(''), 'end')
      assert.equal(p.startLine, before.length)
      assert.equal(p.startColumn, Array.from(before.at(-1)).length + 1)
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit)
  }
  visit(ast)
  assert.equal(containers, depth, 'The fixture must retain its requested nesting')
  assert.equal(leaf, 1, 'The nested payload must survive exactly once')
}

export function collectTailWork() {
  const environment = comparisonEnvironment()
  const metadata = {
    baseline: { source: environment.engine, ...environment.parsers['@markup-carve/carve'] },
    candidate: candidatePin(),
    method: 'Deterministic counters in separate parses. UTF-16 input, successful match and suffix argument lengths; global forward progress. These are not engine steps or wall times. Complete ASTs and source positions are checked.',
    copyMethod: 'Candidate layoutWork.seam, enabled around a separate parse: source normalization and attributed-tail reconstruction. Selected UTF-16 copy lengths, not total allocation. Long-payload ASTs are checked against the baseline.',
    suiteSha256: digest(['scripts/profiling/container-tails.mjs', 'scripts/profiling/instrument.mjs', 'scripts/profiling/summary.mjs']),
  }
  const groups = []
  for (const [family, make] of Object.entries(tailCases)) for (const size of [32, 64, 128]) {
    const source = make(size), baseline = baselineParse(source)
    assertShape(baseline, size, source)
    for (const [reader, parse] of [['baseline', baselineParse], ['candidate', candidateParse]]) {
      const ast = parse(source)
      assert.deepEqual(ast, baseline, `${family}/${size}: reader behavior changed`)
      assertShape(ast, size, source)
      let instrumented
      const patterns = regexWork(() => { instrumented = parse(source) })
      assert.deepEqual(instrumented, ast)
      const suffixes = suffixWork(() => { instrumented = parse(source) })
      assert.deepEqual(instrumented, ast)
      const totals = regexTotals(patterns)
      const matchedChars = patterns.reduce((sum, row) => sum + row.matchedChars, 0)
      const globalAdvance = patterns.reduce((sum, row) => sum + row.globalAdvance, 0)
      const terminator = patterns.find(row => row.pattern === String.raw`/[\n\r\u2028\u2029]/`)
      if (reader === 'candidate') assert.ok(terminator, 'The terminator scan must remain observable')
      const terminatorInput = terminator?.inputChars ?? 0
      groups.push({ reader, family, size, source, ...totals, matchedChars, globalAdvance, terminatorInput, suffixes })
      if (reader === 'candidate') {
        assert.equal(suffixes.suffixChars, family === 'lazy-quotes' ? size * 4 : 0, `${family}: suffix work`)
        assert.ok(terminatorInput <= source.length * 5, `${family}: repeated terminator scans`)
      }
    }
  }
  for (const family of Object.keys(tailCases)) {
    const [low, high] = [64, 128].map(size => groups.find(g => g.reader === 'candidate' && g.family === family && g.size === size))
    assert.ok(low.matchedChars > 0 && high.matchedChars <= low.matchedChars * 2.1, `${family}: repeated matched tails`)
  }
  const copies = []
  for (const [family, marker] of [['long-attributes-bullet', '-{.x} '], ['long-attributes-ordered', '1.{.x} '], ['long-attributes-task', '-{.x} [ ] ']]) {
    for (const size of [32, 64, 128]) {
      const payloadLength = 100_000
      const source = marker.repeat(size) + 'x'.repeat(payloadLength) + '\n'
      const previous = layoutWork.on
      layoutWork.reset()
      layoutWork.on = true
      let ast, seam
      try { ast = candidateParse(source); seam = layoutWork.seam }
      finally { layoutWork.on = previous; layoutWork.reset() }
      assert.equal(seam, source.length, `${family}/${size}: attributed tail reconstruction`)
      assert.deepEqual(ast, baselineParse(source), `${family}/${size}: long payload behavior changed`)
      copies.push({ family, marker, size, payloadLength, sourceLength: source.length, seam })
    }
  }
  return { metadata, groups, copies }
}

export function tailReport(data) {
  const rows = Object.keys(tailCases).map(family => {
    const at = (reader, size) => data.groups.find(g => g.family === family && g.reader === reader && g.size === size)
    const old = at('baseline', 128), now = at('candidate', 128), low = at('candidate', 64)
    return `| ${family} | ${old.matchedChars} → ${now.matchedChars} | ${(now.matchedChars / low.matchedChars).toFixed(2)}× | ${(now.inputChars / low.inputChars).toFixed(2)}× | ${old.suffixes.suffixChars} → ${now.suffixes.suffixChars} |`
  }).join('\n')
  return `# Remaining container tail work

Baseline: \`${data.metadata.baseline.source}\`.
Candidate: \`${data.metadata.candidate.source}\`.
This records the changes in merged [parser PR #2378](https://github.com/markup-carve/carve-js/pull/2378)
and candidate [PR #2379](https://github.com/markup-carve/carve-js/pull/2379).
The immutable candidate snapshot is evaluated separately from the established
comparison reader. The PR branch may advance; these results describe only the
commit pinned above.

| Fixture | Matched lengths at depth 128, baseline → candidate | Candidate matched growth, 64 → 128 | Candidate input exposure growth, 64 → 128 | Suffix lengths at depth 128, baseline → candidate |
|---|---:|---:|---:|---:|
${rows}

The fixtures cover ordered and task markers, attached attributes, lazy quotes,
and indented, blank-separated and comment-bearing list continuations. Plain quotes, bullets and multiline quotes are
controls. Each reader must retain the requested nesting, preserve the terminal
payload and produce the same complete AST, including source positions.

The candidate uses prefix recognition for ordered/task markers and attributes.
Lazy quote tracking reuses the terminator check. Literal list dedents carry their
source origins and remaining whitespace widths; transformed lines retain the
fallback checks. Blank restoration reuses the same facts, and comment-block
tracking skips the marker walk when no pair of fences can close. The lazy fixture's four-character continuation still incurs one
suffix comparison per level, so its suffix work grows with depth.

Nine additional candidate observations use 100,000-character payloads under
attributed bullet, ordered and task markers. The parser's seam counter records
only the initial source normalization, with no attributed-tail reconstruction.
These counters cover selected copies, not total allocation. Their charts have a
candidate series only: the baseline does not instrument the same copy sites.

${data.metadata.method}
Failed non-global scans and non-regex operations are outside the matched-length
counter. Input exposure still grows roughly fourfold when depth doubles: it charges the
whole remaining string even to anchored checks that inspect only a prefix. It
is not a count of characters actually inspected. A separate bound guards
terminator-scan input. The counters cover these
fixtures and do not establish whole-parser complexity.

Reproduce with \`npm run check:container-tails\`. Raw observations are in
[container-tail-work.json](container-tail-work.json); the evidence site's
"Remaining container tails" dataset exports SVG, PNG, CSV and JSON charts.
`
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { output: { type: 'string' }, check: { type: 'string' }, report: { type: 'string' } } })
  const data = collectTailWork()
  if (values.check) assert.deepEqual(data, JSON.parse(readFileSync(values.check)))
  if (values.output) writeFileSync(values.output, JSON.stringify(data, null, 2) + '\n')
  if (values.report) writeFileSync(values.report, tailReport(data))
  console.log(`${data.groups.length} container-tail and ${data.copies.length} copy observations checked`)
}
