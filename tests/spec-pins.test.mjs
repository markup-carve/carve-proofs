import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateSpecPins } from '../scripts/spec-pins.mjs'

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'))

test('the standalone dependencies match the pinned specification', () => {
  validateSpecPins()
})

test('a different engine commit cannot be used without updating the spec pin', () => {
  const project = read('package.json')
  project.devDependencies['@markup-carve/carve'] = 'github:markup-carve/carve-js#other'
  assert.throws(() => validateSpecPins({ project }), /manifest pin differs/)
})

test('a different parser version inside the allowed range is still a changed pin', () => {
  const lock = read('package-lock.json')
  lock.packages['node_modules/ohm-js'].version = '17.5.1'
  assert.throws(() => validateSpecPins({ lock }), /locked version differs/)
})

test('missing dependency evidence fails instead of counting as matching', () => {
  const lock = read('package-lock.json')
  delete lock.packages['node_modules/@markup-carve/carve']
  assert.throws(() => validateSpecPins({ lock }), /missing lockfile entry/)
})
