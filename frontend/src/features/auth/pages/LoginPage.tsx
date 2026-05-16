/**
 * Login Page — JobTech Solutions — Light Mode Redesign
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, Lock, ArrowRight, CheckCircle, ExternalLink } from 'lucide-react'
import { loginSchema, type LoginFormData } from '../schemas'
import { loginApi } from '../api'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Button, Input } from '@/components/ui'

const STATS = [
  { value: '+30%', label: 'Interview completion rate' },
  { value: '<30s', label: 'CV processing time' },
  { value: '>85%', label: 'User satisfaction score' },
]

const FEATURES = [
  'AI-powered CV screening & scoring',
  'Structured interview workflows',
  'Role-based access control',
  'Real-time analytics & reports',
]

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  // Preserve where the user was trying to go (e.g. clicked Apply on a job)
  const from = (location.state as any)?.from?.pathname

  const { mutate: login, isPending } = useMutation({
    mutationFn: (data: LoginFormData) => loginApi(data),
    onSuccess: (res) => {
      setAuth(res.data.user, res.data.access_token)
      toast.success(`Welcome back, ${res.data.user.first_name}!`)

      const role = res.data.user.role
      const dashMap: Record<string, string> = {
        admin: '/dashboard/admin', hr_manager: '/dashboard/hr',
        recruiter: '/dashboard/recruiter', candidate: '/candidate/overview',
      }
      // Go back to where they came from, or to their dashboard
      const destination = from && from !== '/login' ? from : (dashMap[role] ?? '/dashboard')
      navigate(destination, { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error?.message ?? 'Login failed. Please try again.'
      toast.error(msg)
    },
  })

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  return (
    <div className="min-h-screen flex">
      {/* ── Left Panel — Branding ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-slate-50 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-200">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-40" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-50 rounded-full opacity-40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white rounded-full opacity-50" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center mb-16">
            <img 
              src="/assets/images/logo-jobtech.png" 
              alt="JobTech" 
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.15] tracking-tight mb-6">
            Streamline your<br />
            <span className="text-blue-600">recruitment pipeline</span>
          </h1>
          <p className="text-slate-600 text-lg leading-relaxed mb-12 max-w-md">
            Enterprise-grade ATS platform designed for modern HR teams. Hire faster, smarter.
          </p>

          {/* Features */}
          <ul className="flex flex-col gap-3 mb-12">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3 text-slate-600">
                <CheckCircle size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <div className="relative z-10 flex gap-8">
          {STATS.map(s => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel — Form ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex items-center mb-10 lg:hidden">
            <img 
              src="/assets/images/logo-jobtech.png" 
              alt="JobTech" 
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(d => login(d))} noValidate className="flex flex-col gap-4">
            <Input
              id="login-email"
              label="Email address"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              leftIcon={<Mail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div>
              <Input
                id="login-password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                leftIcon={<Lock size={15} />}
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="mt-2 text-right">
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700">Forgot password?</a>
              </div>
            </div>

            <Button
              id="btn-login"
              type="submit"
              size="lg"
              fullWidth
              loading={isPending}
              icon={<ArrowRight size={16} />}
              className="mt-2 justify-between"
            >
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" id="link-to-register" className="font-medium text-blue-600 hover:text-blue-700">
              Create a candidate account
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-slate-400">
            or{' '}
            <Link to="/jobs" className="text-slate-500 hover:text-blue-600 inline-flex items-center gap-1">
              browse jobs without signing in <ExternalLink size={11} />
            </Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-6 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-1">Demo credentials</p>
            <p className="text-xs text-slate-500">candidate@jobtech.ma · Role123!</p>
            <p className="text-xs text-slate-500">recruiter@jobtech.ma · Role123!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
