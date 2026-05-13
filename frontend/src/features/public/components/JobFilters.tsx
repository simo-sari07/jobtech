/**
 * JobFilters — desktop sidebar filters for the public jobs page.
 * Contract type, experience, deadline.
 */
import type { PublicJobFilters } from '../api'

interface JobFiltersProps {
  filters: PublicJobFilters
  onChange: (updated: Partial<PublicJobFilters>) => void
}

const CONTRACT_OPTIONS = [
  { value: '',           label: 'All types' },
  { value: 'cdi',        label: 'Permanent (CDI)' },
  { value: 'cdd',        label: 'Fixed-term (CDD)' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance',  label: 'Freelance' },
]

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Most recent' },
  { value: 'created_at',  label: 'Oldest first' },
  { value: 'deadline',    label: 'Closing soon' },
]

export default function JobFilters({ filters, onChange }: JobFiltersProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Sort by</h3>
        <div className="space-y-1">
          {SORT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="ordering"
                value={opt.value}
                checked={(filters.ordering ?? '-created_at') === opt.value}
                onChange={() => onChange({ ordering: opt.value })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Contract type</h3>
        <div className="space-y-1">
          {CONTRACT_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="contract_type"
                value={opt.value}
                checked={(filters.contract_type ?? '') === opt.value}
                onChange={() => onChange({ contract_type: opt.value || undefined })}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Clear filters */}
      {(filters.contract_type || filters.ordering) && (
        <button
          onClick={() => onChange({ contract_type: undefined, ordering: undefined })}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
