import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { cases } from '../scripts/ownership/cases.mjs'
import { project, partition } from '../scripts/ownership/projection.mjs'

test('HTML comparison keeps ownership, tightness, code bytes and attributes', () => {
  assert.deepEqual(project('<ul>\n<li>a</li>\n</ul>'), project('<ul><li>a</li></ul>'))
  for (const [left, right] of [
    ['<ul><li>a<p>b</p></li></ul>', '<ul><li>a</li></ul><p>b</p>'],
    ['<ul><li>a</li></ul>', '<ul><li><p>a</p></li></ul>'],
    ['<pre><code>a\n</code></pre>', '<pre><code>a</code></pre>'],
    ['<p><code>a  b</code></p>', '<p><code>a b</code></p>'],
    ['<h1 id="a">a</h1>', '<h1>a</h1>'],
  ]) assert.notDeepEqual(project(left), project(right))
  assert.deepEqual(partition({ spec: '<p>a</p>', js: '<p>a</p>\n', php: '<p>b</p>', rs: '<p>b</p>' }), [['spec', 'js'], ['php', 'rs']])
})

test('matrix covers both issue seeds and has unique case identifiers', () => {
  const rows = cases()
  assert.equal(rows.length, 472)
  assert.equal(new Set(rows.map(row => `${row.family}/${row.id}`)).size, rows.length)
  assert.equal(rows.find(row => row.id === 'footnote-quote/3/code').source, 'x[^1]\n\n[^1]: > q\n\n   ```js\n   c\n   ```\n')
  assert.equal(rows.find(row => row.id === 'list/comment/end').source, '- a\n\n  %% n\n')
})

test('recorded matrix includes all generated sources and valid reader partitions', () => {
  const result = JSON.parse(readFileSync(new URL('../reports/ownership-results.json', import.meta.url)))
  assert.deepEqual(result.pins, JSON.parse(readFileSync(new URL('../scripts/ownership/pins.json', import.meta.url))))
  assert.deepEqual(result.rows.map(({ family, id, source, parameters }) => ({ family, id, source, parameters })), cases())
  for (const row of result.rows) {
    assert.deepEqual(Object.keys(row.outputs), ['spec', 'js', 'php', 'rs'])
    assert.deepEqual(row.groups, partition(row.outputs))
  }
})

test('every disagreement has a triage family and a matching representative', async () => {
  const { finding, representatives } = await import('../scripts/ownership/findings.mjs')
  const { rows } = JSON.parse(readFileSync(new URL('../reports/ownership-results.json', import.meta.url)))
  const observed = new Set(rows.map(finding).filter(Boolean))
  assert.deepEqual([...observed].sort(), Object.keys(representatives).sort())
  for (const [name, id] of Object.entries(representatives)) assert.equal(finding(rows.find(row => row.id === id)), name)
})

test('reduction rechecks earlier positions after each deletion', async () => {
  const { reduce } = await import('../scripts/ownership/reduce.mjs')
  const accepted = new Set(['abc', 'ac', 'c'])
  assert.equal(reduce('abc', source => accepted.has(source)), 'c')
  assert.throws(() => reduce('x', () => { throw new Error('reader failed') }), /reader failed/)
})

test('reduced witnesses preserve geometry and their original reader split', async () => {
  const { skeleton } = await import('../scripts/ownership/reduce.mjs')
  const { representatives } = await import('../scripts/ownership/findings.mjs')
  const evidence = JSON.parse(readFileSync(new URL('../reports/ownership-results.json', import.meta.url)))
  const reduced = JSON.parse(readFileSync(new URL('../reports/ownership-reductions.json', import.meta.url)))
  assert.deepEqual(reduced.pins, evidence.pins)
  assert.deepEqual(reduced.rows.map(row => row.id), Object.keys(representatives))
  for (const row of reduced.rows) {
    const original = evidence.rows.find(candidate => candidate.id === representatives[row.id])
    assert.equal(row.original, original.source)
    assert.equal(skeleton(row.source), skeleton(row.original))
    assert.ok(row.source.length <= row.original.length)
    assert.deepEqual(row.groups, original.groups)
    assert.deepEqual(row.groups, partition(row.outputs))
  }
})

test('triage preserves block recognition and nested owner direction', async () => {
  const { finding } = await import('../scripts/ownership/findings.mjs')
  const { rows } = JSON.parse(readFileSync(new URL('../reports/ownership-results.json', import.meta.url)))
  const partitions = new Map()
  const text = node => typeof node === 'string' ? node : node.children.map(text).join('')
  function targetDepth(html, tag) {
    const depths = []
    function visit(node, depth) {
      if (typeof node === 'string') return
      if (node.tag === 'ul') depth++
      const hasPayload = node.children.some(child => typeof child === 'string'
        ? child.includes('tail') : ['p', 'code'].includes(child.tag) && text(child).includes('tail'))
      if (node.tag === tag && hasPayload) depths.push(depth)
      node.children.forEach(child => visit(child, depth))
    }
    project(html).forEach(node => visit(node, 0))
    return depths
  }
  for (const row of rows) {
    const group = finding(row)
    if (!group) continue
    if (!partitions.has(group)) partitions.set(group, row.groups)
    assert.deepEqual(row.groups, partitions.get(group), `${group} reader partition`)
    const tag = { heading: 'h1', quote: 'blockquote', fence: 'pre' }[row.parameters.follower]
    if (!tag) continue
    for (const reader of ['spec', 'js', 'php', 'rs']) {
      let expected
      if (group === 'quote-lazy-interruption') {
        if (row.parameters.follower === 'quote') {
          assert.equal(row.outputs[reader].includes('&gt; tail'), reader !== 'rs', `${row.id}/${reader} literal marker`)
        } else expected = reader === 'rs' ? [1] : []
      }
      if (group === 'opener-after-content-comment') expected = ['js', 'php'].includes(reader) ? [1] : []
      if (group === 'nested-content-comment-opener') expected = ['spec', 'rs'].includes(reader) ? [2] : [1]
      if (group === 'nested-comment-outer-opener') expected = reader === 'rs' ? [] : [1]
      if (group === 'nested-comment-inner-opener') expected = reader === 'rs' ? [1] : [2]
      if (expected) assert.deepEqual(targetDepth(row.outputs[reader], tag), expected, `${row.id}/${reader}`)
    }
  }
})

test('projection ignores block-edge formatting while preserving inline word separation', () => {
  assert.deepEqual(project('<li>intro\n  tail\n</li>'), project('<li>intro tail</li>'))
  assert.notDeepEqual(project('<p>a <em>b</em></p>'), project('<p>a<em>b</em></p>'))
})

test('footnote fences and control hosts keep their block interpretation', () => {
  const { rows } = JSON.parse(readFileSync(new URL('../reports/ownership-results.json', import.meta.url)))
  const fences = rows.filter(row => row.family === 'fences')
  assert.equal(fences.length, 42)
  for (const row of fences) {
    assert.deepEqual(row.groups, [['spec', 'js', 'php', 'rs']], row.id)
    const expected = row.parameters.fence === 'code'
      ? '<pre><code class="language-js">c\n</code></pre>' : '<b>c</b>'
    for (const [reader, html] of Object.entries(row.outputs)) {
      assert.ok(html.includes(expected), `${row.id}/${reader}: expected rendered block payload`)
    }
  }
})
