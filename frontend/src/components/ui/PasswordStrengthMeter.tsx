/**
 * PasswordStrengthMeter — live password strength indicator.
 *
 * Scoring (0–5 points):
 *   +1  length >= 8
 *   +1  has uppercase (A-Z)
 *   +1  has lowercase (a-z)
 *   +1  has number (0-9)
 *   +1  has special character
 *
 * Levels:  0-1 → Weak · 2-3 → Fair · 4 → Good · 5 → Strong
 */

interface Requirement {
  label: string
  met:   boolean
}

interface PasswordStrengthMeterProps {
  password: string
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: 'At least 8 characters',       met: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)',   met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)',   met: /[a-z]/.test(password) },
    { label: 'One number (0-9)',             met: /[0-9]/.test(password) },
    { label: 'One special character (!@#…)', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ]
}

function getStrength(score: number): {
  label: string
  barColor: string
  textColor: string
  width: string
} {
  if (score <= 1) return { label: 'Weak',   barColor: 'bg-red-500',    textColor: 'text-red-600',    width: 'w-1/5'  }
  if (score <= 2) return { label: 'Fair',   barColor: 'bg-orange-400', textColor: 'text-orange-600', width: 'w-2/5'  }
  if (score <= 3) return { label: 'Good',   barColor: 'bg-yellow-400', textColor: 'text-yellow-600', width: 'w-3/5'  }
  if (score <= 4) return { label: 'Strong', barColor: 'bg-green-500',  textColor: 'text-green-600',  width: 'w-4/5'  }
  return { label: 'Very strong', barColor: 'bg-green-500', textColor: 'text-green-700', width: 'w-full' }
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  if (!password) return null

  const requirements = getRequirements(password)
  const score        = requirements.filter(r => r.met).length
  const strength     = getStrength(score)

  return (
    <div className="space-y-3 mt-1">
      {/* Strength bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Password strength</span>
          <span className={`text-xs font-semibold ${strength.textColor}`}>{strength.label}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${strength.barColor} ${strength.width}`}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {requirements.map((req) => (
          <li key={req.label} className="flex items-center gap-2">
            <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
              req.met
                ? 'bg-green-100 text-green-600'
                : 'bg-slate-100 text-slate-400'
            }`}>
              {req.met ? '✓' : '○'}
            </span>
            <span className={`text-xs ${req.met ? 'text-green-700' : 'text-slate-500'}`}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
