import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { loginApi } from '../api'
import { useAuthStore } from '@/store/authStore'
import type { LoginFormData } from '../schemas'
import { ROLES } from '@/utils/constants'

export function useLogin() {
  const navigate   = useNavigate()
  const { setAuth } = useAuthStore()

  return useMutation({
    mutationFn: (data: LoginFormData) => loginApi(data),

    onSuccess: (res) => {
      setAuth(res.data.user, res.data.access_token)
      toast.success(`Welcome back, ${res.data.user.first_name}!`)

      // Role-based redirect
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
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Login failed. Please try again.'
      toast.error(msg)
    },
  })
}
