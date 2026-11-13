<script setup lang="ts">
import ChipDay from './chip/ChipDay.vue'
import CapitalLink from './exhibits/CapitalLink.vue'
import DealFacts from './exhibits/DealFacts.vue'
import ErRoom from './exhibits/ErRoom.vue'
import PolishStripes from './exhibits/PolishStripes.vue'
import TrueCost from './exhibits/TrueCost.vue'
</script>

<template>
  <header class="masthead">
    <p class="kicker">build40for40.com · Day 10 · the almanac of chips and nails</p>
    <h1>chipped<span class="dot" aria-hidden="true"></span></h1>
    <p class="lede">My nails are always chipped. Here's the data on why, and on everything else called "chip" or "nail".</p>
  </header>
  <PolishStripes />
  <main class="exhibits">
    <TrueCost />
    <CapitalLink />
    <ChipDay />
    <DealFacts />
    <ErRoom />
  </main>
</template>
