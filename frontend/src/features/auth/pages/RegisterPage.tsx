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
      <div className="hidden lg:flex lg:w-[42%] bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full opacity-10 translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full opacity-10 -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">JT</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">JobTech Solutions</span>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-6 tracking-tight">
            Join the future<br />
            <span className="text-blue-400">of recruitment</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Create your account and start managing your recruitment pipeline in minutes.
          </p>

          <ul className="flex flex-col gap-4">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-900 flex items-center justify-center shrink-0">
                  <CheckCircle size={14} className="text-blue-400" />
                </div>
                <span className="text-sm text-slate-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 border-t border-slate-700 pt-6">
          <p className="text-xs text-slate-500">Trusted by 500+ HR teams worldwide</p>
        </div>
      </div>

      {/* ── Form ── */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">JT</span>
            </div>
            <span className="font-bold text-slate-900">JobTech Solutions</span>
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
