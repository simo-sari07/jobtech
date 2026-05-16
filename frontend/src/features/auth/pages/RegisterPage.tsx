/**
 * Register Page — JobTech Solutions — Light Mode Redesign
 */
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react'
import { registerSchema, type RegisterFormData } from '../schemas'
import { useRegister } from '../hooks/useRegister'
import { ROLES, ROLE_LABELS } from '@/utils/constants'
import { Button, Input } from '@/components/ui'

const FEATURES = [
  'AI-powered CV screening & scoring',
  'Structured interview workflows',
  'Role-based access control',
  'Real-time analytics & reports',
]

export default function RegisterPage() {
  const { mutate: register, isPending } = useRegister()

  const { register: field, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: { role: ROLES.CANDIDATE },
  })

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-slate-50 flex-col justify-between p-12 relative overflow-hidden border-r border-slate-200">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-100 rounded-full opacity-20 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full opacity-20 -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center mb-16">
            <img 
              src="/assets/images/logo-jobtech.png" 
              alt="JobTech" 
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-4xl font-bold text-slate-900 leading-tight mb-6 tracking-tight">
            Join the future<br />
            <span className="text-blue-600">of recruitment</span>
          </h1>
          <p className="text-slate-600 text-base leading-relaxed mb-10">
            Create your account and start managing your recruitment pipeline in minutes.
          </p>

          <ul className="flex flex-col gap-4">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <CheckCircle size={14} className="text-blue-600" />
                </div>
                <span className="text-sm text-slate-600">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-slate-200 pt-6">
          <p className="text-xs text-slate-400">Trusted by 500+ HR teams worldwide</p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">
          <div className="flex items-center mb-8 lg:hidden">
            <img 
              src="/assets/images/logo-jobtech.png" 
              alt="JobTech" 
              className="h-12 w-auto object-contain"
            />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Create your account</h2>
            <p className="text-slate-500 text-sm">Get started in under a minute</p>
          </div>

          <form onSubmit={handleSubmit(d => register(d))} noValidate className="flex flex-col gap-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="reg-first"
                label="First name"
                type="text"
                placeholder="John"
                autoComplete="given-name"
                leftIcon={<User size={15} />}
                error={errors.first_name?.message}
                {...field('first_name')}
              />
              <Input
                id="reg-last"
                label="Last name"
                type="text"
                placeholder="Smith"
                autoComplete="family-name"
                error={errors.last_name?.message}
                {...field('last_name')}
              />
            </div>

            <Input
              id="reg-email"
              label="Email address"
              type="email"
              placeholder="you@company.com"
              autoComplete="email"
              leftIcon={<Mail size={15} />}
              error={errors.email?.message}
              {...field('email')}
            />


            <Input
              id="reg-password"
              label="Password"
              type="password"
              placeholder="Min. 8 chars, uppercase, digit"
              autoComplete="new-password"
              leftIcon={<Lock size={15} />}
              error={errors.password?.message}
              hint="Use 8+ characters with uppercase, lowercase, and a number"
              {...field('password')}
            />

            <Input
              id="reg-confirm"
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              leftIcon={<Lock size={15} />}
              error={errors.confirm_password?.message}
              {...field('confirm_password')}
            />

            <Button
              id="btn-register"
              type="submit"
              size="lg"
              fullWidth
              loading={isPending}
              icon={<ArrowRight size={16} />}
              className="mt-2 justify-between"
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" id="link-to-login" className="font-medium text-blue-600 hover:text-blue-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
