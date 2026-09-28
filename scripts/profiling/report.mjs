import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { comparisonEnvironment, digest } from '../comparison/environment.mjs'
import { median, aggregateFrames, regexTotals } from './summary.mjs'
const data = JSON.parse(readFileSync(new URL('../../reports/nesting-profile.json', import.meta.url))), current = comparisonEnvironment()
assert.deepEqual(data.metadata.parsers, current.parsers)
assert.equal(data.metadata.specCommit, current.specCommit)
assert.equal(data.metadata.specDirty, false)
assert.equal(data.metadata.runnerSha256, digest(['scripts/profiling/run.mjs', 'scripts/profiling/worker.mjs', 'scripts/profiling/instrument.mjs', 'scripts/profiling/summary.mjs']))
assert.deepEqual(data.groups.map(g => `${g.reader}/${g.phase}/${g.family}/${g.size}`).sort(), ['js', 'spec'].flatMap(r => ['parse', 'render'].flatMap(p => ['quotes', 'lists'].flatMap(f => [32, 64, 128, 192].map(n => `${r}/${p}/${f}/${n}`)))).sort())
assert.ok(data.groups.every(g => !g.error))
for (const reader of ['js', 'spec']) for (const family of ['quotes', 'lists']) {
  const pick = (phase, size) => data.groups.find(g => g.reader === reader && g.phase === phase && g.family === family && g.size === size)
  const parsing = pick('parse', 192), rendering = pick('render', 192)
  assert.ok(median(rendering.samples.map(s => s.wallMs)) < median(parsing.samples.map(s => s.wallMs)) / 2, 'Review the parse-versus-render conclusion')
  const representatives = family === 'quotes' ? (reader === 'js' ? ['classifyQuotedLine'] : ['nestedQuoteOpensParagraph']) : (reader === 'js' ? ['markerPrefixLength', 'markerLineState', 'parseList'] : ['matchMarkerAt', 'opensParagraph'])
  const hottest = aggregateFrames(parsing.cpuSamples, 'selfUs').slice(0, 10)
  assert.ok(hottest.some(f => representatives.includes(f.function)), 'Review the named prefix hotspots')
  assert.ok(regexTotals(pick('parse', 128).patterns).calls > 2 * regexTotals(pick('parse', 64).patterns).calls, 'Review the faster-than-input call growth conclusion')
}
const fixed = n => n.toFixed(2)
const get = (reader, phase, family, size) => data.groups.find(g => g.reader === reader && g.phase === phase && g.family === family && g.size === size)
const timingRows = ['js', 'spec'].flatMap(reader => ['quotes', 'lists'].map(family => {
  const p64 = get(reader, 'parse', family, 64), p128 = get(reader, 'parse', family, 128), p192 = get(reader, 'parse', family, 192), r192 = get(reader, 'render', family, 192)
  const time = g => median(g.samples.map(s => s.wallMs)), cpu = g => median(g.samples.map(s => s.cpuMs))
  return `| ${reader} | ${family} | ${fixed(time(p64))} → ${fixed(time(p128))} | ${fixed(time(p128)/time(p64))}× | ${fixed(time(p192))} / ${fixed(cpu(p192))} | ${fixed(time(r192))} / ${fixed(cpu(r192))} |`
})).join('\n')
const countRows = ['js', 'spec'].flatMap(reader => ['quotes', 'lists'].map(family => {
  const low = get(reader, 'parse', family, 64), high = get(reader, 'parse', family, 128), a = regexTotals(low.patterns), b = regexTotals(high.patterns)
  const layout = g => reader === 'js' ? g.layout.total : Object.values(g.layout).reduce((a,b) => a+b,0)
  return `| ${reader} | ${family} | ${a.calls} → ${b.calls} | ${fixed(b.calls/a.calls)}× | ${a.inputChars} → ${b.inputChars} | ${layout(low)} → ${layout(high)} |`
})).join('\n')
const allocationRows = ['js', 'spec'].flatMap(reader => ['quotes', 'lists'].map(family => {
  const allocated = (phase, size) => { const g = get(reader, phase, family, size); return g.sampledAllocationBytes/g.heapIterations/1024 }
  return `| ${reader} | ${family} | ${fixed(allocated('parse',64))} | ${fixed(allocated('parse',128))} | ${fixed(allocated('parse',192))} | ${fixed(allocated('render',192))} |`
})).join('\n')
const sourceUrl = file => file.startsWith('spec/') ? `https://github.com/markup-carve/carve/blob/${current.specCommit}/${file.slice(5)}` : file.startsWith('node_modules/@markup-carve/carve/') ? `https://github.com/markup-carve/carve-js/blob/${current.engine.split('#')[1]}/src/parse.ts` : null
const hotspots = ['js', 'spec'].flatMap(reader => ['quotes', 'lists'].map(family => {
  const g = get(reader,'parse',family,192)
  const relevant = aggregateFrames(g.cpuSamples, 'selfUs').filter(n => n.file.startsWith('spec/') || n.file.startsWith('node_modules/@markup-carve/carve/')).slice(0,3)
  const heap = aggregateFrames(g.heapNodes, 'sampledBytes').slice(0,3)
  return `### ${reader}: ${family}\n\nCPU self samples, aggregated across recursive call paths:\n\n${relevant.map(n => `- [\`${n.function}\`](${sourceUrl(n.file)}): ${fixed(n.selfUs/1000)} ms of sampled self time. Runtime location: \`${n.file}:${n.line}\`.`).join('\n')}\n\nLargest allocation frames: ${heap.map(n => `\`${n.function}\` (${fixed(n.sampledBytes/g.heapIterations/1024)} KiB/call)`).join(', ')}.`
})).join('\n\n')
const text = `# Nested-container profiling

Repeated inspection of remaining container prefixes is a source of growth that
the current layout counters miss. CPU profiles, deterministic regex counts and
allocation samples point to parsing work, especially quote-state classification
and list-marker recognition. The render-only samples are much smaller on these
fixtures. This investigation changes no parser implementation.

The JS engine is pinned to \`${current.engine.split('#')[1]}\`; the executable
specification is pinned to \`${current.specCommit}\`. Each source is one line
of repeated quote or list markers followed by \`end\`, at depths 32, 64, 128 and
192. Depth 192 is below the 200-level layout limit. The three-reader comparison
also verifies the resulting JS, Djot and CommonMark trees at these depths.

## Separate parse and render measurements

Median wall milliseconds at depths 64 and 128, then wall / process CPU milliseconds
at depth 192. Render uses a prebuilt AST. Specification parsing builds block
layout; its renderer also interprets inline content. These stages do different
work from their JS counterparts.

| Reader | Family | Parse 64 → 128 | Growth | Parse 192 wall / CPU | Render 192 wall / CPU |
|---|---|---:|---:|---:|---:|
${timingRows}

## Work missing from the old counters

These are exact calls observed with an instrumented \`RegExp.prototype.exec\`
during one parse, including calls made by \`test\` and string operations.
Replacing that method can disable V8 fast paths, so the counts describe matching
attempts under instrumentation, not native instruction counts or call overhead. Input exposure sums the lengths
passed to those calls. It is not the number of characters the regex engine
actually examines: an anchored failure can inspect only the first character.
The exposure column must not be treated as a runtime complexity proof.

| Reader | Family | Regex calls 64 → 128 | Call growth | Input characters presented 64 → 128 | Existing layout counter 64 → 128 |
|---|---|---:|---:|---:|---:|
${countRows}

The operation counts grow faster than input size, so scheduling alone cannot
explain the timing signal. The JS quote tracker walks the remaining quote
prefix in \`trackBlockQuoteLazyState\` and \`classifyQuotedLine\`; each recursive
\`parseBlockQuote\` invokes that tracker again. JS list parsing likewise calls
\`walkContainerPrefix\` and \`markerPrefixLength\` on remaining prefixes.

The specification's \`nestedQuoteOpensParagraph\` loops through the inner quote
markers for each enclosing quote parse. Its \`opensParagraph\` also peels nested
list markers through \`matchMarkerAt\`. These repeated walks explain why the
existing counts for indentation, prefix stripping and source splitting can stay
linear while other work grows faster. The source inspection supports this
mechanism; the samples do not assign an exact fraction of total cost to it.

## Allocation

V8 heap sampling estimates allocated KiB per call, including objects collected
by minor and major GC. These values measure allocation churn, not retained heap
or peak memory, and vary between runs.

| Reader | Family | Parse 64 | Parse 128 | Parse 192 | Render 192 |
|---|---|---:|---:|---:|---:|
${allocationRows}

${hotspots}

CPU profiles include inspector startup and GC frames in the raw data. The lists
above show parser-source frames only, aggregated by function and source location.
Allocation lists include runtime allocation frames such as \`exec\`.
The JS links point to TypeScript source; recorded line numbers refer to installed
JavaScript and are not interchangeable with TypeScript line numbers.

## Regression coverage and next fix

The tests count regex calls and input exposure for both readers at all four
depths. Their ceiling is the recorded count plus 5%, rejecting larger
regressions. A drop below half the baseline also requires review and re-recording
to distinguish a large improvement from instrumentation that stopped observing
work. Sticky-regex calls are rejected because instrumenting regex-based split
can expand one operation into per-position calls. These fixtures contain none. They also compare instrumented and ordinary parse
trees and check that instrumentation restores \`RegExp.prototype.exec\` after an
exception. The ceiling records current behavior; it does not certify linearity or cover prefix work implemented without regexes.

The first optimization target is to reuse the nested paragraph-state result or
carry a shared prefix description into recursive parsing, rather than walking
the remaining markers again at every level. The JS quote tracker is the first
candidate, followed by list prefix walks and the corresponding specification
helpers. Any change needs lazy-continuation, table, fence, definition and mixed
container tests, because those states are why the trackers exist.

## Method and reproduction

${data.metadata.method}
Timing and CPU/heap sampling run before regex instrumentation, so patching the
regex method cannot change optimization behavior during those measurements.
The AST is parsed before render-only measurement, and profiler setup is excluded
from the uninstrumented timings. Inspector self-time remains visible in profiles.

Node ${data.metadata.node}, ${data.metadata.cpu}, ${data.metadata.logicalCpus} logical CPUs;
load averages at completion: ${data.metadata.loadEnd.map(fixed).join(', ')}.
The host is shared. Timings and sampled allocations are evidence for this input
family, not a whole-parser complexity bound. Deterministic regex ceilings run
in CI; sampling and timings are explicit local commands.

\`\`\`sh
npm run profile:nesting -- reports/nesting-profile.json
npm run report:profiling
node --test tests/profiling.test.mjs
\`\`\`

[Profile summaries, counters and measurements](nesting-profile.json).
CPU and heap frames are recorded with their weights; full inspector call trees
and chronological sample streams are not retained.
`
writeFileSync(new URL('../../reports/nesting-profile.md', import.meta.url), text)
