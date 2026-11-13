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
/* The loudest card on the page: a lacquer-to-gold rim, like the Chipped Capital page it links to. */
.capital {
  border: 1.5px solid transparent;
  background:
    linear-gradient(var(--card), var(--card)) padding-box,
    linear-gradient(120deg, var(--lacquer), var(--gold)) border-box;
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
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: var(--well);
}
.scores b {
  font: 700 clamp(1.2rem, 3.4vw, 1.8rem) / 1.1 var(--display);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
.scores div:first-child b {
  color: #9be15d;
}
.scores div:last-child b {
  color: var(--lacquer);
}
.scores span {
  font-size: 0.85rem;
  color: var(--muted);
}
.go {
  justify-self: start;
  padding: 0.7rem 1.1rem;
  border-radius: 999px;
  background: var(--ink);
  color: var(--onyx);
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}
.go:hover {
  background: var(--gold);
}
@media (max-width: 560px) {
  .scores {
    grid-template-columns: 1fr;
  }
}
</style>
