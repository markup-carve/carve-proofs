export function regexWork(run) {
  const exec = RegExp.prototype.exec, totals = new Map()
  RegExp.prototype.exec = function (value) {
    const key = this.toString(), row = totals.get(key) ?? { pattern: key, calls: 0, inputChars: 0 }
    row.calls++; row.inputChars += typeof value === 'string' ? value.length : String(value).length
    totals.set(key, row)
    return Reflect.apply(exec, this, [value])
  }
  try { run() } finally { RegExp.prototype.exec = exec }
  return [...totals.values()].sort((a, b) => b.inputChars - a.inputChars || a.pattern.localeCompare(b.pattern))
}
