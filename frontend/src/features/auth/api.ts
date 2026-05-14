/**
 * Auth API calls — thin wrappers over apiClient.
 */
import apiClient from '@/api/client'
import { AUTH_ENDPOINTS } from '@/api/endpoints'
import type { LoginFormData, RegisterFormData, ChangePasswordFormData } from './schemas'

export interface AuthResponse {
  success: boolean
  data: {
    user: import('@/store/authStore').UserProfile
    access_token: string
  }
}

export async function loginApi(data: Pick<LoginFormData, 'email' | 'password'>): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.LOGIN, data)
  return res.data
}

export async function registerApi(data: Omit<RegisterFormData, 'confirm_password'>): Promise<AuthResponse> {
  const res = await apiClient.post<AuthResponse>(AUTH_ENDPOINTS.REGISTER, data)
  return res.data
}

export async function logoutApi(): Promise<void> {
  await apiClient.post(AUTH_ENDPOINTS.LOGOUT)
}

export async function changePasswordApi(data: Omit<ChangePasswordFormData, 'confirm_password'>): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.patch<{ success: boolean; message: string }>(AUTH_ENDPOINTS.ME, data)
  return res.data
}

export async function updateProfileApi(data: { first_name?: string; last_name?: string; phone?: string | null }): Promise<AuthResponse> {
  const res = await apiClient.patch<AuthResponse>(AUTH_ENDPOINTS.ME, data)
  return res.data
}

export async function uploadAvatarApi(file: File): Promise<{ success: boolean; data: { avatar_url: string } }> {
  const formData = new FormData()
  formData.append('avatar', file)
  const res = await apiClient.post<{ success: boolean; data: { avatar_url: string } }>(AUTH_ENDPOINTS.ME_AVATAR, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}
