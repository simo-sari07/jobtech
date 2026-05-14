/**
 * ProfileTab — Edit display name and phone.
 * Uses PATCH /api/v1/users/<id>/ via the existing updateUser hook.
 */
import { useState, useEffect } from 'react'
import { User, Phone, Camera, Save } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { updateProfileApi, uploadAvatarApi } from '@/features/auth/api'
import { Button, Input, Card } from '@/components/ui'
import toast from 'react-hot-toast'
import { StatusAlert } from '../components/StatusAlert'

export default function ProfileTab() {
  const { user, setAuth } = useAuthStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [phone,     setPhone]     = useState(user?.phone ?? '')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name)
      setLastName(user.last_name)
      setPhone(user.phone ?? '')
    }
  }, [user])

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'

  const handleSave = async () => {
    if (!user) return
    setAlert(null)
    setIsUpdating(true)
    try {
      const res = await updateProfileApi({
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
      })
      
      const updated = res.data.user
      setAuth(updated, useAuthStore.getState().accessToken!)
      setAlert({ type: 'success', msg: 'Profile updated successfully.' })
      toast.success('Profile updated.')
    } catch {
      setAlert({ type: 'error', msg: 'Failed to update profile. Please try again.' })
      toast.error('Failed to update profile.')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Size check
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadAvatarApi(file)
      // Sync store with new avatar URL
      setAuth({ ...user, avatar_url: res.data.avatar_url }, useAuthStore.getState().accessToken!)
      toast.success('Avatar updated successfully')
    } catch {
      toast.error('Failed to upload avatar')
    } finally {
      setIsUploading(false)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Avatar */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white shadow-sm ${isUploading ? 'opacity-50' : ''}`}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" className="w-16 h-16 object-cover" />
                : <span className="text-blue-700 font-bold text-xl">{initials}</span>
              }
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            <label 
              htmlFor="avatar-upload" 
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Camera size={11} className="text-slate-500" />
              <input 
                id="avatar-upload"
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={isUploading}
              />
            </label>
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">{user?.full_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">
              {user?.role?.replace('_', ' ')} · Member since {user?.date_joined
                ? new Date(user.date_joined).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
                : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Form */}
      <Card>
        <div className="flex items-center gap-2 mb-5">
          <User size={16} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Personal Information</h2>
        </div>

        {alert && <StatusAlert type={alert.type} message={alert.msg} className="mb-4" />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="settings-first-name"
            label="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="John"
          />
          <Input
            id="settings-last-name"
            label="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Doe"
          />
          <Input
            id="settings-phone"
            label="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+212 6 00 00 00 00"
            leftIcon={<Phone size={14} />}
            className="sm:col-span-2"
          />
        </div>

        <div className="flex justify-end mt-5 pt-4 border-t border-slate-100">
          <Button
            icon={<Save size={14} />}
            loading={isUpdating}
            onClick={handleSave}
            disabled={!firstName.trim() || !lastName.trim() || isUpdating}
          >
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
