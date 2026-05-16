/**
 * ApplyModal — Smart CV-aware application modal.
 *
 * FLOW:
 *  ┌─ Has saved CV? ─────────────────────────────────────────┐
 *  │  YES → Show radio choice:                               │
 *  │         (•) Use saved CV                                │
 *  │         ( ) Upload new CV  → show file picker           │
 *  │             └─ "Save as default?" checkbox              │
 *  │  NO  → Force upload directly                            │
 *  └─────────────────────────────────────────────────────────┘
 *  Both paths → cover letter (optional) → Submit
 */
import { useEffect, useRef, useState } from "react";
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { PublicJob } from "../api";
import { useAuthStore } from "@/store/authStore";
import {
  useCandidateProfile,
  useUpdateCandidateProfile,
} from "@/features/candidates/hooks";
import { useSubmitApplication } from "@/features/applications/hooks/useApplications";
import { Button } from "@/components/ui";
import toast from "react-hot-toast";
import client from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type CvChoice = "saved" | "new";

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: PublicJob;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApplyModal({
  isOpen,
  onClose,
  job,
  onSuccess,
}: ApplyModalProps) {
  const { user } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useCandidateProfile();
  const submitApp = useSubmitApplication();
  const updateProfile = useUpdateCandidateProfile();

  const hasSavedCv = !profileLoading && !!profile?.cv_url;

  // ── Local state ─────────────────────────────────────────────────────────────
  const [cvChoice, setCvChoice] = useState<CvChoice>("saved");
  const [newCvFile, setNewCvFile] = useState<File | null>(null);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  // Default to 'new' if no saved CV
  useEffect(() => {
    if (!profileLoading) {
      setCvChoice(hasSavedCv ? "saved" : "new");
    }
  }, [hasSavedCv, profileLoading]);

  // Reset state every time modal opens
  useEffect(() => {
    if (isOpen) {
      setNewCvFile(null);
      setSaveAsDefault(false);
      setCoverLetter("");
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // ── File pick helpers ────────────────────────────────────────────────────────

  function handleFileChange(file: File | undefined) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("CV must be under 5MB.");
      return;
    }
    setNewCvFile(file);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!user) return;

    // Validate: if "new CV" is selected but no file picked
    if (cvChoice === "new" && !newCvFile) {
      toast.error("Please upload your CV before submitting.");
      fileRef.current?.click();
      return;
    }
    // Validate: no saved CV and no file
    if (!hasSavedCv && !newCvFile) {
      toast.error("Please upload your CV before submitting.");
      fileRef.current?.click();
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("job", String(job.id));

      if (cvChoice === "saved" && hasSavedCv) {
        // Fetch the saved CV from the URL and attach it as a Blob.
        // We must use a relative URL so the Vite proxy routes it correctly,
        // and force content-type to application/pdf so backend validation passes.
        const cvUrl = profile!.cv_url!;
        const relativeUrl = cvUrl.startsWith("http")
          ? new URL(cvUrl).pathname
          : cvUrl;
        const res = await fetch(relativeUrl);
        const rawBlob = await res.blob();
        const blob = new Blob([rawBlob], { type: "application/pdf" });
        const filename = cvUrl.split("/").pop() ?? "cv.pdf";
        fd.append("cv_file", blob, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
      } else if (newCvFile) {
        fd.append("cv_file", newCvFile, newCvFile.name);
      }

      if (coverLetter.trim()) {
        fd.append("cover_letter", coverLetter.trim());
      }

      await submitApp.mutateAsync(fd);

      // If user wants to save the new CV as their default profile CV
      if (cvChoice === "new" && newCvFile && saveAsDefault) {
        try {
          await updateProfile.mutateAsync({ cv_file: newCvFile });
        } catch {
          // Non-fatal — application already submitted
        }
      }

      toast.success("Application submitted successfully! 🎉");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to submit application. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────────

  const savedCvName = profile?.cv_url
    ? (profile.cv_url.split("/").pop() ?? "Your saved CV")
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-bold text-slate-900 text-base">
              Apply for this position
            </h2>
            <p className="text-sm text-slate-500 mt-0.5 truncate">
              {job.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* ─── CV SECTION ──────────────────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Your CV <span className="text-red-400">*</span>
            </p>

            {profileLoading ? (
              <div className="h-20 bg-slate-50 rounded-xl animate-pulse" />
            ) : hasSavedCv ? (
              /* ── CASE 2: Has saved CV — show radio choice ── */
              <div className="flex flex-col gap-2">
                {/* Option A: Use saved CV */}
                <label
                  className={`
                    flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150
                    ${
                      cvChoice === "saved"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="cv-choice"
                    value="saved"
                    checked={cvChoice === "saved"}
                    onChange={() => {
                      setCvChoice("saved");
                      setNewCvFile(null);
                    }}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cvChoice === "saved" ? "bg-blue-100" : "bg-slate-100"}`}
                    >
                      <FileText
                        size={15}
                        className={
                          cvChoice === "saved"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${cvChoice === "saved" ? "text-blue-900" : "text-slate-800"}`}
                      >
                        Use your saved CV
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {savedCvName}
                      </p>
                    </div>
                  </div>
                  {cvChoice === "saved" && (
                    <CheckCircle2
                      size={16}
                      className="text-blue-600 shrink-0"
                    />
                  )}
                </label>

                {/* Option B: Upload new CV */}
                <label
                  className={`
                    flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150
                    ${
                      cvChoice === "new"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="cv-choice"
                    value="new"
                    checked={cvChoice === "new"}
                    onChange={() => setCvChoice("new")}
                    className="accent-blue-600 w-4 h-4 shrink-0"
                  />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cvChoice === "new" ? "bg-blue-100" : "bg-slate-100"}`}
                    >
                      <Upload
                        size={15}
                        className={
                          cvChoice === "new"
                            ? "text-blue-600"
                            : "text-slate-400"
                        }
                      />
                    </div>
                    <p
                      className={`text-sm font-semibold ${cvChoice === "new" ? "text-blue-900" : "text-slate-800"}`}
                    >
                      Upload a new CV
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 shrink-0" />
                </label>

                {/* File picker — only shown when "new" is selected */}
                {cvChoice === "new" && (
                  <div className="mt-1 flex flex-col gap-2">
                    <FileDropZone
                      file={newCvFile}
                      dragOver={dragOver}
                      fileRef={fileRef}
                      onDragOver={() => setDragOver(true)}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        handleFileChange(e.dataTransfer.files?.[0]);
                      }}
                      onClick={() => fileRef.current?.click()}
                      onChange={(e) => handleFileChange(e.target.files?.[0])}
                    />
                    {/* Save as default checkbox */}
                    {newCvFile && (
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-600"
                        />
                        <span className="text-xs text-slate-600">
                          Save this CV as my default for future applications
                        </span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ── CASE 1: No saved CV — force upload ── */
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle
                    size={14}
                    className="text-amber-600 mt-0.5 shrink-0"
                  />
                  <p className="text-xs text-amber-700">
                    You don't have a saved CV yet. Please upload your CV to
                    apply.
                  </p>
                </div>
                <FileDropZone
                  file={newCvFile}
                  dragOver={dragOver}
                  fileRef={fileRef}
                  onDragOver={() => setDragOver(true)}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFileChange(e.dataTransfer.files?.[0]);
                  }}
                  onClick={() => fileRef.current?.click()}
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                {newCvFile && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600"
                    />
                    <span className="text-xs text-slate-600">
                      Save this CV to my profile for future applications
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* ─── COVER LETTER ────────────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              Cover Letter{" "}
              <span className="text-slate-400 font-normal normal-case ml-1">
                (optional)
              </span>
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              placeholder="Why are you a great fit for this role?"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
            />
          </div>

          {/* ─── ACTIONS ─────────────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <Button
              fullWidth
              loading={submitting}
              icon={!submitting ? <CheckCircle2 size={15} /> : undefined}
              onClick={handleSubmit}
            >
              Submit Application
            </Button>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FileDropZone sub-component ───────────────────────────────────────────────

interface DropZoneProps {
  file: File | null;
  dragOver: boolean;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onDragOver: React.DragEventHandler;
  onDragLeave: React.DragEventHandler;
  onDrop: React.DragEventHandler;
  onClick: () => void;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}

function FileDropZone({
  file,
  dragOver,
  fileRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onChange,
}: DropZoneProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-2 py-7 px-4
        rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150
        ${
          file
            ? "border-emerald-300 bg-emerald-50"
            : dragOver
              ? "border-blue-400 bg-blue-50 scale-[1.01]"
              : "border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-white hover:shadow-sm"
        }
      `}
    >
      {file ? (
        <>
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-emerald-700 truncate max-w-[220px]">
              {file.name}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">
              Click to change file
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
            <Upload size={18} className="text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">
              {dragOver ? "Drop it here!" : "Click or drag & drop your CV"}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">PDF only · max 5MB</p>
          </div>
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
