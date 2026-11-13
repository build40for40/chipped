<script setup lang="ts">
// Teaser for Chipped Capital, the standalone page at /chipped/capital/: $1,000 in every chip and nail company.
const href = `${import.meta.env.BASE_URL}capital/`
</script>

<template>
  <section class="exhibit capital" aria-labelledby="capital-title">
    <p class="kicker">Chipped Capital</p>
    <h2 id="capital-title">$1,000 in chips and nails, 1980 to now</h2>
    <div class="scores">
      <div><b>$4,268,721</b><span>AI chips (Nvidia)</span></div>
      <div><b>$224,291</b><span>S&amp;P 500</span></div>
      <div><b>$280</b><span>OPI nail polish (Coty)</span></div>
    </div>
    <a class="go" :href="href">See the race and all 15 companies →</a>
  </section>
</template>

<style scoped>
.capital {
  background: #170d1a;
  color: #f7ecf3;
}
.capital .kicker {
  color: #b49fb8;
}
.scores {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}
.scores div {
  display: grid;
  gap: 0.2rem;
  padding: 0.9rem 1rem;
  border: 1px solid #3a2741;
  border-radius: 14px;
}
.scores b {
  font-size: clamp(1.2rem, 3.4vw, 1.8rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.scores div:first-child b {
  color: #9be15d;
}
.scores div:last-child b {
  color: #ff4f8b;
}
.scores span {
  font-size: 0.85rem;
  color: #b49fb8;
}
.go {
  justify-self: start;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  background: #f7ecf3;
  color: #170d1a;
  font-weight: 600;
  text-decoration: none;
}
.go:hover {
  background: #ffc93c;
}
.go:focus-visible {
  outline: 3px solid #ff4f8b;
  outline-offset: 3px;
}
@media (max-width: 560px) {
  .scores {
    grid-template-columns: 1fr;
  }
}
</style>
