/**
 * ApplicationStatusBadge — colour-coded status pill for applications.
 */
interface Props {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  in_review:   { label: 'In Review',   className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  shortlisted: { label: 'Shortlisted', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  hired:       { label: 'Hired',       className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  rejected:    { label: 'Rejected',    className: 'bg-red-500/20 text-red-300 border-red-500/30' },
} as const

export default function ApplicationStatusBadge({ status, size = 'sm' }: Props) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    className: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  }
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span className={`inline-flex items-center rounded border font-mono font-medium uppercase tracking-wide ${sizeClass} ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}
