<script setup lang="ts">
// The questions we want answered about chipped nails, one card each.
// Every number is real and comes from ./data.json. Where the data could not answer what was asked,
// the card shows the reworded question and says what stands in for what.
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

import { PLOTS, type PlotKey } from './charts'
import { data } from './data'

interface Lens {
  id: string
  // What the team asked, and what the data we could find can actually answer.
  asked: string
  question: string
  how: string
  status: 'Real data' | 'Needs a poll'
  legend?: { label: string; colour?: string }[]
  plots: { key: PlotKey; title?: string }[]
  source: string
  caveats: string[]
}

const industry = data.industry
const mani = data.manicure
const protestMonths = data.protest.events.map((e) => new Date(`${e.month}-15`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })).join(', ')

const LENSES: Lens[] = [
  {
    id: 'pride',
    asked: 'Do nail salon sales move with pregnancies, promotions and dates?',
    question: 'Does hair and beauty spending in the UK move with births, women managers and marriages?',
    how: 'Three small charts. Each dot is a year. A tight diagonal cloud means the two move together. The line is the best fit, r is the correlation, and the year on year number is the honest version.',
    status: 'Real data',
    plots: [
      { key: 'pride-births', title: 'Births per 1,000 people' },
      { key: 'pride-managers', title: "Women's share of manager jobs" },
      { key: 'pride-marriages', title: 'Marriages per 1,000 people' },
    ],
    source: 'UK. Office for National Statistics (business survey, population survey), UN and OECD figures via Our World in Data. 2008 onwards.',
    caveats: [
      'Nail salons cannot be split from hairdressers in UK figures, so this is all hair and beauty turnover, not adjusted for inflation.',
      'Nobody counts promotions or dates. Women in manager jobs and marriages stand in for them.',
      'Births have fallen and turnover has risen for unrelated reasons. Trust the year on year number, not r.',
    ],
  },
  {
    id: 'work',
    asked: 'When more women do manual jobs or play sport, does nail polish fall or rise?',
    question: 'As women in the UK move in or out of manual jobs and get more active, what happens to nail polish imports?',
    how: `Three lines on one scale, all set to 100 in ${data.work.years[0]}, the first year all three exist. Hover for each year.`,
    status: 'Real data',
    legend: data.work.series.map((s, i) => ({ label: s.name, colour: `var(--c${i + 1})` })),
    plots: [{ key: 'work' }],
    source: 'UK imports from HMRC, women in manual jobs from the ONS, activity from Sport England (England only).',
    caveats: [
      'There are no nail polish sales figures anywhere. Imports stand in, and they include removers and gels.',
      'Being active counts walking and gardening as well as sport.',
      'Ten points is too few to call anything a link. Manual jobs here means skilled trades, machine operatives and elementary jobs, which is our own grouping.',
    ],
  },
  {
    id: 'industry',
    asked: 'Who wears nail polish at work, industry by industry?',
    question: 'Nobody knows who wears nail polish at work. Here is who we would have to ask.',
    how: `No one publishes nail polish by industry, so this needs a poll. This is the share of jobs held by women in each UK industry in June ${industry.year}, which is what the poll answers would be weighted by.`,
    status: 'Needs a poll',
    plots: [{ key: 'industry' }],
    source: 'UK workforce jobs, Office for National Statistics via Nomis.',
    caveats: ['This chart says nothing about nail polish yet.', 'It counts jobs, so someone with two jobs is counted twice.'],
  },
  {
    id: 'hobbies',
    asked: 'Where Covid hit harder, did home hobbies like painting your nails grow more than outdoor ones?',
    question: 'Where lockdown was stricter, did people read up on home hobbies more than outdoor ones?',
    how: 'Each country appears twice. Further right means a stricter lockdown in 2020. Higher means more Wikipedia reading about that kind of hobby in 2020 than in 2019. The dashed lines are the trends.',
    status: 'Real data',
    legend: [{ label: 'Home hobbies, nail polish included', colour: 'var(--c1)' }, { label: 'Outdoor hobbies', colour: 'var(--c2)' }],
    plots: [{ key: 'hobbies' }],
    source: 'Lockdown strictness from the Oxford tracker via Our World in Data. Page views from Wikimedia, by language.',
    caveats: [
      'Reading about knitting is not knitting.',
      'A language is not a country, so the UK, the US, India and every Spanish speaking country are missing.',
      'Turkey is left out because Wikipedia was blocked there for most of 2019.',
    ],
  },
  {
    id: 'hands',
    asked: 'Do countries that eat with their hands buy less nail polish than countries that use cutlery?',
    question: 'Do countries that eat with their hands import less nail polish per woman?',
    how: `Each dot is a country, placed by its nail polish imports per woman in ${data.hands.year}. The rows are how most people there eat. The tick is the middle of each row.`,
    status: 'Real data',
    plots: [{ key: 'hands' }],
    source: 'Imports from UN Comtrade, population from Our World in Data. Eating styles sorted by hand from Wikipedia.',
    caveats: [
      `Only ${data.hands.rows.length} countries, which is far too few to prove anything.`,
      'Imports are not purchases. Countries that make their own polish, like India and China, show close to zero.',
      'Richer countries import more of everything, and most of the cutlery row is rich.',
    ],
  },
  {
    id: 'selfcare',
    asked: 'Do nail salons rise and fall with yoga, Pilates, the gym, massage and spas?',
    question: 'Does UK hair and beauty rise and fall with spas, massage and gyms?',
    how: 'Each row compares hair and beauty with another kind of self care on one money measure. The hollow dot is the easy correlation, flattered by everything growing. The solid dot compares year on year changes. The gap is how much of the link is just time passing.',
    status: 'Real data',
    legend: [{ label: 'Raw correlation' }, { label: 'Year on year correlation', colour: 'var(--c1)' }],
    plots: [{ key: 'selfcare' }],
    source: 'UK Annual Business Survey, Office for National Statistics, 2008 to 2024.',
    caveats: ['Nails are counted with hairdressers.', 'Yoga and Pilates studios are counted with gyms, so they cannot be shown apart.', 'Money is not adjusted for inflation.'],
  },
  {
    id: 'protest',
    asked: 'After women turn out to protest, do nail salon sales go up a few weeks later?',
    question: 'In the months after a big protest about women’s rights in the US, do nail salons pull ahead of hair salons?',
    how: 'Six big protest months are lined up at zero and averaged. The line is how fast nail salon jobs grew compared with hair salon jobs, in percentage points, against the three months before. The band is the spread across the six. Above zero means nail salons pulled ahead.',
    status: 'Real data',
    plots: [{ key: 'protest' }],
    source: `US. Protests from the Crowd Counting Consortium, salon jobs from the Bureau of Labor Statistics. Months used: ${protestMonths}.`,
    caveats: [
      'Nothing is weekly, so a few weeks became a few months, and it is jobs, which move slowly.',
      'Nobody counts how many protesters were women. These are protests about women’s issues.',
      'Six events is very few, and protests during the lockdown collapse of 2020 and 2021 are left out.',
    ],
  },
  {
    id: 'manicure',
    asked: 'How affordable is a manicure?',
    question: 'How long does a woman in the UK work to pay for a basic manicure?',
    how: `The first chart is the manicure index: the middle shop price divided by the middle hourly pay for women. In ${mani.minutes.years[0]} it took ${Math.round(mani.minutes.values[0]!)} minutes of work and in ${mani.minutes.years[mani.minutes.years.length - 1]} it took ${Math.round(mani.minutes.values[mani.minutes.values.length - 1]!)}. The second shows why: the price on the day went up, but once you allow for inflation it went down. The third is the middle price in each region.`,
    status: 'Real data',
    legend: [{ label: 'Price on the day', colour: 'var(--c1)' }, { label: "In today's money", colour: 'var(--c2)' }],
    plots: [
      { key: 'manicure-minutes', title: 'The manicure index: minutes of work to pay for one' },
      { key: 'manicure-price', title: 'The price, on the day and in today’s money' },
      { key: 'manicure-regions', title: `Where it costs most, ${mani.regions.year}` },
    ],
    source: 'UK. Shop prices collected by the Office for National Statistics for the inflation figures, about 120 a month. Women’s middle hourly pay from the ONS earnings survey.',
    caveats: [
      'A basic manicure is the ONS’s own item and probably leaves out gel.',
      'The shops sampled change over time, and some months are missing, including most of the 2020 and 2021 lockdowns.',
      'Pay is for all women employees, full time and part time together, and stops at 2025. Northern Ireland rests on only 35 prices.',
    ],
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
      <h2>Eight lenses on chipped nails</h2>
      <p class="note">Real numbers, with stand ins. We could not find data for everything we asked, so each card shows what we asked, what the data can answer, and where it is shaky. Correlation is not cause.</p>
      <nav aria-label="Lenses">
        <a v-for="(lens, i) in LENSES" :key="lens.id" :href="`#${lens.id}`">{{ i + 1 }} {{ lens.id }}</a>
      </nav>
    </header>

    <article v-for="(lens, i) in LENSES" :id="lens.id" :key="lens.id" class="lens">
      <p class="eyebrow">Lens {{ i + 1 }} <span class="tag" :class="{ poll: lens.status !== 'Real data' }">{{ lens.status }}</span></p>
      <h3 class="question">{{ lens.question }}</h3>
      <p class="asked">We asked: {{ lens.asked }}</p>
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
        <strong>Where it is shaky</strong>
        <ul>
          <li v-for="caveat in lens.caveats" :key="caveat">{{ caveat }}</li>
        </ul>
        <p class="source">Source: {{ lens.source }}</p>
      </div>
    </article>

    <footer class="credits">
      <h3>Data and credits</h3>
      <p>
        UK figures: Office for National Statistics, Nomis and HM Revenue &amp; Customs, under the Open Government Licence v3.0.
        Eurostat and Our World in Data (with the UN, OECD, ILO, WHO and the Oxford Covid-19 Government Response Tracker), CC BY 4.0.
        Activity: Sport England, Active Lives Adult Survey.
        US jobs: Bureau of Labor Statistics. Protests: Crowd Counting Consortium.
        Nail imports: derived from the UN Comtrade Database.
        Page views: Wikimedia. Eating styles: our summaries of Wikipedia articles (CC BY-SA 4.0).
      </p>
      <p><a href="https://github.com/build40for40/chipped/blob/main/data/README.md">Every data file, its source and its licence</a>. UN Comtrade's figures are only shared as our per-woman figure.</p>
    </footer>

    <div v-show="tip.show" class="tip" role="status" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">{{ tip.text }}</div>
  </section>
</template>

<style scoped>
/* 40 for 40 colours: navy by default, paper when the reader's device is in light mode. */
.lenses {
  --bg: #081633; --panel: #10224a; --tile: #172c58; --line: #1e3260; --edge: #2e4170;
  --text: #f2f0ea; --sub: #c9cfe0; --muted: #9aa6c4; --bracket: #ffd400;
  --c1: #3b82e6; --c2: #d94a97; --c3: #b38a1d; --neutral: #7f8bab; --band: rgb(59 130 230 / 0.22);
  --warn-bg: #3a2f05; --warn-ink: #ffe27a; --ok-bg: #12351f; --ok-ink: #9be7b4;
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
    --warn-bg: #fff3bf; --warn-ink: #5c4500; --ok-bg: #dcf5e3; --ok-ink: #14532d;
  }
}
.lenses > * { width: 100%; max-width: 860px; min-width: 0; }
header { display: flex; flex-direction: column; gap: 10px; }
h2 { margin: 0; font-size: clamp(22px, 6vw, 30px); line-height: 1.15; font-weight: 800; text-wrap: balance; }
.note { margin: 0; background: var(--tile); color: var(--sub); border-radius: 8px; padding: 10px 14px; max-width: 70ch; }
nav { display: flex; flex-wrap: wrap; gap: 8px; }
nav a { color: var(--sub); text-decoration: none; border: 1px solid var(--edge); border-radius: 999px; padding: 4px 12px; font-size: 12px; }
nav a:hover, nav a:focus-visible { color: var(--text); border-color: var(--text); outline: none; }
.lens { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.lens > * { margin: 0; }
.eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); display: flex; gap: 10px; align-items: center; }
.tag { background: var(--ok-bg); color: var(--ok-ink); border-radius: 4px; padding: 1px 6px; letter-spacing: 0.06em; }
.tag.poll { background: var(--warn-bg); color: var(--warn-ink); }
.asked { color: var(--muted); font-size: 12.5px; }
.source { margin: 8px 0 0; color: var(--muted); }
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
.credits { font-size: 12.5px; color: var(--muted); display: flex; flex-direction: column; gap: 8px; }
.credits > * { margin: 0; max-width: 80ch; }
.credits h3 { font-size: 13px; color: var(--sub); }
.credits a { color: var(--sub); }
.tip { position: fixed; z-index: 20; width: auto; max-width: 240px; pointer-events: none; transform: translateY(-100%); background: var(--tile); color: var(--text); border: 1px solid var(--edge); border-radius: 8px; padding: 6px 10px; font-size: 12px; white-space: pre-line; box-shadow: 0 6px 20px rgb(0 0 0 / 0.25); }
/* The charts arrive through v-html, so scoped styles need :deep to reach them. */
[data-plot] :deep(svg) { display: block; width: 100%; height: auto; overflow: visible; }
[data-plot] :deep(text) { font-family: inherit; font-size: 11px; fill: var(--muted); }
[data-plot] :deep(text.strong) { fill: var(--text); font-weight: 700; }
[data-plot] :deep(text.lab) { fill: var(--sub); }
[data-plot] :deep([data-tip]:focus-visible) { outline: 2px solid var(--text); outline-offset: 1px; }
</style>
