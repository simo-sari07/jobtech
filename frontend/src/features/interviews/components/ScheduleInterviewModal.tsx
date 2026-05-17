import { useEffect, useState } from "react";
import { useApplications } from "@/features/applications/hooks/useApplications";
import toast from "react-hot-toast";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Calendar,
  Clock,
  Link as LinkIcon,
  MapPin,
  Video,
  Phone,
  Users,
  Code,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useScheduleInterview } from "../hooks/useInterviews";
import type { InterviewType } from "../types";

const schema = z.object({
  interview_type: z.enum(["phone", "video", "onsite", "technical"]),
  scheduled_at: z.string().min(1, "Date and time are required"),
  duration_minutes: z.coerce.number().min(15).max(480),
  location_or_link: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number;
  candidateName?: string;
  jobTitle?: string;
}

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  jobTitle,
}: Props) {
  const { mutateAsync: schedule, isPending } = useScheduleInterview();
  const [selectedAppId, setSelectedAppId] = useState<number | "">("");

  // Only fetch applications if we don't have a pre-selected one
  const showAppSelector = !applicationId || applicationId === 0;
  const { data: appsData, isLoading: appsLoading } = useApplications(
    showAppSelector ? { archived: false } : undefined
  );
  
  const applications = (appsData?.results ?? []).filter(
    (app) => app.status === "shortlisted" || app.status === "interview"
  );

  // Find selected application details to display in subtitle if selecting from dropdown
  const selectedApp = applications.find(a => a.id === selectedAppId);
  const displayCandidateName = candidateName || selectedApp?.candidate_name || "";
  const displayJobTitle = jobTitle || selectedApp?.job_title || "";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      interview_type: "video",
      duration_minutes: 60,
      scheduled_at: "",
      location_or_link: "",
      notes: "",
    },
  });

  const selectedType = watch("interview_type");

  useEffect(() => {
    if (isOpen) {
      reset();
      setSelectedAppId("");
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const targetAppId = applicationId > 0 ? applicationId : Number(selectedAppId);
      if (!targetAppId) {
        toast.error("Please select a candidate application first!");
        return;
      }
      await schedule({
        application: targetAppId,
        ...data,
      });
      onClose();
    } catch {
      // toast handled in hook
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Schedule Interview
            </h2>
            <p className="text-xs text-slate-500">
              {displayCandidateName || displayJobTitle 
                ? `For ${displayCandidateName} • ${displayJobTitle}`
                : "Create a new scheduled session"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {/* Candidate Dropdown Selector (if no preselected application) */}
          {showAppSelector && (
            <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
              <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                <span>Select Candidate Application</span>
                {appsLoading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
              </label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-50 outline-none bg-white text-slate-700 font-medium"
              >
                <option value="">-- Choose Candidate --</option>
                {applications.length === 0 && !appsLoading ? (
                  <option value="" disabled>
                    No shortlisted or interview-stage candidates available
                  </option>
                ) : (
                  applications.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.candidate_name} — {app.job_title} ({app.status})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Interview Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "video", label: "Video", icon: <Video size={14} /> },
                { id: "phone", label: "Phone", icon: <Phone size={14} /> },
                { id: "onsite", label: "On-site", icon: <Users size={14} /> },
                {
                  id: "technical",
                  label: "Technical",
                  icon: <Code size={14} />,
                },
              ].map((t) => (
                <label
                  key={t.id}
                  className={`
                    flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all
                    ${
                      selectedType === t.id
                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }
                  `}
                >
                  <input
                    type="radio"
                    value={t.id}
                    className="hidden"
                    {...register("interview_type")}
                  />
                  {t.icon}
                  <span className="text-sm font-medium">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date & Time"
              type="datetime-local"
              error={errors.scheduled_at?.message}
              {...register("scheduled_at")}
            />
            <Input
              label="Duration (min)"
              type="number"
              error={errors.duration_minutes?.message}
              {...register("duration_minutes")}
            />
          </div>

          <Input
            label={
              selectedType === "video" ? "Meeting Link" : "Location / Address"
            }
            placeholder={
              selectedType === "video"
                ? "https://zoom.us/j/..."
                : "Office Room 302"
            }
            leftIcon={
              selectedType === "video" ? (
                <LinkIcon size={14} />
              ) : (
                <MapPin size={14} />
              )
            }
            error={errors.location_or_link?.message}
            {...register("location_or_link")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">
              Internal Notes
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-500 focus:ring-3 focus:ring-blue-50 outline-none min-h-[100px]"
              placeholder="Preparation notes for the interviewer..."
              {...register("notes")}
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isPending}>
            Schedule Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
