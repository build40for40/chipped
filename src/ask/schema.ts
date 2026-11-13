import { z } from 'zod'

export const MAX_QUESTION_LENGTH = 500

export const askSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
})

export const answerSchema = z.object({
  answer: z.string(),
})

export type Ask = z.infer<typeof askSchema>
export type Answer = z.infer<typeof answerSchema>
