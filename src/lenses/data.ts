// The real numbers behind the lenses. data.json is written by data/scripts/build-lenses.mjs from the
// files in data/parts/, so nothing here is typed in by hand. data/LENSES.md says where each series falls short.
import raw from './data.json'

export interface Point {
  year: number
  x: number
  y: number
}

export const data = raw

export const diff = (a: number[]) => a.slice(1).map((v, i) => v - a[i]!)

export function pearson(a: number[], b: number[]) {
  const n = a.length
  const ma = a.reduce((s, v) => s + v, 0) / n
  const mb = b.reduce((s, v) => s + v, 0) / n
  let c = 0
  let va = 0
  let vb = 0
  for (let i = 0; i < n; i++) {
    c += (a[i]! - ma) * (b[i]! - mb)
    va += (a[i]! - ma) ** 2
    vb += (b[i]! - mb) ** 2
  }
  return c / Math.sqrt(va * vb)
}
