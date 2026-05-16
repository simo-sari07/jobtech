/**
 * ProfileDropdown — avatar button + dropdown for the CandidateTopbar.
 * Closes on outside click, Escape key. Smooth fade-in animation.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  User,
  FileText,
  Lock,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuthStore, type UserProfile } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { logoutApi } from '@/features/auth/api'
import toast from 'react-hot-toast'
import CVUpdateModal from './CVUpdateModal'

interface Props {
  user: UserProfile
}

export default function ProfileDropdown({ user }: Props) {
  const [open, setOpen]         = useState(false)
  const [cvModal, setCvModal]   = useState(false)
  const ref                     = useRef<HTMLDivElement>(null)
  const navigate                = useNavigate()
  const { clearAuth }           = useAuthStore()
  const queryClient             = useQueryClient()

  const initials = `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    || user.email.slice(0, 2).toUpperCase()

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  async function handleLogout() {
    setOpen(false)
    try { await logoutApi() } catch { /* best-effort */ }
    clearAuth()
    queryClient.clear()
    toast.success('Signed out successfully')
    navigate('/login', { replace: true })
  }

  function go(path: string) {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <div ref={ref} className="relative">
        {/* ── Avatar button ────────────────────────────────────────────── */}
        <button
          id="btn-profile-dropdown"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-all duration-150 group"
          aria-expanded={open}
          aria-haspopup="true"
        >
          {/* Circle initials */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}>
            {initials}
          </div>

          {/* Name + role */}
          <div className="hidden sm:flex flex-col text-left leading-tight min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">
              {user.full_name}
            </span>
            <span className="text-[10px] text-slate-400 font-medium capitalize">Candidate</span>
          </div>

          {/* Chevron */}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* ── Dropdown ─────────────────────────────────────────────────── */}
        {open && (
          <div
            className="absolute right-0 top-full mt-2 z-[100] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            style={{
              minWidth: 220,
              animation: 'profileDropIn 0.15s ease forwards',
            }}
            role="menu"
          >
            {/* Header (non-clickable) */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <MenuItem icon={<User size={15} />} label="My Profile"
                onClick={() => go('/candidate/profile')} />
              <MenuItem icon={<FileText size={15} />} label="Update CV"
                onClick={() => { setOpen(false); setCvModal(true) }} />
              <MenuItem icon={<Lock size={15} />} label="Change Password"
                onClick={() => go('/candidate/settings?tab=security')} />
              <MenuItem icon={<Settings size={15} />} label="Settings"
                onClick={() => go('/candidate/settings')} />
            </div>

            {/* Sign out */}
            <div className="border-t border-slate-100 py-1">
              <MenuItem
                icon={<LogOut size={15} />}
                label="Sign out"
                onClick={handleLogout}
                danger
              />
            </div>
          </div>
        )}
      </div>

      {/* CV Upload Modal */}
      <CVUpdateModal isOpen={cvModal} onClose={() => setCvModal(false)} />

      {/* Dropdown animation */}
      <style>{`
        @keyframes profileDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

// ── Shared menu item ──────────────────────────────────────────────────────────
function MenuItem({
  icon, label, onClick, danger = false,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-100
        ${danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-slate-700 hover:bg-gray-50'
        }`}
    >
      <span className={danger ? 'text-red-400' : 'text-slate-400'}>{icon}</span>
      {label}
    </button>
  )
}
