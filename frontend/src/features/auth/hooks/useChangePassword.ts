/**
 * Self-service password change hook.
 * Uses /api/v1/auth/me/ endpoint for users changing their own password.
 */
import { useMutation } from '@tanstack/react-query'
import { changePasswordApi } from '../api'
import type { ChangePasswordFormData } from '../schemas'

export function useChangePassword() {
  return useMutation<
    { success: boolean; message: string },
    unknown,
    Omit<ChangePasswordFormData, 'confirm_password'>
  >({
    mutationFn: (data) => changePasswordApi(data),
  })
}
