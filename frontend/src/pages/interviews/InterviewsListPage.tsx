import { useState } from "react";
import { Calendar, Search, Filter, Plus, RefreshCw } from "lucide-react";
import { Button, Input, Card, Spinner } from "@/components/ui";
import { useNavigate } from "react-router-dom";
import { useInterviews } from "@/features/interviews/hooks/useInterviews";
import { InterviewsTable } from "@/features/interviews/components/InterviewsTable";
import ScheduleInterviewModal from "@/features/interviews/components/ScheduleInterviewModal";
import { useAuthStore } from "@/store/authStore";
import { ROLES } from "@/utils/constants";

export default function InterviewsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useInterviews({
    status: statusFilter || undefined,
  });

  const interviews = data?.results || [];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Interviews
          </h1>
          <p className="text-slate-500 text-sm">
            {user?.role === ROLES.CANDIDATE
              ? "View your upcoming and past interview sessions."
              : "Manage and conduct interviews for your applications."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => refetch()}
            disabled={isFetching}
            icon={
              <RefreshCw
                size={14}
                className={isFetching ? "animate-spin" : ""}
              />
            }
          >
            Refresh
          </Button>
          {user?.role !== ROLES.CANDIDATE && (
            <Button
              variant="primary"
              size="md"
              icon={<Plus size={16} />}
              onClick={() => setIsScheduleOpen(true)}
            >
              Schedule Interview
            </Button>
          )}
        </div>
      </div>

      {/* Filters Card */}
      <Card padding="sm" className="bg-white/50 backdrop-blur-sm border-dashed">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Input
              placeholder="Search candidate or job..."
              leftIcon={<Search size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-100"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-show</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        <InterviewsTable
          interviews={interviews}
          isLoading={isLoading}
          onEvaluate={(itv) =>
            navigate(`/dashboard/interviews/${itv.id}/evaluate`)
          }
        />
      </Card>

      {/* Schedule Modal (Dummy app ID 0 for general schedule, usually triggered from application) */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        applicationId={0} // Ideally we should pick from a list or trigger from app
      />

      {/* Footer info */}
      <div className="flex justify-between items-center text-xs text-slate-400 px-2">
        <p>Showing {interviews.length} interviews</p>
        <p>Last synced: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
