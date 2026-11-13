<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import AskForm from './ask/AskForm.vue'

interface Greeting {
  message: string
  at: string
}

const greeting = ref<Greeting | null>(null)
const failed = ref(false)

const timeIn = (iso: string, timeZone?: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

const viewerInLondon = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Europe/London'

const when = computed(() => {
  if (!greeting.value) return ''
  const london = `${timeIn(greeting.value.at, 'Europe/London')} in London`
  return viewerInLondon ? london : `${london} (${timeIn(greeting.value.at)} your time)`
})

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}api/greeting`)
    if (!response.ok) throw new Error(`The API answered ${response.status}`)
    greeting.value = await response.json()
  } catch {
    failed.value = true
  }
})
</script>

<template>
  <main>
    <h1>Chipped</h1>
    <p v-if="greeting">{{ greeting.message }} It's {{ when }}.</p>
    <p v-else-if="failed">The Worker isn't answering. Is <code>npm run dev</code> running?</p>
    <p v-else>Waking the Worker up…</p>
    <AskForm />
  </main>
</template>

<style scoped>
main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem;
}
</style>
