import { useRef, useState, useEffect } from 'react'
import { Bell, CheckCheck, ChevronRight, X, Trash2, CheckSquare, Square, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useNotifications,
  useMarkNotificationsRead,
  useDeleteNotification,
  useBulkDeleteNotifications,
} from '@/features/candidates/hooks'
import type { Notification } from '@/features/candidates/types'
import { Spinner } from '@/components/ui'



export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data, isLoading, refetch, isRefetching } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const deleteNotif = useDeleteNotification()
  const bulkDelete = useBulkDeleteNotifications()

  const notifications = data?.results ?? []
  const unreadCount   = data?.unread_count ?? 0

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset selection when closing or when notifications change
  useEffect(() => {
    if (!open) setSelectedIds([])
  }, [open])

  function handleOpen() {
    setOpen(v => !v)
  }

  function handleMarkAllRead() {
    markRead.mutate(undefined)
  }

  function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => setSelectedIds([])
    })
  }

  function handleDeleteSingle(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    deleteNotif.mutate(id)
  }

  function toggleSelect(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    if (selectedIds.length === notifications.length && notifications.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(notifications.map(n => n.id))
    }
  }

  function handleClickNotification(n: Notification) {
    if (!n.is_read) {
      markRead.mutate([n.id])
    }
    setOpen(false)
    if (n.related_url) {
      navigate(n.related_url)
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        id="btn-notifications"
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => refetch()}
                className={`p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all ${isRefetching ? 'animate-spin' : ''}`}
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors"
              >
                {selectedIds.length === notifications.length ? (
                  <CheckSquare size={14} className="text-blue-600" />
                ) : (
                  <Square size={14} />
                )}
                <span>{selectedIds.length === notifications.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 text-xs text-red-600 font-medium hover:text-red-700 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete ({selectedIds.length})</span>
                </button>
              )}
            </div>
          )}

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="py-12 text-center"><Spinner size={20} /></div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const isSelected = selectedIds.includes(n.id)
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotification(n)}
                    className={`group relative w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-all border-b border-slate-50 last:border-b-0 cursor-pointer ${
                      !n.is_read ? 'bg-blue-50/30' : ''
                    } ${isSelected ? 'bg-slate-50' : ''}`}
                  >
                    {/* Checkbox */}
                    <div
                      onClick={(e) => toggleSelect(e, n.id)}
                      className={`mt-1 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'}`}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </div>


                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-relaxed ${!n.is_read ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        {new Date(n.created_at).toLocaleString('en-GB', {
                          day: 'numeric', month: 'short',
                          hour: '2-digit', minute: '2-digit',
                        })}
                        {!n.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        )}
                      </p>
                    </div>

                    {/* Single Actions (Delete) */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleDeleteSingle(e, n.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                      {n.related_url && (
                        <ChevronRight size={14} className="text-slate-300" />
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 text-center bg-white">
              <button
                onClick={() => { setOpen(false); navigate('/dashboard/candidate/notifications') }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View all activity →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
