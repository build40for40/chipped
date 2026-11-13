<script setup lang="ts">
// The hero: every month of UK nail product imports since 2000, painted as one stripe of polish.
// Colour is the month's rank against every other month, from nude (quiet) to deep lacquer (busy).
import { stripes, stripesSvg } from './stripes'

const s = stripes()
const svg = stripesSvg(s.months)
</script>

<template>
  <figure class="hero" aria-labelledby="hero-caption">
    <div class="band" v-html="svg" />
    <div class="ticks" aria-hidden="true">
      <span v-for="t in s.ticks" :key="t.year" :style="{ left: `${t.at * 100}%` }">{{ t.year }}</span>
    </div>
    <figcaption id="hero-caption" class="caption">
      <span><b>Polish stripes.</b> Every month of UK nail polish imports since {{ s.firstYear }}, one stripe each. Pale is a quiet month, deep red a busy one.</span>
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
  height: clamp(180px, 30vw, 340px);
  position: relative;
}
.band :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
.ticks {
  position: relative;
  height: 1.4rem;
  margin-inline: 0;
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
