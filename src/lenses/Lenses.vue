<script setup lang="ts">
// The seven questions we want answered about chipped nails, one chart each.
// Every number comes from ./dummy.ts until the real series land.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { PLOTS, type PlotKey } from './charts'

interface Lens {
  id: string
  question: string
  how: string
  legend?: { label: string; colour?: string }[]
  plots: { key: PlotKey; title?: string }[]
  needs: string[]
}

const LENSES: Lens[] = [
  {
    id: 'pride',
    question: 'Do nail salon sales move with the things that give women pride?',
    how: 'Three small charts, one per pride measure. Each dot is a year. A tight diagonal cloud means the two move together. The line is the best fit and the number is the correlation.',
    plots: [
      { key: 'pride-births', title: 'Births per 1,000 women' },
      { key: 'pride-promotions', title: 'Share of promotions going to women' },
      { key: 'pride-dates', title: 'First dates per 1,000 adults' },
    ],
    needs: ['Nail salon sales or jobs, by year', 'Birth or pregnancy rate', "Women's promotions, or women's share of management jobs", 'A dating measure, such as dating app use'],
  },
  {
    id: 'work',
    question: 'When more women do manual jobs or play sport, does nail polish fall or rise?',
    how: 'Three lines on one scale, all set to 100 in the first year so they can share an axis. If polish dips as manual work climbs, the lines cross. It could go either way.',
    legend: [{ label: 'Nail polish sales', colour: 'var(--c1)' }, { label: 'Women in manual jobs', colour: 'var(--c2)' }, { label: 'Women playing sport weekly', colour: 'var(--c3)' }],
    plots: [{ key: 'work' }],
    needs: ['Nail polish sales, by year', 'Women employed in manual occupations', 'Women taking part in sport at least weekly'],
  },
  {
    id: 'industry',
    question: 'Who wears nail polish at work, industry by industry?',
    how: "One bar per industry, using the UK government's industry groups, longest at the top. The dashed line is the average for all working women.",
    plots: [{ key: 'industry' }],
    needs: ['Share of women wearing polish, split by industry. Nobody publishes this, so it needs a poll'],
  },
  {
    id: 'covid',
    question: 'Where Covid hit harder, did home hobbies like painting your nails grow more than outdoor ones?',
    how: 'Each country appears twice. Further right means a stricter lockdown. Higher means interest grew more. If lockdowns pushed people to their nail polish, the first colour climbs to the right and the second does not.',
    legend: [{ label: 'Painting nails at home', colour: 'var(--c1)' }, { label: 'Outdoor hobbies', colour: 'var(--c2)' }],
    plots: [{ key: 'covid' }],
    needs: ['How hard Covid hit each country: lockdown strictness or cases per 100,000', 'Change in interest for each hobby from 2019 to 2020, by country'],
  },
  {
    id: 'hands',
    question: 'Do countries that eat with their hands buy less nail polish than countries that use cutlery?',
    how: 'Each dot is a country, placed by how much polish it buys. The rows are how most people there eat at home. The tick is the middle country in each row.',
    plots: [{ key: 'hands' }],
    needs: ['Nail polish bought per woman per year, by country', 'The main way people eat at home in each country. Most places do a mix, so this needs a source'],
  },
  {
    id: 'selfcare',
    question: 'Do nail salons rise and fall with the rest of self care?',
    how: 'The hollow dot is the easy correlation, flattered by everything growing over time. The solid dot is the honest one, comparing year on year changes. The gap is how much of the link is just time passing.',
    legend: [{ label: 'Raw correlation' }, { label: 'Year on year correlation', colour: 'var(--c1)' }],
    plots: [{ key: 'selfcare' }],
    needs: ['Nail salon sales or jobs, by year', 'Yoga, Pilates, gym, massage and spa: memberships, spend or jobs for each'],
  },
  {
    id: 'protest',
    question: 'After women turn out to protest, do nail salon sales go up a few weeks later?',
    how: 'Every big protest is lined up at week zero and the weeks around it are averaged. The band is how much the protests disagree with each other. A bump to the right of zero is the lag.',
    plots: [{ key: 'protest' }],
    needs: ['Protest dates, places and how many women took part', 'Weekly nail salon sales or bookings for the same places'],
  },
]

const root = ref<HTMLElement | null>(null)
const svg = reactive<Partial<Record<PlotKey, string>>>({})
const widths: Partial<Record<PlotKey, number>> = {}
const tip = reactive({ text: '', x: 0, y: 0, show: false })

// Charts are drawn at the width they actually get, so labels stay readable on a phone.
function draw() {
  root.value?.querySelectorAll<HTMLElement>('[data-plot]').forEach((el) => {
    const key = el.dataset.plot as PlotKey
    const width = Math.max(220, Math.floor(el.clientWidth) || 640)
    if (widths[key] === width) return
    widths[key] = width
    svg[key] = PLOTS[key](width)
  })
}

let observer: ResizeObserver | undefined
onMounted(() => {
  draw()
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    observer = new ResizeObserver(draw)
    observer.observe(root.value)
  }
})
onBeforeUnmount(() => observer?.disconnect())

function showTip(target: EventTarget | null, x: number, y: number) {
  const el = target instanceof Element ? target.closest('[data-tip]') : null
  if (!el) return (tip.show = false)
  tip.text = el.getAttribute('data-tip') ?? ''
  tip.x = Math.min(window.innerWidth - 250, Math.max(8, x + 12))
  tip.y = y < 120 ? y + 18 : y - 12
  tip.show = true
}
const onPointer = (e: PointerEvent) => showTip(e.target, e.clientX, e.clientY)
function onFocus(e: FocusEvent) {
  if (!(e.target instanceof Element)) return
  const box = e.target.getBoundingClientRect()
  showTip(e.target, box.left + box.width / 2, box.top)
}
</script>

<template>
  <section ref="root" class="lenses" @pointermove="onPointer" @pointerdown="onPointer" @pointerleave="tip.show = false" @focusin="onFocus" @focusout="tip.show = false">
    <header>
      <h2>Seven lenses on chipped nails</h2>
      <p class="dummy">Every number in these charts is made up. They show the shape of the answer, not the answer.</p>
      <nav aria-label="Lenses">
        <a v-for="(lens, i) in LENSES" :key="lens.id" :href="`#${lens.id}`">{{ i + 1 }} {{ lens.id }}</a>
      </nav>
    </header>

    <article v-for="(lens, i) in LENSES" :id="lens.id" :key="lens.id" class="lens">
      <p class="eyebrow">Lens {{ i + 1 }} <span class="tag">Dummy data</span></p>
      <h3 class="question">{{ lens.question }}</h3>
      <p class="how">{{ lens.how }}</p>
      <p v-if="lens.legend" class="legend">
        <span v-for="item in lens.legend" :key="item.label"><i :class="{ ring: !item.colour }" :style="item.colour ? { background: item.colour } : undefined" />{{ item.label }}</span>
      </p>
      <div class="plots" :class="{ three: lens.plots.length === 3 }">
        <figure v-for="plot in lens.plots" :key="plot.key">
          <figcaption v-if="plot.title">{{ plot.title }}</figcaption>
          <!-- The SVG is built in charts.ts from our own data, with every label escaped there. -->
          <div :data-plot="plot.key" v-html="svg[plot.key]" />
        </figure>
      </div>
      <div class="needs">
        <strong>To make it real we need:</strong>
        <ul>
          <li v-for="need in lens.needs" :key="need">{{ need }}</li>
        </ul>
      </div>
    </article>

    <div v-show="tip.show" class="tip" role="status" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">{{ tip.text }}</div>
  </section>
</template>

<style scoped>
/* 40 for 40 colours: navy by default, paper when the reader's device is in light mode. */
.lenses {
  --bg: #081633; --panel: #10224a; --tile: #172c58; --line: #1e3260; --edge: #2e4170;
  --text: #f2f0ea; --sub: #c9cfe0; --muted: #9aa6c4; --bracket: #ffd400;
  --c1: #3b82e6; --c2: #d94a97; --c3: #b38a1d; --neutral: #7f8bab; --band: rgb(59 130 230 / 0.22);
  --warn-bg: #3a2f05; --warn-ink: #ffe27a;
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.55;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
@media (prefers-color-scheme: light) {
  .lenses {
    --bg: #f2f0ea; --panel: #fff; --tile: #f7f5ef; --line: #e3dfd6; --edge: #cfc9bc;
    --text: #1b1a17; --sub: #4a4740; --muted: #6b675f; --bracket: #b38a00;
    --c1: #1f6fd6; --c2: #c2268a; --c3: #a86a00; --neutral: #8a857b; --band: rgb(31 111 214 / 0.16);
    --warn-bg: #fff3bf; --warn-ink: #5c4500;
  }
}
.lenses > * { width: 100%; max-width: 860px; min-width: 0; }
header { display: flex; flex-direction: column; gap: 10px; }
h2 { margin: 0; font-size: clamp(22px, 6vw, 30px); line-height: 1.15; font-weight: 800; text-wrap: balance; }
.dummy { margin: 0; background: var(--warn-bg); color: var(--warn-ink); border-radius: 8px; padding: 10px 14px; font-weight: 500; }
nav { display: flex; flex-wrap: wrap; gap: 8px; }
nav a { color: var(--sub); text-decoration: none; border: 1px solid var(--edge); border-radius: 999px; padding: 4px 12px; font-size: 12px; }
nav a:hover, nav a:focus-visible { color: var(--text); border-color: var(--text); outline: none; }
.lens { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.lens > * { margin: 0; }
.eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); display: flex; gap: 10px; align-items: center; }
.tag { background: var(--warn-bg); color: var(--warn-ink); border-radius: 4px; padding: 1px 6px; letter-spacing: 0.06em; }
.question { font-size: 17px; line-height: 1.35; font-weight: 700; text-wrap: balance; }
.question::before { content: '[ '; color: var(--bracket); }
.question::after { content: ' ]'; color: var(--bracket); }
.how { color: var(--sub); max-width: 66ch; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--sub); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.legend i.ring { border: 2px solid var(--neutral); }
.plots { display: grid; gap: 14px; grid-template-columns: 1fr; }
.plots.three { grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
figure { margin: 0; min-width: 0; }
figcaption { font-size: 12px; color: var(--sub); margin-bottom: 4px; }
.needs { background: var(--tile); border-radius: 10px; padding: 12px 14px; font-size: 12.5px; color: var(--sub); }
.needs strong { color: var(--text); }
.needs ul { margin: 6px 0 0; padding-left: 18px; }
.tip { position: fixed; z-index: 20; width: auto; max-width: 240px; pointer-events: none; transform: translateY(-100%); background: var(--tile); color: var(--text); border: 1px solid var(--edge); border-radius: 8px; padding: 6px 10px; font-size: 12px; white-space: pre-line; box-shadow: 0 6px 20px rgb(0 0 0 / 0.25); }
/* The charts arrive through v-html, so scoped styles need :deep to reach them. */
[data-plot] :deep(svg) { display: block; width: 100%; height: auto; overflow: visible; }
[data-plot] :deep(text) { font-family: inherit; font-size: 11px; fill: var(--muted); }
[data-plot] :deep(text.strong) { fill: var(--text); font-weight: 700; }
[data-plot] :deep(text.lab) { fill: var(--sub); }
[data-plot] :deep([data-tip]:focus-visible) { outline: 2px solid var(--text); outline-offset: 1px; }
</style>
