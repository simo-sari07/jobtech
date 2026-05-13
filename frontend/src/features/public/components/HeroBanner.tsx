import { useNavigate } from 'react-router-dom'
import JobSearchBar from './JobSearchBar'

export default function HeroBanner() {
  const navigate = useNavigate()

  const handleSearch = ({ search, location }: { search?: string; location?: string }) => {
    const params = new URLSearchParams()
    if (search)   params.set('search', search)
    if (location) params.set('location', location)
    navigate(`/jobs?${params.toString()}`)
  }

  return (
    <section className="relative w-full bg-white overflow-hidden min-h-[600px] flex items-center border-b border-gray-100">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CgkgIDxwYXRoIGQ9Ik02MCAwTDAgMHY2MGg2MFYweiIgZmlsbD0ibm9uZSIvPgoJICA8cGF0aCBkPSJNNjAgMEwwIDB2NjBoNjBWMHptLTEgMXY1OEgxdjEwLTYwIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuMDIpIi8+Cjwvc3ZnPg==')] opacity-100" />
        
        {/* Soft Glowing Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[40%] rounded-full bg-blue-50/60 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 z-10 flex flex-col items-center text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-8 animate-fade-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          JobTech ATS is now live
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
          Discover your next <br className="hidden sm:block" />
          <span className="text-blue-600">
            career-defining
          </span> role.
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: '200ms' }}>
          Join top companies building the future. Seamless applications, real-time tracking, and a platform designed for your success.
        </p>

        {/* Search Bar Container */}
        <div className="w-full max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="p-2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl shadow-blue-900/5">
            <JobSearchBar onSearch={handleSearch} large />
          </div>
        </div>

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-10 text-sm animate-fade-up" style={{ animationDelay: '400ms' }}>
          <span className="text-gray-500 font-medium">Trending searches:</span>
          {['Frontend Engineer', 'Product Manager', 'Data Scientist', 'Remote'].map(term => (
            <button
              key={term}
              onClick={() => navigate(`/jobs?search=${encodeURIComponent(term)}`)}
              className="px-4 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
            >
              {term}
            </button>
          ))}
        </div>
        
      </div>
    </section>
  )
}
