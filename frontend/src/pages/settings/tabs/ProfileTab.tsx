/**
 * ProfileTab — Edit display name and phone.
 * Uses PATCH /api/v1/users/<id>/ via the existing updateUser hook.
 */
import { useState, useEffect } from 'react'
import { User, Phone, Camera, Save } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUpdateUser } from '@/features/users/hooks/useUsers'
import { Button, Input, Card } from '@/components/ui'
import { StatusAlert } from '../components/StatusAlert'

export default function ProfileTab() {
  const { user, setAuth } = useAuthStore()
  const updateUser = useUpdateUser()

  const [firstName, setFirstName] = useState(user?.first_name ?? '')
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '')
  const [phone,     setPhone]     = useState(user?.phone ?? '')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    setFirstName(user?.first_name ?? '')
    setLastName(user?.last_name   ?? '')
    setPhone(user?.phone          ?? '')
  }, [user])

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'

  const handleSave = async () => {
    if (!user) return
    setAlert(null)
    try {
      const res = await updateUser.mutateAsync({
        id: user.id,
        payload: { first_name: firstName, last_name: lastName, phone: phone || null },
      })
      // Sync updated name into auth store
      const updated = res.data
      setAuth(
        {
          ...user,
          first_name: updated.first_name,
          last_name:  updated.last_name,
          full_name:  updated.full_name,
          phone:      updated.phone,
        },
        useAuthStore.getState().accessToken!,
      )
      setAlert({ type: 'success', msg: 'Profile updated successfully.' })
    } catch {
      setAlert({ type: 'error', msg: 'Failed to update profile. Please try again.' })
    }
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Avatar */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" className="w-16 h-16 rounded-full object-cover" />
                : <span className="text-blue-700 font-bold text-xl">{initials}</span>
              }
            </div>
            <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors">
              <Camera size={11} className="text-slate-500" />
            </button>
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
            loading={updateUser.isPending}
            onClick={handleSave}
            disabled={!firstName.trim() || !lastName.trim()}
          >
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  )
}
