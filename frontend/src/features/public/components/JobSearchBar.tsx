/**
 * JobSearchBar — keyword + location search inputs.
 * Submits by calling onSearch with current values.
 */
import { useState, useEffect } from 'react'
import { Search, MapPin } from 'lucide-react'
import type { PublicJobFilters } from '../api'

interface JobSearchBarProps {
  defaultValues?: Pick<PublicJobFilters, 'search' | 'location'>
  onSearch: (values: { search?: string; location?: string }) => void
  large?: boolean
}

export default function JobSearchBar({ defaultValues, onSearch, large }: JobSearchBarProps) {
  const [keyword, setKeyword] = useState(defaultValues?.search ?? '')
  const [location, setLocation] = useState(defaultValues?.location ?? '')

  // Sync if URL params change from outside
  useEffect(() => {
    setKeyword(defaultValues?.search ?? '')
    setLocation(defaultValues?.location ?? '')
  }, [defaultValues?.search, defaultValues?.location])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch({
      search:   keyword.trim() || undefined,
      location: location.trim() || undefined,
    })
  }

  const inputBase = large
    ? 'w-full px-4 py-3 text-base text-gray-900 bg-white border-0 outline-none placeholder-gray-400'
    : 'w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-0 outline-none placeholder-gray-400'

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col sm:flex-row items-stretch gap-0 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden ${large ? 'shadow-md' : ''}`}
    >
      {/* Keyword */}
      <div className="flex items-center flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-gray-100">
        <Search size={large ? 18 : 16} className="ml-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Job title, skills, or company"
          className={inputBase}
        />
      </div>

      {/* Location */}
      <div className="flex items-center flex-1 min-w-0">
        <MapPin size={large ? 18 : 16} className="ml-4 text-gray-400 shrink-0" />
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="City or remote"
          className={inputBase}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={`shrink-0 bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors ${
          large ? 'px-8 py-3 text-base' : 'px-5 py-2.5 text-sm'
        }`}
      >
        Search
      </button>
    </form>
  )
}
