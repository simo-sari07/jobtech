/**
 * CVUpdateModal — drag & drop CV upload modal.
 * Opens from ProfileDropdown "Update CV" item.
 * No new API endpoints — uses existing APPLICATIONS_ENDPOINTS.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import apiClient from '@/api/client'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const MAX_MB = 5
const ACCEPT = ['.pdf', '.docx']

export default function CVUpdateModal({ isOpen, onClose }: Props) {
  const [file, setFile]         = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef                = useRef<HTMLInputElement>(null)

  // ── Close on Escape ───────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── Reset state when modal closes ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setFile(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // ── File validation ───────────────────────────────────────────────────────
  function validateAndSet(f: File) {
    setError(null)
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!ACCEPT.includes(ext)) {
      setError('Only .pdf and .docx files are allowed.')
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB}MB.`)
      return
    }
    setFile(f)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) validateAndSet(f)
  }

  async function handleUpload() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('cv', file)
      // POST to candidate profile endpoint — updates the CV on their profile
      await apiClient.patch('/api/v1/candidates/profile/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('CV updated successfully!')
      onClose()
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(2)} MB`

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      >
        {/* Panel */}
        <div
          className="bg-white w-full max-w-[480px] rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: 'cvModalIn 0.2s ease forwards' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Update your CV</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload a new PDF or DOCX file (max {MAX_MB}MB)
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Drop zone */}
            {!file ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                  transition-all duration-150 select-none
                  ${dragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                  }
                `}
              >
                <Upload
                  size={32}
                  className={`mx-auto mb-3 ${dragging ? 'text-blue-500' : 'text-slate-300'}`}
                />
                <p className="text-sm font-medium text-slate-700">
                  Drag & drop your CV here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  or <span className="text-blue-600 font-medium">browse to upload</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wider font-medium">
                  PDF · DOCX · max {MAX_MB}MB
                </p>
              </div>
            ) : (
              /* File selected state */
              <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-3 bg-emerald-50/40">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatSize(file.size)}</p>
                </div>
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
              </div>
            )}

            {/* Change file button */}
            {file && (
              <button
                onClick={() => { setFile(null); inputRef.current?.click() }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium text-center w-full transition-colors"
              >
                Choose different file
              </button>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={onInputChange}
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 px-6 pb-5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="
                flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
                bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload CV
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cvModalIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )

  return createPortal(modal, document.body)
}
