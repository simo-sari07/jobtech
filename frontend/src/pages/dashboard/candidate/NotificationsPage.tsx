/**
 * NotificationsPage — Full activity feed for candidates.
 * Following Indeed-style clean design with tabs and bulk actions.
 */
import { useState } from 'react'
import { Bell, Trash2, CheckSquare, Square, MoreHorizontal, CheckCircle2, AlertCircle, FileText, Briefcase, GraduationCap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  useNotifications,
  useMarkNotificationsRead,
  useDeleteNotification,
  useBulkDeleteNotifications,
} from '@/features/candidates/hooks'
import type { Notification } from '@/features/candidates/types'
import { Spinner, Button } from '@/components/ui'
import toast from 'react-hot-toast'

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const navigate = useNavigate()

  const { data, isLoading, refetch } = useNotifications()
  const markRead = useMarkNotificationsRead()
  const deleteNotif = useDeleteNotification()
  const bulkDelete = useBulkDeleteNotifications()

  const allNotifications = data?.results ?? []
  const notifications = filter === 'all' 
    ? allNotifications 
    : allNotifications.filter(n => !n.is_read)

  function handleToggleSelect(id: number) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleSelectAll() {
    if (selectedIds.length === notifications.length && notifications.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(notifications.map(n => n.id))
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} notifications?`)) return

    try {
      await bulkDelete.mutateAsync(selectedIds)
      setSelectedIds([])
      toast.success('Notifications deleted')
    } catch {
      toast.error('Failed to delete notifications')
    }
  }

  async function handleMarkAllRead() {
    try {
      await markRead.mutateAsync(undefined)
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)
    const diffWk = Math.floor(diffDay / 7)

    if (diffMin < 60) return `${diffMin}m.`
    if (diffHr < 24) return `${diffHr}h.`
    if (diffDay < 7) return `${diffDay}j.`
    return `${diffWk}sem.`
  }

  // Map type to icons with colors from the design
  function renderTypeIcon(type: string) {
    switch(type) {
      case 'app_submitted':
        return <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0"><FileText size={20} /></div>
      case 'status_changed':
        return <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><CheckCircle2 size={20} /></div>
      case 'interview':
        return <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><GraduationCap size={20} /></div>
      default:
        return <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0"><Bell size={20} /></div>
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Stay updated with your applications and career opportunities.</p>
        </div>
        <div className="flex items-center gap-2">
          {allNotifications.some(n => !n.is_read) && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all as read
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === 'all' 
                ? 'bg-slate-900 text-white border-2 border-slate-900' 
                : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === 'unread' 
                ? 'bg-slate-900 text-white border-2 border-slate-900' 
                : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-300'
            }`}
          >
            Non lues
          </button>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              {selectedIds.length === notifications.length ? (
                <CheckSquare size={18} className="text-blue-600" />
              ) : (
                <Square size={18} />
              )}
              <span>Select All</span>
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1.5 text-sm text-red-600 font-semibold hover:text-red-700 transition-colors"
              >
                <Trash2 size={16} />
                <span>Delete selected ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="py-20 text-center"><Spinner size={32} /></div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No notifications found.</p>
            {filter === 'unread' && (
              <button onClick={() => setFilter('all')} className="text-blue-600 text-sm mt-2 hover:underline">
                View all notifications
              </button>
            )}
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`group flex items-start gap-4 p-4 rounded-2xl transition-all cursor-pointer ${
                !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-slate-50'
              }`}
              onClick={() => {
                if (!n.is_read) markRead.mutate([n.id])
                if (n.related_url) navigate(n.related_url)
              }}
            >
              {/* Checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); handleToggleSelect(n.id) }}
                className={`mt-2 shrink-0 transition-colors ${
                  selectedIds.includes(n.id) ? 'text-blue-600' : 'text-slate-300 group-hover:text-slate-400'
                }`}
              >
                {selectedIds.includes(n.id) ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>

              {/* Icon */}
              {renderTypeIcon(n.type)}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <p className={`text-[15px] leading-relaxed ${!n.is_read ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                    {n.message}
                  </p>
                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-xs text-slate-400 font-medium">
                      {formatTime(n.created_at)}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); /* TODO: Show small menu */ }}
                      className="p-1 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
