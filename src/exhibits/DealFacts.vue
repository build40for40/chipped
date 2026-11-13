<script setup lang="ts">
// A stack of poker chips. Each tap deals one fact to repeat at the table.
import { ref } from 'vue'

import { FACTS } from './facts'

const COLOURS = ['lacquer', 'ink', 'gold', 'chrome', 'lacquer-deep']
const dealt = ref(0)
const fact = ref<(typeof FACTS)[number] | null>(null)

function deal() {
  if (dealt.value >= FACTS.length) {
    dealt.value = 0
    fact.value = null
    return
  }
  fact.value = FACTS[dealt.value]!
  dealt.value++
}
</script>

<template>
  <section class="exhibit" aria-labelledby="deal-title">
    <p class="kicker">For the table</p>
    <h2 id="deal-title">Deal me a fact</h2>
    <div class="deal">
      <button type="button" class="stack" :aria-label="dealt >= FACTS.length ? 'Shuffle the chips' : 'Deal the next fact'" @click="deal">
        <span
          v-for="(_, i) in FACTS"
          :key="i"
          class="pchip"
          :class="{ gone: i >= FACTS.length - dealt }"
          :style="{ top: `${130 - i * 12}px`, background: `var(--${COLOURS[i % COLOURS.length]})` }"
        />
      </button>
      <div class="factcard" aria-live="polite">
        <template v-if="fact">
          <span class="meta">Chip {{ dealt }} of {{ FACTS.length }}</span>
          <b>{{ fact.text }}</b>
          <span class="meta">{{ fact.source }}</span>
        </template>
        <template v-else>
          <b>Tap the chips to deal a fact.</b>
          <span class="meta">{{ FACTS.length }} chips, one fact each.</span>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.deal {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1.25rem;
  align-items: center;
}
.stack {
  position: relative;
  width: 120px;
  height: 170px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.pchip {
  position: absolute;
  left: 10px;
  width: 100px;
  height: 26px;
  border-radius: 50%;
  border: 3px dashed rgb(255 255 255 / 0.8);
  box-shadow: 0 4px 0 rgb(0 0 0 / 0.18);
  transition: transform 0.45s, opacity 0.45s;
}
.pchip.gone {
  transform: translate(160px, -40px) rotateX(180deg);
  opacity: 0;
}
.factcard {
  display: grid;
  gap: 0.4rem;
  min-height: 160px;
  align-content: center;
  padding: 1.1rem;
  border-radius: 18px;
  background: var(--bg);
}
.factcard b {
  font-size: clamp(1.1rem, 2.4vw, 1.4rem);
  line-height: 1.25;
}
.meta {
  font-size: 0.75rem;
  color: var(--muted);
}
@media (max-width: 560px) {
  .deal {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .pchip {
    transition: none;
  }
}
</style>
