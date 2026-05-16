/**
 * CandidateNavTabs — horizontal tab navigation under the topbar.
 * Active tab: blue underline. Mobile: horizontally scrollable.
 */
import { NavLink } from 'react-router-dom'

const TABS = [
  { label: 'Overview',        to: '/candidate/overview' },
  { label: 'Browse Jobs',     to: '/candidate/jobs' },
  { label: 'My Applications', to: '/candidate/applications' },
  { label: 'My Interviews',   to: '/candidate/interviews' },
  { label: 'Saved Jobs',      to: '/candidate/saved' },
]

export default function CandidateNavTabs() {
  return (
    <div
      className="bg-white border-b border-slate-200 sticky top-[64px] z-40"
      style={{ height: 44 }}
    >
      <nav
        className="flex items-end h-full px-6 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
        {TABS.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex items-center h-full px-4 shrink-0 text-sm font-medium border-b-2 transition-all duration-[120ms]
              ${isActive
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-900'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
