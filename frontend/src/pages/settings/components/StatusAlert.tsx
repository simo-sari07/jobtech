/**
 * StatusAlert — Inline success / error alert.
 * Matches existing design system: subtle green / red, no aggressive modals.
 */
import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface StatusAlertProps {
  type: 'success' | 'error'
  message: string
  className?: string
  /** Auto-dismiss after ms (default: 5000). Pass 0 to disable. */
  autoDismiss?: number
}

export function StatusAlert({ type, message, className = '', autoDismiss = 5000 }: StatusAlertProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    if (autoDismiss > 0) {
      const t = setTimeout(() => setVisible(false), autoDismiss)
      return () => clearTimeout(t)
    }
  }, [message, autoDismiss])

  if (!visible) return null

  const isSuccess = type === 'success'

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border text-sm
        transition-all duration-300
        ${isSuccess
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'}
        ${className}
      `}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">
        {isSuccess
          ? <CheckCircle2 size={15} className="text-green-600" />
          : <AlertCircle  size={15} className="text-red-600" />
        }
      </span>
      <p className="flex-1 text-sm leading-snug">{message}</p>
      <button
        onClick={() => setVisible(false)}
        className={`shrink-0 ml-auto hover:opacity-70 transition-opacity ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
