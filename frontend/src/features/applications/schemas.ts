/**
 * Zod schemas for application forms.
 */
import { z } from 'zod'

const MAX_FILE_MB = 5

export const applySchema = z.object({
  job:          z.coerce.number(),
  cover_letter: z.string().max(2000).optional(),
  cv_file: z
    .instanceof(File, { message: 'Please upload your CV' })
    .refine(f => f.name.toLowerCase().endsWith('.pdf'), 'Only PDF files are accepted')
    .refine(f => f.size <= MAX_FILE_MB * 1024 * 1024, `File must be under ${MAX_FILE_MB}MB`),
})

export type ApplyFormData = z.infer<typeof applySchema>
