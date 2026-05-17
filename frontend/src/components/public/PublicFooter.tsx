import { Link } from 'react-router-dom'
import { Link2, MessageCircle, Code, Mail } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="bg-slate-50 pt-16 pb-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Section: Branding & Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Column 1: Brand & Description */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center group mb-4">
              <img 
                src="/assets/images/logo-jobtech.png" 
                alt="JobTech" 
                className="h-13 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-6">
              The modern applicant tracking system designed to streamline your hiring process and elevate the candidate experience.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors" aria-label="Twitter">
                <MessageCircle size={18} />
              </a>
              <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors" aria-label="LinkedIn">
                <Link2 size={18} />
              </a>
              <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors" aria-label="GitHub">
                <Code size={18} />
              </a>
            </div>
          </div>

          {/* Column 2: Candidates */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-4">For Candidates</h3>
            <ul className="space-y-3">
              <li><Link to="/jobs" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Browse Jobs</Link></li>
              <li><Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Sign in</Link></li>
              <li><Link to="/register" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Create account</Link></li>
              <li><Link to="/candidate/saved" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Saved Jobs</Link></li>
            </ul>
          </div>

          {/* Column 3: Employers */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-4">For Employers</h3>
            <ul className="space-y-3">
              <li><Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">HR Dashboard</Link></li>
              <li><Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Post a Job</Link></li>
              <li><Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">Resources</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="text-slate-900 font-semibold text-sm mb-4">Contact</h3>
            <ul className="space-y-3">
              <li>
                <a href="mailto:hello@jobtech.com" className="group flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
                  <Mail size={16} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                  hello@jobtech.com
                </a>
              </li>
              <li className="text-sm text-slate-500">
                123 Innovation Drive<br />
                Tech City, TC 90210
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Section: Copyright & Legal */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} JobTech Solutions. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Privacy Policy</Link>
            <Link to="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Terms of Service</Link>
            <Link to="#" className="text-xs text-slate-400 hover:text-slate-900 transition-colors">Cookie Policy</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
