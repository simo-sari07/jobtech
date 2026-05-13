/**
 * Zod validation schemas for auth forms.
 */
import { z } from 'zod'
import { ROLES } from '@/utils/constants'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/\d/,   'Must contain at least one digit')

export const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    first_name: z.string().min(1, 'First name is required').max(100),
    last_name:  z.string().min(1, 'Last name is required').max(100),
    email:      z.string().email('Please enter a valid email address'),
    password:          passwordSchema,
    confirm_password:  z.string(),
    role: z.enum([
      ROLES.ADMIN,
      ROLES.HR_MANAGER,
      ROLES.RECRUITER,
      ROLES.CANDIDATE,
    ]).default(ROLES.CANDIDATE),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })

export type LoginFormData    = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
