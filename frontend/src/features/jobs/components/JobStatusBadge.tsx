/**
 * JobStatusBadge — colour-coded status pill.
 */
interface JobStatusBadgeProps {
  status: 'draft' | 'open' | 'in_progress' | 'closed' | string
  size?: 'sm' | 'md'
}

const STATUS_CONFIG = {
  draft:       { label: 'Draft',       className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  open:        { label: 'Open',        className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  closed:      { label: 'Closed',      className: 'bg-red-500/20 text-red-300 border-red-500/30' },
} as const

export default function JobStatusBadge({ status, size = 'sm' }: JobStatusBadgeProps) {
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
