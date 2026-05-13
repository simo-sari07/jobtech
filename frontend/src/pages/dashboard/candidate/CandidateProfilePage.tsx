/**
 * CandidateProfilePage — /dashboard/candidate/profile
 * Complete profile editor: bio, skills, experience, education, default CV.
 */
import { useState, useEffect, useRef } from 'react'
import {
  User, MapPin, Link2, GitBranch, FileText,
  Plus, Trash2, Save, Upload, Briefcase, GraduationCap, Tag,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCandidateProfile, useUpdateCandidateProfile } from '@/features/candidates/hooks'
import type { Experience, Education } from '@/features/candidates/types'
import { Card, Button, Input, Spinner } from '@/components/ui'
import { StatusAlert } from '@/pages/settings/components/StatusAlert'

export default function CandidateProfilePage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading } = useCandidateProfile()
  const updateProfile = useUpdateCandidateProfile()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [bio,         setBio]         = useState('')
  const [location,    setLocation]    = useState('')
  const [linkedin,    setLinkedin]    = useState('')
  const [github,      setGithub]      = useState('')
  const [skills,      setSkills]      = useState<string[]>([])
  const [skillInput,  setSkillInput]  = useState('')
  const [experience,  setExperience]  = useState<Experience[]>([])
  const [education,   setEducation]   = useState<Education[]>([])
  const [cvFile,      setCvFile]      = useState<File | null>(null)
  const [alert,       setAlert]       = useState<{ type: 'success'|'error'; msg: string } | null>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)

  // Seed form from profile when loaded
  useEffect(() => {
    if (!profile) return
    setBio(profile.bio ?? '')
    setLocation(profile.location ?? '')
    setLinkedin(profile.linkedin_url ?? '')
    setGithub(profile.github_url ?? '')
    setSkills(profile.skills ?? [])
    setExperience(profile.experience ?? [])
    setEducation(profile.education ?? [])
  }, [profile])

  // ── Skills helpers ──────────────────────────────────────────────────────────
  function addSkill() {
    const s = skillInput.trim()
    if (s && !skills.includes(s) && skills.length < 50) {
      setSkills(prev => [...prev, s])
    }
    setSkillInput('')
  }
  function removeSkill(s: string) { setSkills(prev => prev.filter(x => x !== s)) }

  // ── Experience helpers ──────────────────────────────────────────────────────
  function addExp() {
    setExperience(prev => [...prev, { title: '', company: '', start_date: '', end_date: '', description: '' }])
  }
  function updateExp(idx: number, patch: Partial<Experience>) {
    setExperience(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }
  function removeExp(idx: number) { setExperience(prev => prev.filter((_, i) => i !== idx)) }

  // ── Education helpers ───────────────────────────────────────────────────────
  function addEdu() {
    setEducation(prev => [...prev, { degree: '', school: '', year: '' }])
  }
  function updateEdu(idx: number, patch: Partial<Education>) {
    setEducation(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }
  function removeEdu(idx: number) { setEducation(prev => prev.filter((_, i) => i !== idx)) }

  // ── Save ────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setAlert(null)
    try {
      await updateProfile.mutateAsync({
        bio, location,
        linkedin_url: linkedin || undefined,
        github_url:   github   || undefined,
        skills, experience, education,
        ...(cvFile ? { cv_file: cvFile } : {}),
      })
      setCvFile(null)
      setAlert({ type: 'success', msg: 'Profile saved successfully.' })
    } catch {
      setAlert({ type: 'error', msg: 'Failed to save profile. Please try again.' })
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-48"><Spinner size={28} /></div>
  }

  const initials = `${user?.first_name?.charAt(0) ?? ''}${user?.last_name?.charAt(0) ?? ''}`.toUpperCase()

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            A complete profile helps recruiters find and match you to the right roles.
          </p>
        </div>
        <Button icon={<Save size={14} />} loading={updateProfile.isPending} onClick={handleSave}>
          Save profile
        </Button>
      </div>

      {alert && <StatusAlert type={alert.type} message={alert.msg} />}

      {/* Avatar + basic info */}
      <Card>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{user?.full_name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <User size={15} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Basic Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input id="cp-location" label="Location" value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Paris, France" leftIcon={<MapPin size={13} />}
            className="sm:col-span-2"
          />
          <Input id="cp-linkedin" label="LinkedIn URL" value={linkedin}
            onChange={e => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/..." leftIcon={<Link2 size={13} />}
          />
          <Input id="cp-github" label="GitHub URL" value={github}
            onChange={e => setGithub(e.target.value)}
            placeholder="https://github.com/..." leftIcon={<GitBranch size={13} />}
          />
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Bio</label>
          <textarea
            id="cp-bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            placeholder="Tell recruiters about yourself, your background, and what you're looking for..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
          />
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Tag size={15} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Skills</h2>
          <span className="text-xs text-slate-400">({skills.length}/50)</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            id="cp-skill-input"
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
            placeholder="Type a skill and press Enter…"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all"
          />
          <Button size="sm" variant="secondary" onClick={addSkill} icon={<Plus size={14} />}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.map(s => (
            <span key={s} className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200">
              {s}
              <button onClick={() => removeSkill(s)} className="hover:text-red-500 transition-colors">×</button>
            </span>
          ))}
          {skills.length === 0 && (
            <p className="text-sm text-slate-400 italic">No skills added yet.</p>
          )}
        </div>
      </Card>

      {/* Experience */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Briefcase size={15} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Work Experience</h2>
          </div>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addExp}>Add</Button>
        </div>
        {experience.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-4">No experience added yet.</p>
        )}
        {experience.map((exp, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-4 mb-3 last:mb-0">
            <div className="flex justify-end mb-3">
              <button onClick={() => removeExp(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input id={`exp-title-${idx}`} label="Job Title" value={exp.title}
                onChange={e => updateExp(idx, { title: e.target.value })} placeholder="Software Engineer" />
              <Input id={`exp-company-${idx}`} label="Company" value={exp.company}
                onChange={e => updateExp(idx, { company: e.target.value })} placeholder="Acme Corp" />
              <Input id={`exp-start-${idx}`} label="Start Date" type="month" value={exp.start_date}
                onChange={e => updateExp(idx, { start_date: e.target.value })} />
              <Input id={`exp-end-${idx}`} label="End Date" type="month" value={exp.end_date ?? ''}
                onChange={e => updateExp(idx, { end_date: e.target.value || null })}
                hint="Leave empty if current role" />
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
                <textarea value={exp.description ?? ''} rows={2}
                  onChange={e => updateExp(idx, { description: e.target.value })}
                  placeholder="Key responsibilities and achievements…"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Education */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={15} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Education</h2>
          </div>
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addEdu}>Add</Button>
        </div>
        {education.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-4">No education added yet.</p>
        )}
        {education.map((edu, idx) => (
          <div key={idx} className="border border-slate-200 rounded-lg p-4 mb-3 last:mb-0">
            <div className="flex justify-end mb-3">
              <button onClick={() => removeEdu(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input id={`edu-degree-${idx}`} label="Degree" value={edu.degree}
                onChange={e => updateEdu(idx, { degree: e.target.value })} placeholder="BSc Computer Science" />
              <Input id={`edu-school-${idx}`} label="School / University" value={edu.school}
                onChange={e => updateEdu(idx, { school: e.target.value })} placeholder="MIT" />
              <Input id={`edu-year-${idx}`} label="Graduation Year" value={String(edu.year ?? '')}
                onChange={e => updateEdu(idx, { year: e.target.value })} placeholder="2023" />
            </div>
          </div>
        ))}
      </Card>

      {/* Default CV */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <FileText size={15} className="text-blue-600" />
          <h2 className="font-semibold text-slate-900 text-sm">Default CV</h2>
        </div>
        {profile?.cv_url && !cvFile && (
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
            <FileText size={16} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-800">CV on file</p>
              <a href={profile.cv_url} target="_blank" rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline">View current CV →</a>
            </div>
          </div>
        )}
        {cvFile && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
            <FileText size={16} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 flex-1 truncate">{cvFile.name}</p>
            <button onClick={() => setCvFile(null)} className="text-slate-400 hover:text-red-500">×</button>
          </div>
        )}
        <input ref={cvInputRef} type="file" accept=".pdf" className="hidden"
          onChange={e => setCvFile(e.target.files?.[0] ?? null)}
        />
        <Button variant="secondary" icon={<Upload size={14} />} onClick={() => cvInputRef.current?.click()}>
          {profile?.cv_url ? 'Replace CV' : 'Upload CV'} (PDF, max 5MB)
        </Button>
        <p className="text-xs text-slate-400 mt-2">
          This will be used as your default CV for quick applications.
        </p>
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end">
        <Button icon={<Save size={14} />} loading={updateProfile.isPending} onClick={handleSave}>
          Save profile
        </Button>
      </div>
    </div>
  )
}
