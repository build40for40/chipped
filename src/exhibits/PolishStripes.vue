<script setup lang="ts">
// The hero: every month of UK nail product imports since 2000, one stripe of wet polish each, with "chipped"
// chipped out of it. Drag across it to smear the polish. Without WebGL it falls back to flat stripes.
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { startPolish } from './polishGl'
import { stripeColours, stripes, stripesSvg } from './stripes'

const s = stripes()
const flat = stripesSvg(s.months)
const FONT = '"Bricolage Grotesque Variable", system-ui, sans-serif'

const canvas = ref<HTMLCanvasElement | null>(null)
const live = ref(false)
let stop: (() => void) | null = null

onMounted(async () => {
  if (!canvas.value) return
  try {
    await document.fonts?.load(`800 120px ${FONT}`)
  } catch {
    // Draw with the fallback font rather than not at all.
  }
  const animate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  stop = startPolish({ canvas: canvas.value, stripes: stripeColours(s.months), word: 'chipped', font: FONT, animate })
  live.value = !!stop
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <figure class="hero" :class="{ live }">
    <div class="band">
      <div class="flat" v-html="flat" />
      <canvas ref="canvas" aria-hidden="true" />
      <h1 class="word">chipped<span class="dot" aria-hidden="true"></span></h1>
      <p class="hint" aria-hidden="true">drag through the polish</p>
    </div>
    <div class="ticks" aria-hidden="true">
      <span v-for="t in s.ticks" :key="t.year" :style="{ left: `${t.at * 100}%` }">{{ t.year }}</span>
    </div>
    <figcaption class="caption">
      <span><b>Every stripe is a month of UK nail polish imports since {{ s.firstYear }}.</b> Pale is a quiet month, deep red a busy one.</span>
      <span class="facts">£{{ s.firstTotal }}m in {{ s.firstYear }} · peak £{{ s.peakTotal }}m in {{ s.peakYear }} · about £{{ s.recentTotal }}m a year since {{ s.recentFrom }}</span>
      <span class="source">HM Revenue &amp; Customs, commodity 33043000 (manicure and pedicure preparations), imports in pounds. Trade, not shop sales. EU trade was counted differently from 2021. Open Government Licence v3.0.</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.hero {
  margin: 0;
}
.band {
  position: relative;
  height: clamp(300px, 46vw, 560px);
  overflow: hidden;
  background: var(--nude);
}
canvas,
.flat,
.flat :deep(svg) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
canvas {
  touch-action: pan-y;
  cursor: crosshair;
}
/* Without WebGL the word sits on the flat stripes as plain type; with it, the canvas draws the word and this
   stays in the page, invisible, for screen readers and search. */
.word {
  position: absolute;
  left: max(5%, 24px);
  top: 50%;
  margin: 0;
  transform: translateY(-50%);
  font-family: 'Bricolage Grotesque Variable', system-ui, sans-serif;
  font-weight: 800;
  font-size: min(calc(clamp(300px, 46vw, 560px) * 0.62), 20vw);
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--bg);
  pointer-events: none;
}
.word .dot {
  display: inline-block;
  width: 0.2em;
  height: 0.2em;
  margin-left: 0.04em;
  border-radius: 50%;
  background: var(--lacquer);
}
.live .word {
  color: transparent;
}
.live .word .dot {
  background: transparent;
}
.hint {
  position: absolute;
  right: max(1rem, env(safe-area-inset-right, 0px));
  bottom: 0.75rem;
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: rgb(255 255 255 / 0.85);
  pointer-events: none;
}
.hero:not(.live) .hint {
  display: none;
}
.ticks {
  position: relative;
  height: 1.4rem;
  font-size: 0.75rem;
  color: var(--muted);
}
.ticks span {
  position: absolute;
  top: 0.2rem;
  padding-left: 0.3rem;
  border-left: 1px solid var(--chrome);
}
.caption {
  display: grid;
  gap: 0.25rem;
  max-width: 60rem;
  margin: 0.5rem auto 0;
  padding-inline: max(1rem, env(safe-area-inset-left, 0px)) max(1rem, env(safe-area-inset-right, 0px));
  font-size: 0.9rem;
}
.facts {
  font-weight: 600;
}
.source {
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
