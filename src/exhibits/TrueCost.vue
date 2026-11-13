<script setup lang="ts">
// The true cost of things in the almanac after inflation: a ranked dearer-or-cheaper bar for each,
// and the chosen one drawn as objects sized by what they cost, with the first year as a ghost behind.
import { computed, ref } from 'vue'

import { barSpan, change, data, last, objectsSvg, signed } from './draw'

const items = data.prices.items
const current = ref('salon')
const item = computed(() => items.find((i) => i.key === current.value)!)

const byKey = (k: string) => items.find((i) => i.key === k)!

// Dearest riser at the top, biggest faller at the bottom.
const ranked = items
  .map((it) => ({ it, pct: change(it), since: it.points[0]![0], span: barSpan(change(it)) }))
  .sort((a, b) => b.pct - a.pct)
const zero = barSpan(0).left

// For potato chips the series is a real dollar price, so the objects can be labelled in today's dollars.
const chipsToday = computed(() => {
  const chips = byKey('potato-chips')
  const lastYear = String(last(chips.points)[0])
  return (chips.nominal![lastYear]! / last(chips.points)[1]) * 100
})

// Extra numbers for the two things where one percentage hides the story.
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
      { big: signed(v1 / v0 * 100 - 100), small: `real change since ${y0}` },
    ]
  return []
})

// Phones get three objects (first, middle, latest) so the labels stay readable.
const narrowQuery = typeof matchMedia === 'function' ? matchMedia('(max-width: 40rem)') : undefined
const narrow = ref(narrowQuery?.matches ?? false)
narrowQuery?.addEventListener('change', (e) => (narrow.value = e.matches))
const objects = computed(() =>
  objectsSvg(item.value, item.value.key === 'potato-chips' ? chipsToday.value : undefined, narrow.value ? 3 : 6),
)
const salonRatio = 1 + change(byKey('salon')) / 100
const salonWords = salonRatio >= 1.85 && salonRatio < 2.25 ? 'twice' : `${salonRatio.toFixed(1)} times`
const polishYear = byKey('polish').points[0]![0]
</script>

<template>
  <section class="exhibit" aria-labelledby="truecost-title">
    <p class="kicker">The true cost, after inflation</p>
    <h2 id="truecost-title">Painting your own nails costs what it did in {{ polishYear }}. A salon visit costs {{ salonWords }} as much as it did.</h2>
    <p class="lede">So more of us do our own, and our own chip. Here is what each thing really costs now against when its records start, with inflation taken out. Tap one to watch it grow or shrink.</p>

    <div class="tc-board" role="group" aria-label="Dearer or cheaper after inflation: pick a thing">
      <div class="tc-axis" aria-hidden="true">
        <span>cheaper</span>
        <span>dearer</span>
      </div>
      <button
        v-for="r in ranked"
        :key="r.it.key"
        type="button"
        class="tc-row"
        :class="r.pct >= 0 ? 'up' : 'down'"
        :aria-pressed="r.it.key === current"
        @click="current = r.it.key"
      >
        <span class="tc-name">{{ r.it.label.replace(/ since \d+$/, '') }} <small>since {{ r.since }}</small></span>
        <span class="tc-pct">{{ signed(r.pct) }}</span>
        <span class="tc-track" aria-hidden="true">
          <span class="tc-zero" :style="{ left: `${zero}%` }" />
          <span class="tc-bar" :style="{ left: `${r.span.left}%`, width: `${r.span.width}%` }" />
        </span>
      </button>
    </div>

    <div class="tc-stage">
      <p class="charthead">{{ item.label }}, after inflation. Dashed outline = what it cost in {{ item.points[0]![0] }}.</p>
      <div class="chart" v-html="objects" />
      <div v-if="cards.length" class="cards">
        <div v-for="c in cards" :key="c.small" class="card"><b>{{ c.big }}</b><span>{{ c.small }}</span></div>
      </div>
    </div>

    <p class="source">{{ item.source }} "Nail polish" is all personal care products and "salon visits" includes haircuts: no US series prices manicures or gel nails on their own.</p>
  </section>
</template>

<style scoped>
.tc-board {
  display: grid;
  gap: 0.15rem;
}

.tc-axis {
  display: flex;
  justify-content: space-between;
  margin-left: calc(var(--tc-label) + 0.75rem);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.tc-board,
.tc-axis {
  --tc-label: 15rem;
}

.tc-row {
  display: grid;
  grid-template-columns: calc(var(--tc-label) - 4.5rem) 4.5rem 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

@media (hover: hover) {
  .tc-row:hover {
    background: var(--bg);
  }
}

.tc-row[aria-pressed='true'] {
  background: var(--bg);
  box-shadow: inset 3px 0 0 var(--ink);
}

.tc-name {
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
}

.tc-name small {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--muted);
}

.tc-pct {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.tc-track {
  position: relative;
  height: 1.6rem;
}

.tc-zero {
  position: absolute;
  top: -0.3rem;
  bottom: -0.3rem;
  width: 2px;
  margin-left: -1px;
  background: var(--ink);
  opacity: 0.25;
}

.tc-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 3px;
  transition: opacity 0.15s;
}

.up .tc-bar {
  border-radius: 0 6px 6px 0;
  background: var(--lacquer);
}

.down .tc-bar {
  border-radius: 6px 0 0 6px;
  background: var(--cool);
}

.tc-board:has([aria-pressed='true']) .tc-row:not([aria-pressed='true']) .tc-bar {
  opacity: 0.6;
}

.tc-stage {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 16px;
  background: var(--bg);
}

.tc-stage .card {
  background: var(--card);
}

@media (max-width: 40rem) {
  .tc-axis {
    margin-left: 0;
  }

  .tc-row {
    grid-template-columns: 1fr auto;
    row-gap: 0.25rem;
    padding-block: 0.35rem;
  }

  .tc-name small {
    display: inline;
    margin-left: 0.25rem;
  }

  .tc-pct {
    font-size: 1.1rem;
  }

  .tc-track {
    grid-column: 1 / -1;
    height: 0.8rem;
  }

  .tc-stage {
    padding: 0.75rem;
  }

  .tc-stage :deep(text) {
    font-size: 16px;
  }

  .tc-stage :deep(text.strong) {
    font-size: 18px;
  }

  .tc-stage :deep(text.big) {
    font-size: 26px;
  }
}
</style>
