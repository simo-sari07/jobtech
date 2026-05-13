/**
 * Zod schemas for job forms.
 */
import { z } from 'zod'

export const createJobSchema = z
  .object({
    title:            z.string().min(3, 'Title must be at least 3 characters'),
    description:      z.string().min(20, 'Description must be at least 20 characters'),
    contract_type:    z.enum(['cdi', 'cdd', 'internship', 'freelance']),
    location:         z.string().min(2, 'Location is required'),
    experience_years: z.coerce.number().min(0).max(30),
    salary_min:       z.coerce.number().positive().optional().nullable(),
    salary_max:       z.coerce.number().positive().optional().nullable(),
    deadline:         z.string().optional().nullable(),
    status:           z.enum(['draft', 'open']).default('draft'),
    skill_ids:        z.array(z.number()).optional(),
  })
  .refine(
    d => !d.salary_min || !d.salary_max || d.salary_min <= d.salary_max,
    { message: 'Minimum salary must be less than maximum', path: ['salary_min'] },
  )

export type CreateJobFormData = z.infer<typeof createJobSchema>

export const jobFiltersSchema = z.object({
  search:        z.string().optional(),
  status:        z.string().optional(),
  contract_type: z.string().optional(),
  location:      z.string().optional(),
})

export type JobFiltersFormData = z.infer<typeof jobFiltersSchema>
