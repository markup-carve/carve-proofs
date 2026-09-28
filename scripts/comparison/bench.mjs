import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFileSync, renameSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { cpus, platform, release, arch, loadavg } from 'node:os'
import { comparisonEnvironment, digest } from './environment.mjs'
import { scalingCases } from '../properties/scaling-cases.mjs'
import { decodeWorker } from '../properties/benchmark-results.mjs'
const files = ['scripts/comparison/bench.mjs', 'scripts/comparison/worker.mjs', 'scripts/comparison/adapters.mjs', 'scripts/comparison/environment.mjs', 'scripts/properties/scaling-cases.mjs', 'scripts/properties/benchmark-results.mjs']
const output = process.argv[2] ?? 'reports/comparison-timings.json', families = process.argv[3]?.split(',') ?? Object.keys(scalingCases)
for (const family of families) assert.ok(scalingCases[family])
const metadata = { ...comparisonEnvironment(), runnerSha256: digest(files), generatedAt: new Date().toISOString(), node: process.version, platform: platform(), release: release(), arch: arch(), cpu: cpus()[0].model, logicalCpus: cpus().length, loadStart: loadavg(), method: 'Serial workers, 60s group deadline including startup, at least 200ms warmup per size, five batches of at least 20ms with 16-call time checks and no iteration cap, GC before batches. Render reuses a prebuilt AST. CPU includes all process threads. RSS is cumulative peak.' }
const groups = []
for (const reader of ['carve', 'djot', 'commonmark']) for (const mode of ['parse', 'render', 'html']) for (const family of families) {
  const processResult = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./worker.mjs', import.meta.url)), reader, mode, family], { encoding: 'utf8', timeout: 60_000, maxBuffer: 2_000_000 })
  const { rows, workerError } = decodeWorker(processResult)
  const completed = !workerError && processResult.status === 0 && rows.length === scalingCases[family].sizes.length && rows.every(r => r.status === 'ok')
  groups.push({ reader, mode, family, completed, workerError, exitCode: processResult.status, signal: processResult.signal, rows })
  console.log(`${reader}/${mode}/${family}: ${rows.map(r => `${r.size}:${r.status === 'ok' ? r.medianMs.toFixed(3) : r.status}`).join(' ')}`)
  writeFileSync(output + '.partial', JSON.stringify({ metadata: { ...metadata, loadEnd: loadavg() }, groups }, null, 2) + '\n')
}
renameSync(output + '.partial', output)
assert.ok(groups.every(g => g.completed), 'Incomplete comparison timings; inspect recorded errors')
