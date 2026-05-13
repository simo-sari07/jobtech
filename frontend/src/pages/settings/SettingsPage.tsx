/**
 * SettingsPage — /dashboard/settings
 *
 * Tabs:
 *   Profile    → name, phone, avatar
 *   Account    → email, change password
 *   Security   → last login, active sessions
 *   Activity   → audit log timeline
 */
import { useState } from 'react'
import { User, Mail, ShieldCheck, Activity } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import ProfileTab  from './tabs/ProfileTab'
import AccountTab  from './tabs/AccountTab'
import SecurityTab from './tabs/SecurityTab'
import ActivityTab from './tabs/ActivityTab'

type TabId = 'profile' | 'account' | 'security' | 'activity'

interface Tab {
  id: TabId
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
}

const TABS: Tab[] = [
  { id: 'profile',  label: 'Profile',  icon: <User size={16} /> },
  { id: 'account',  label: 'Account',  icon: <Mail size={16} /> },
  { id: 'security', label: 'Security', icon: <ShieldCheck size={16} /> },
  { id: 'activity', label: 'Activity', icon: <Activity size={16} /> },
]

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const visibleTabs = TABS.filter(t => !t.adminOnly || user?.role === 'admin')

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6 animate-fade-up">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account, security, and team preferences.
        </p>
      </div>

      {/* Tabs + content grid */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* ── Vertical tab list ───────────────────────────── */}
        <nav className="lg:w-52 shrink-0">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 border-b border-slate-100 last:border-b-0
                  ${activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-l-blue-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-2 border-l-transparent'}
                `}
              >
                <span className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Tab content ─────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'  && <ProfileTab />}
          {activeTab === 'account'  && <AccountTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'activity' && <ActivityTab />}
        </div>

      </div>
    </div>
  )
}
