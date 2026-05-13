import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { registerApi } from '../api'
import { useAuthStore } from '@/store/authStore'
import type { RegisterFormData } from '../schemas'
import { ROLES } from '@/utils/constants'

export function useRegister() {
  const navigate    = useNavigate()
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: ({ confirm_password: _, ...data }: RegisterFormData) =>
      registerApi(data),

    onSuccess: (res) => {
      setAuth(res.data.user, res.data.access_token)
      toast.success('Account created! Welcome to JobTech.')

      const role = res.data.user.role
      const redirect: Record<string, string> = {
        [ROLES.ADMIN]:      '/dashboard/admin',
        [ROLES.HR_MANAGER]: '/dashboard/hr',
        [ROLES.RECRUITER]:  '/dashboard/recruiter',
        [ROLES.CANDIDATE]:  '/dashboard/candidate',
      }
      navigate(redirect[role] ?? '/dashboard')
    },

    onError: (err: unknown) => {
      const errData = (err as { response?: { data?: { error?: { details?: Record<string, string[]>; message?: string } } } })
        ?.response?.data?.error

      if (errData?.details && Object.keys(errData.details).length > 0) {
        const firstMsg = Object.values(errData.details)[0]
        toast.error(Array.isArray(firstMsg) ? firstMsg[0] : String(firstMsg))
      } else {
        toast.error(errData?.message ?? 'Registration failed. Please try again.')
      }
    },
  })
}
