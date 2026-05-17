/**
 * BulkActionBar — floating action bar that appears when users are selected.
 *
 * Provides quick actions:
 *   - Activate selected users
 *   - Deactivate selected users
 */
import { UserCheck, UserX, X, CheckCircle2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface BulkActionBarProps {
  selectedCount: number
  onClear:        () => void
  onActivate:     () => void
  onDeactivate:   () => void
  onDelete:       () => void
  isLoading:      boolean
}




export function BulkActionBar({
  selectedCount,
  onClear,
  onActivate,
  onDeactivate,
  onDelete,
  isLoading,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className="w-full bg-slate-50 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between animate-in fade-in duration-300">
      <div className="flex items-center gap-8">
        {/* Selection State Indicator */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-950 border-2 border-white flex items-center justify-center text-[10px] font-black text-white">
              {selectedCount}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-900 leading-none">Selection Active</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Modify {selectedCount} records</p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          <button
            onClick={onActivate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent"
          >
            <UserCheck size={14} className="opacity-70 group-hover:opacity-100" />
            Activate Accounts
          </button>
          
          <div className="w-px h-4 bg-slate-100 mx-1" />
          
          <button
            onClick={onDeactivate}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent"
          >
            <UserX size={14} className="opacity-70 group-hover:opacity-100" />
            Restrict Access
          </button>

          <div className="w-px h-4 bg-slate-100 mx-1" />

          <button
            onClick={onDelete}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-bold text-slate-600 hover:text-red-700 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed border border-transparent"
          >
            <Trash2 size={14} className="opacity-70 group-hover:opacity-100 text-red-500" />
            Delete Accounts
          </button>
        </div>
      </div>

      {/* Exit Selection Mode */}
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all uppercase tracking-tighter"
      >
        <span>Exit Selection</span>
        <X size={15} strokeWidth={3} />
      </button>
    </div>
  )
}




