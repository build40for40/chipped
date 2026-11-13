<script setup lang="ts">
// ER visits from manicures and nail products against nail guns, one chair per 250 visits a year.
import { data, erSvg } from './draw'

const er = data.er
const svg = erSvg(er)
</script>

<template>
  <section class="exhibit" aria-labelledby="er-title">
    <p class="kicker">The ER waiting room</p>
    <h2 id="er-title">More Americans go to the ER over manicures than over nail guns.</h2>
    <div class="chart" v-html="svg" />
    <p class="source">Each chair is 250 visits a year, averaged over {{ er.from }}–{{ er.to }}. US Consumer Product Safety Commission, NEISS. Counted from keywords in hospital case notes, so treat the numbers as close, not exact.</p>
  </section>
</template>
