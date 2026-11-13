<script setup lang="ts">
// The true cost of things in the almanac: each price adjusted for inflation, drawn as objects sized by what they cost.
import { computed, ref } from 'vue'

import { change, data, last, linesSvg, objectsSvg } from './draw'

const items = data.prices.items
const current = ref('salon')
const item = computed(() => items.find((i) => i.key === current.value)!)

const byKey = (k: string) => items.find((i) => i.key === k)!
const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(Math.abs(n) < 10 ? 1 : 0)}%`

// For potato chips the series is a real dollar price, so the objects can be labelled in today's dollars.
const chipsToday = computed(() => {
  const chips = byKey('potato-chips')
  const lastYear = String(last(chips.points)[0])
  return (chips.nominal![lastYear]! / last(chips.points)[1]) * 100
})

const cards = computed(() => {
  const it = item.value
  const [y0, v0] = it.points[0]!
  const [y1, v1] = last(it.points)
  if (it.key === 'iron-nails')
    return [
      { big: '10×', small: 'cheaper in 1930 than in 1790' },
      { big: `${(v1 / it.points.find((p) => p[0] === 1930)![1]).toFixed(0)}×`, small: `dearer in ${y1} than in 1930` },
    ]
  if (it.key === 'potato-chips')
    return [
      { big: `$${it.nominal![y0]!.toFixed(2)}`, small: `a bag in ${y0}, which is $${chipsToday.value.toFixed(2)} in ${y1} money` },
      { big: `$${it.nominal![y1]!.toFixed(2)}`, small: `a bag in ${y1}` },
      { big: pct(v1 / v0 * 100 - 100), small: `real change since ${y0}` },
    ]
  return [{ big: pct(v1 / v0 * 100 - 100), small: `real change, ${y0} to ${y1}` }]
})

const objects = computed(() => objectsSvg(item.value, item.value.key === 'potato-chips' ? chipsToday.value : undefined))
const lines = computed(() => linesSvg(items, current.value))
const salonRatio = 1 + change(byKey('salon')) / 100
const salonWords = salonRatio >= 1.85 && salonRatio < 2.25 ? 'twice' : `${salonRatio.toFixed(1)} times`
const polishYear = byKey('polish').points[0]![0]
</script>

<template>
  <section class="exhibit" aria-labelledby="truecost-title">
    <p class="kicker">The true cost, after inflation</p>
    <h2 id="truecost-title">Painting your own nails costs what it did in {{ polishYear }}. A salon visit costs {{ salonWords }} as much as it did.</h2>
    <p class="lede">So more of us do our own, and our own chip. Pick a thing to see what it really cost over the years. Each object is drawn at its price after inflation, so bigger means it took more of your money.</p>

    <div class="pills" role="group" aria-label="Pick a thing">
      <button v-for="it in items" :key="it.key" type="button" class="pill" :aria-pressed="it.key === current" @click="current = it.key">{{ it.label }}</button>
    </div>

    <div class="chart" v-html="objects" />

    <div class="cards">
      <div v-for="c in cards" :key="c.small" class="card"><b>{{ c.big }}</b><span>{{ c.small }}</span></div>
    </div>

    <template v-if="item.key !== 'iron-nails'">
      <p class="charthead">Everything at once: price after inflation, first year = 100, log scale</p>
      <div class="chart" v-html="lines" />
    </template>

    <p class="source">{{ item.source }} "Nail polish" is all personal care products and "salon visits" includes haircuts: no US series prices manicures or gel nails on their own.</p>
  </section>
</template>
