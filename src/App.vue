<script setup lang="ts">
import ChipDay from './chip/ChipDay.vue'
import CapitalLink from './exhibits/CapitalLink.vue'
import DealFacts from './exhibits/DealFacts.vue'
import ErRoom from './exhibits/ErRoom.vue'
import PolishStripes from './exhibits/PolishStripes.vue'
import TrueCost from './exhibits/TrueCost.vue'
</script>

<template>
  <PolishStripes />
  <header class="masthead">
    <p class="kicker">build40for40.com · Day 10</p>
    <p class="lede">My nails are always chipped. Here's the data on why, and on everything else called "chip" or "nail".</p>
  </header>
  <main class="exhibits">
    <TrueCost />
    <CapitalLink />
    <ChipDay />
    <DealFacts />
    <ErRoom />
  </main>
</template>
