<script setup lang="ts">
// The manicure index as one exhibit: how much of a working day a manicure chips off.
// Real UK numbers from src/lenses/data.json (built by data/scripts/build-lenses.mjs). Other countries are
// not shown because only the UK publishes real manicure prices we could use; see data/LENSES.md.
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

import { data } from '@/lenses/data'
import { clock, DAY, drawChips, share, type Row } from './chip'

const { years, values } = data.manicure.minutes
const first = { year: years[0]!, minutes: values[0]! }
const last = { year: years[years.length - 1]!, minutes: values[values.length - 1]! }
const lowest = values.reduce((best, v, i) => (v < best.minutes ? { year: years[i]!, minutes: v } : best), first)
const saved = Math.round(first.minutes) - Math.round(last.minutes)

const cards = [
  { big: share(last.minutes), small: `of an eight hour day, ${last.year}` },
  { big: `${saved >= 0 ? '−' : '+'}${Math.abs(saved)} min`, small: `against ${first.year}` },
  { big: clock(lowest.minutes), small: `the smallest chip, in ${lowest.year}` },
]

const price = ref<number | ''>('')
const pay = ref<number | ''>('')
const yours = computed(() => {
  const p = Number(price.value)
  const e = Number(pay.value)
  return p > 0 && e > 0 ? (p / e) * 60 : null
})
// More than a whole day almost always means the two numbers are in different money.
const tooLong = computed(() => yours.value !== null && yours.value > DAY)

const rows = computed<Row[]>(() => {
  const base: Row[] = years.map((year, i) => ({ label: String(year), minutes: values[i]!, kind: i === years.length - 1 ? 'latest' : 'year' }))
  return yours.value !== null && !tooLong.value ? [...base, { label: 'You', minutes: yours.value, kind: 'you' }] : base
})

const plot = ref<HTMLElement | null>(null)
const svg = ref('')
const tip = reactive({ text: '', x: 0, y: 0, show: false })

// Drawn at the width it actually gets, so labels stay readable on a phone.
function draw() {
  const width = Math.max(260, Math.floor(plot.value?.clientWidth ?? 0) || 640)
  svg.value = drawChips(width, rows.value, { minutes: first.minutes, label: String(first.year) })
}
watch(rows, draw)

let observer: ResizeObserver | undefined
onMounted(() => {
  draw()
  if (typeof ResizeObserver !== 'undefined' && plot.value) {
    observer = new ResizeObserver(draw)
    observer.observe(plot.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function showTip(target: EventTarget | null, x: number, y: number) {
  const el = target instanceof Element ? target.closest('[data-tip]') : null
  if (!el) return (tip.show = false)
  tip.text = el.getAttribute('data-tip') ?? ''
  tip.x = Math.min(window.innerWidth - 250, Math.max(8, x - 110))
  tip.y = Math.max(8, y - 14)
  tip.show = true
}
const onPointer = (e: PointerEvent) => showTip(e.target, e.clientX, e.clientY)
function onFocus(e: FocusEvent) {
  if (!(e.target instanceof Element) || !e.target.closest('[data-tip]')) return
  const box = e.target.getBoundingClientRect()
  showTip(e.target, box.left + box.width / 2, box.top)
}
</script>

<template>
  <section class="exhibit chipday" aria-labelledby="chipday-title" @pointermove="onPointer" @pointerdown="onPointer" @pointerleave="tip.show = false" @focusin="onFocus" @focusout="tip.show = false">
    <p class="kicker">The manicure index</p>
    <h2 id="chipday-title">A manicure chips {{ clock(last.minutes) }} off a British woman's working day. In {{ first.year }} it took {{ clock(first.minutes) }}.</h2>
    <p class="lede">
      Every nail is one eight hour working day, tip to cuticle. The bare chipped tip is the part of it a woman on typical UK pay works to cover one basic
      manicure. A smaller chip means a more affordable manicure.
    </p>

    <p class="key">
      <span><i class="kept" />The day you keep</span>
      <span><i class="bare" />Chipped off for a manicure</span>
      <span><i class="line" />The {{ first.year }} chip</span>
      <span><i class="latest" />{{ last.year }}</span>
      <span><i class="you" />You</span>
    </p>
    <!-- The SVG is built in chip.ts from our own numbers, with every label escaped there. -->
    <div ref="plot" class="chart" v-html="svg" />

    <div class="cards">
      <div v-for="c in cards" :key="c.small" class="card"><b>{{ c.big }}</b><span>{{ c.small }}</span></div>
    </div>

    <form class="yours" @submit.prevent>
      <p class="charthead">Chip your own day</p>
      <div class="fields">
        <label for="chip-price">What a manicure costs you<input id="chip-price" v-model="price" type="number" inputmode="decimal" min="0" step="any" placeholder="25" /></label>
        <label for="chip-pay">What you earn in an hour, in the same money<input id="chip-pay" v-model="pay" type="number" inputmode="decimal" min="0" step="any" placeholder="17" /></label>
      </div>
      <p class="verdict" aria-live="polite">
        <template v-if="yours === null">Type both and your nail joins the row. Nothing you type leaves this page.</template>
        <template v-else-if="tooLong">That is <b>{{ clock(yours) }}</b> of work, which is more than a whole day. Check the two numbers are in the same money.</template>
        <template v-else>
          A manicure chips <b>{{ clock(yours) }}</b> off your day, which is {{ share(yours) }} of it.
          {{ yours < last.minutes ? 'A smaller chip than' : yours > last.minutes ? 'A bigger chip than' : 'The same chip as' }} the UK in {{ last.year }}.
        </template>
      </p>
    </form>

    <p class="source">
      Shop prices for a basic manicure collected by the Office for National Statistics for the inflation figures, about 120 a month, against the middle
      hourly pay of women employees from the ONS earnings survey. A basic manicure probably leaves out gel. Some months are missing, including most of the
      2020 and 2021 lockdowns. Pay stops at {{ last.year }}. The eight hour day is a convention, not a measurement.
    </p>
    <div v-show="tip.show" class="tip" role="status" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">{{ tip.text }}</div>
  </section>
</template>

<style scoped>
/* Uses the page's tokens from styles/base.css. These are the only extra colours: glossy black for the years,
   the page's lacquer red for the latest, gold for you, and a bare nail for the chip. */
.chipday {
  --chip-year: #3a3033; --chip-year-deep: #120d0e;
  --chip-latest: var(--lacquer); --chip-latest-deep: var(--lacquer-deep);
  --chip-you: #dfae6f; --chip-you-deep: #9a6a32;
  --chip-bare: #f8e4dc;
}
.key { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0; font-size: 0.8rem; color: var(--muted); }
.key span { display: inline-flex; align-items: center; gap: 0.4rem; }
.key i { width: 11px; height: 16px; border-radius: 3px 3px 4px 4px; flex: none; }
.key .kept { background: var(--chip-year); }
.key .bare { background: var(--chip-bare); border: 1px solid var(--chrome); }
.key .line { width: 16px; height: 0; border-radius: 0; border-top: 2px dashed var(--ink); }
.key .latest { background: var(--lacquer); }
.key .you { background: var(--chip-you); }
.yours { display: grid; gap: 0.6rem; padding-top: 1rem; border-top: 1px solid var(--rule); }
.yours .charthead { margin: 0; }
.fields { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.fields label { display: grid; gap: 0.25rem; flex: 1 1 11rem; min-width: 0; font-size: 0.8rem; color: var(--muted); }
.fields input { width: 100%; padding: 0.55rem 0.85rem; border: 1px solid var(--rule); border-radius: 14px; background: var(--bg); color: var(--ink); font: inherit; }
.fields input:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.verdict { min-height: 1.6em; margin: 0; font-size: 0.9rem; color: var(--muted); }
.verdict b { color: var(--ink); }
.tip { position: fixed; z-index: 20; max-width: 240px; padding: 0.4rem 0.7rem; border-radius: 12px; background: var(--ink); color: #fff; font-size: 0.8rem; white-space: pre-line; pointer-events: none; transform: translateY(-100%); }
/* The chart arrives through v-html, so scoped styles need :deep to reach it. */
.chart :deep(.nail) { outline: none; }
.chart :deep(.nail:focus-visible .edge) { stroke: var(--gold); stroke-width: 3; }
</style>
