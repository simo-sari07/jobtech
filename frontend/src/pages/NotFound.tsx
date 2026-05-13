/**
 * NotFound — 404 page redesigned for light mode.
 */
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Search } from 'lucide-react'
import { Button } from '@/components/ui'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-fade-up">
        {/* Visual */}
        <div className="relative inline-block">
          <div className="text-[12rem] font-bold text-slate-100 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-24 h-24 bg-blue-600 rounded-2xl rotate-12 flex items-center justify-center shadow-xl">
                <Search size={48} className="text-white -rotate-12" />
             </div>
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lost in the pipeline?</h1>
          <p className="text-slate-500 max-w-xs mx-auto">
            The page you're looking for doesn't exist or has been moved to a different department.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4">
          <Link to="/login" className="w-full sm:w-auto">
             <Button fullWidth size="lg" icon={<Home size={16} />}>
               Back to Safety
             </Button>
          </Link>
          <Button variant="secondary" size="lg" icon={<ArrowLeft size={16} />} onClick={() => window.history.back()}>
             Go Back
          </Button>
        </div>

        {/* Footer */}
        <p className="pt-12 text-xs text-slate-400 font-medium uppercase tracking-widest">
           JobTech Solutions • Platform Central
        </p>
      </div>
    </div>
  )
}
