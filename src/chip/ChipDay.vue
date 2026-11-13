<script setup lang="ts">
// The manicure index as one exhibit: how much of a working day a manicure chips off.
// Real UK numbers from src/lenses/data.json (built by data/scripts/build-lenses.mjs). Other countries are
// not shown because only the UK publishes real manicure prices we could use; see data/LENSES.md.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { data } from '@/lenses/data'
import { clock, drawChips, share, type Row } from './chip'

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

const rows: Row[] = years.map((year, i) => ({ label: String(year), minutes: values[i]!, kind: i === years.length - 1 ? 'latest' : 'year' }))

const plot = ref<HTMLElement | null>(null)
const svg = ref('')
const tip = reactive({ text: '', x: 0, y: 0, show: false })

// Drawn at the width it actually gets, so labels stay readable on a phone.
function draw() {
  const width = Math.max(260, Math.floor(plot.value?.clientWidth ?? 0) || 640)
  svg.value = drawChips(width, rows, { minutes: first.minutes, label: String(first.year) })
}

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
    </p>
    <!-- The SVG is built in chip.ts from our own numbers, with every label escaped there. -->
    <div ref="plot" class="chart" v-html="svg" />

    <div class="cards">
      <div v-for="c in cards" :key="c.small" class="card"><b>{{ c.big }}</b><span>{{ c.small }}</span></div>
    </div>

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
   the page's lacquer red for the latest, and a bare nail for the chip. */
.chipday {
  --chip-year: #3a3033; --chip-year-deep: #120d0e;
  --chip-latest: var(--lacquer); --chip-latest-deep: var(--lacquer-deep);
  --chip-bare: #f8e4dc;
}
.key { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; margin: 0; font-size: 0.8rem; color: var(--muted); }
.key span { display: inline-flex; align-items: center; gap: 0.4rem; }
.key i { width: 11px; height: 16px; border-radius: 3px 3px 4px 4px; flex: none; }
.key .kept { background: var(--chip-year); }
.key .bare { background: var(--chip-bare); border: 1px solid var(--chrome); }
.key .line { width: 16px; height: 0; border-radius: 0; border-top: 2px dashed var(--ink); }
.key .latest { background: var(--lacquer); }
.tip { position: fixed; z-index: 20; max-width: 240px; padding: 0.4rem 0.7rem; border-radius: 12px; background: var(--ink); color: #fff; font-size: 0.8rem; white-space: pre-line; pointer-events: none; transform: translateY(-100%); }
/* The chart arrives through v-html, so scoped styles need :deep to reach it. */
.chart :deep(.nail) { outline: none; }
.chart :deep(.nail:focus-visible .edge) { stroke: var(--gold); stroke-width: 3; }
</style>
