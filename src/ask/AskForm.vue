<script setup lang="ts">
import { useObject } from '@ai-sdk/vue'
import { ref } from 'vue'

import { answerSchema, MAX_QUESTION_LENGTH } from './schema'

const question = ref('')

const { submit, object, isLoading, error } = useObject({
  api: `${import.meta.env.BASE_URL}api/ask`,
  schema: answerSchema,
})

function ask() {
  const text = question.value.trim()
  if (text) submit({ question: text })
}
</script>

<template>
  <form @submit.prevent="ask">
    <label for="question">Ask Claude something</label>
    <input id="question" v-model="question" :maxlength="MAX_QUESTION_LENGTH" required />
    <button type="submit" :disabled="isLoading">{{ isLoading ? 'Thinking…' : 'Ask' }}</button>
  </form>
  <p v-if="object?.answer" aria-live="polite">{{ object.answer }}</p>
  <p v-else-if="error" role="alert">{{ error.message }}</p>
</template>

<style scoped>
form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

label {
  flex-basis: 100%;
}

input {
  flex: 1 1 12rem;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.75rem;
  font: inherit;
}

button {
  min-height: 44px;
  padding: 0 1.25rem;
  font: inherit;
}
</style>
