/**
 * ConfirmDialog — generic confirmation modal for destructive / sensitive actions.
 *
 * Design decisions:
 * - Controlled via isOpen/onClose props (no internal state) so the parent
 *   fully controls the lifecycle. This makes it easy to wire to any mutation.
 * - Accepts a custom intent ('danger' | 'warning') to change the confirm
 *   button colour without duplicating the component.
 * - Focus-trapped: the cancel button is auto-focused so "Escape → Enter"
 *   workflow doesn't accidentally confirm.
 * - Backdrop click closes the dialog (UX standard for non-destructive cancel).
 */
import { useEffect, useRef } from 'react'
import { AlertTriangle, ShieldAlert, X } from 'lucide-react'
import { Button } from '@/components/ui'

interface ConfirmDialogProps {
  isOpen:        boolean
  onClose:       () => void
  onConfirm:     () => void
  title:         string
  description:   string
  confirmLabel?: string
  cancelLabel?:  string
  intent?:       'danger' | 'warning'
  isLoading?:    boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  intent       = 'danger',
  isLoading    = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Auto-focus the cancel button when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isDanger  = intent === 'danger'
  const iconBg    = isDanger ? 'bg-red-50'    : 'bg-amber-50'
  const iconColor = isDanger ? 'text-red-600' : 'text-amber-600'
  const Icon      = isDanger ? ShieldAlert    : AlertTriangle

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className={`h-1 w-full ${isDanger ? 'bg-red-500' : 'bg-amber-400'}`} />

        <div className="p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3
                id="confirm-dialog-title"
                className="text-base font-semibold text-slate-900"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              ref={cancelRef}
              variant="secondary"
              size="md"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={isDanger ? 'danger' : 'primary'}
              size="md"
              loading={isLoading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
