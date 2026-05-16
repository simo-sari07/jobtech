import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  MapPin,
  Clock,
  Calendar,
  Zap,
  ChevronDown,
  TrendingUp,
  Users,
  Star,
  BarChart2,
  Building2,
  AlertCircle,
} from "lucide-react";
import apiClient from "@/api/client";
import { AI_ENDPOINTS } from "@/api/endpoints";
import ScoreRing from "../components/ScoreRing";
import ProcessingTimeline from "../components/ProcessingTimeline";
import AIFilters from "../components/AIFilters";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Offer {
  id: number;
  title: string;
  location: string;
  status: string;
  contract_type: string;
  application_count: number;
}

interface PipelineStats {
  applications: number;
  average_score: number;
  top_candidates: number;
  best_matches: number;
  needs_review: number;
  rejected_by_ai: number;
  processing: number;
}

interface Candidate {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  job_id: number;
  job_title: string;
  job_location: string;
  ai_score: number | null;
  status: string;
  created_at: string;
  cv_url: string | null;
  ai_score_detail?: {
    match_score: number;
    skills_match: number;
    experience_match: number;
    extracted_skills: string[];
    extracted_experience: number | null;
    strengths: string[];
    gaps: string[];
    score_label: string;
    score_color: string;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function initials(name: string) {
  return (name || "??")
    .split(" ")
    .map((n) => n[0] || "?")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const GRAD = [
  ["#6366f1", "#8b5cf6"],
  ["#3b82f6", "#06b6d4"],
  ["#10b981", "#059669"],
  ["#f59e0b", "#ef4444"],
];

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = "all" | "best" | "review" | "potential" | "rejected" | "recent";
const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "best", label: "Best Matches" },
  { key: "review", label: "Needs Review" },
  { key: "potential", label: "High Potential" },
  { key: "rejected", label: "Rejected by AI" },
  { key: "recent", label: "Recently Applied" },
];

function filterByTab(apps: Candidate[], tab: TabKey) {
  const now = Date.now();
  switch (tab) {
    case "best":
      return apps.filter((a) => (a.ai_score ?? 0) >= 80);
    case "review":
      return apps.filter((a) => {
        const s = a.ai_score ?? 0;
        return s >= 40 && s < 60;
      });
    case "potential":
      return apps.filter((a) => (a.ai_score ?? 0) >= 70);
    case "rejected":
      return apps.filter((a) => (a.ai_score ?? 0) < 40);
    case "recent":
      return apps.filter(
        (a) => now - new Date(a.created_at).getTime() < 86400_000,
      );
    default:
      return apps;
  }
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        marginBottom: 12,
        border: "1px solid #f3f4f6",
        display: "flex",
        gap: 16,
        alignItems: "center",
      }}
    >
      {[48, 140, 80, 76, 100].map((w, i) => (
        <div
          key={i}
          style={{
            height: i === 3 ? 76 : 14,
            width: w,
            borderRadius: 6,
            background:
              "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        border: "1px solid #f3f4f6",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        flex: 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111827" }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
              {sub}
            </div>
          )}
        </div>
        <div style={{ color: "#3b82f6", opacity: 0.6 }}>{icon}</div>
      </div>
    </div>
  );
}

// ── Candidate Card ─────────────────────────────────────────────────────────────

function CandidateCard({ app, index }: { app: Candidate; index: number }) {
  const score = app.ai_score != null ? Math.round(app.ai_score) : null;
  const detail = app.ai_score_detail;
  const skills = detail?.extracted_skills ?? [];
  const navigate = useNavigate();
  const [g] = useState(GRAD[index % GRAD.length]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: "18px 22px",
        border: "1px solid #f3f4f6",
        marginBottom: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        display: "flex",
        alignItems: "center",
        gap: 18,
        animation: `fadeSlideIn 0.4s ease both`,
        animationDelay: `${index * 50}ms`,
        transition: "box-shadow 0.2s,transform 0.2s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)";
        el.style.transform = "translateY(0)";
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          flexShrink: 0,
          background: `linear-gradient(135deg,${g[0]},${g[1]})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 700,
          fontSize: 16,
        }}
      >
        {initials(app.candidate_name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "#111827",
            marginBottom: 2,
          }}
        >
          {app.candidate_name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "#6b7280",
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          {app.job_location && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <MapPin size={11} />
              {app.job_location}
            </span>
          )}
          {detail?.extracted_experience != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={11} />
              {detail.extracted_experience}y exp
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Calendar size={11} />
            {timeAgo(app.created_at)}
          </span>
        </div>
      </div>

      {/* Score */}
      {score != null ? (
        <ScoreRing score={score} size={70} />
      ) : (
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "#f9fafb",
            border: "3px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 14,
                height: 14,
                border: "2px solid #3b82f6",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto",
              }}
            />
            <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 3 }}>
              Scoring…
            </div>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {detail?.strengths?.length || detail?.gaps?.length ? (
        <div style={{ minWidth: 150, maxWidth: 190 }}>
          {(detail!.strengths ?? []).slice(0, 2).map((s, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "#065f46",
                display: "flex",
                gap: 4,
                marginBottom: 3,
              }}
            >
              <span style={{ color: "#16a34a" }}>✓</span>
              {s}
            </div>
          ))}
          {(detail!.gaps ?? []).slice(0, 1).map((g, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "#92400e",
                display: "flex",
                gap: 4,
                marginBottom: 3,
              }}
            >
              <span style={{ color: "#f59e0b" }}>●</span>
              {g}
            </div>
          ))}
        </div>
      ) : null}

      {/* Skills */}
      {skills.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 150 }}
        >
          {skills.slice(0, 3).map((s) => (
            <span
              key={s}
              style={{
                padding: "2px 8px",
                background: "#f0f9ff",
                color: "#0369a1",
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 500,
                border: "1px solid #bae6fd",
              }}
            >
              {s}
            </span>
          ))}
          {skills.length > 3 && (
            <span
              style={{
                padding: "2px 8px",
                background: "#f3f4f6",
                color: "#6b7280",
                borderRadius: 10,
                fontSize: 10,
              }}
            >
              +{skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate(`/dashboard/users/${app.candidate_id}`)}
          style={{
            padding: "6px 14px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 7,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          View Profile
        </button>
      </div>
    </div>
  );
}

// ── Offer Selector ────────────────────────────────────────────────────────────

function OfferSelector({
  offers,
  selectedId,
  onSelect,
}: {
  offers: Offer[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const selected = offers.find((o) => o.id === selectedId);
  return (
    <div style={{ position: "relative", minWidth: 280 }}>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value))}
        style={{
          width: "100%",
          appearance: "none",
          padding: "10px 36px 10px 14px",
          border: "1.5px solid #e5e7eb",
          borderRadius: 10,
          fontSize: 13,
          color: "#111827",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 500,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <option value="" disabled>
          Select a job offer…
        </option>
        {offers.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title} ({o.application_count} apps)
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "#9ca3af",
        }}
      />
      {selected && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            fontSize: 11,
            color: "#6b7280",
            display: "flex",
            gap: 8,
          }}
        >
          {selected.location && (
            <span>
              <MapPin size={10} style={{ verticalAlign: "middle" }} />{" "}
              {selected.location}
            </span>
          )}
          <span
            style={{
              padding: "1px 6px",
              background: selected.status === "open" ? "#dcfce7" : "#f3f4f6",
              color: selected.status === "open" ? "#16a34a" : "#6b7280",
              borderRadius: 8,
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {selected.status}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<TabKey>("all");
  const [sortBy, setSortBy] = useState<"ai_score" | "name" | "applied">(
    "ai_score",
  );
  const [filters, setFilters] = useState({
    minScore: 0,
    experience: "",
    location: "",
    skills: [] as string[],
    jobId: "",
  });

  const selectedOfferId = searchParams.get("offer")
    ? Number(searchParams.get("offer"))
    : null;

  const selectOffer = useCallback(
    (id: number) => {
      setSearchParams({ offer: String(id) });
      setTab("all");
    },
    [setSearchParams],
  );

  // ── Load offer list (for selector) ────────────────────────────────────────
  const { data: offersData } = useQuery({
    queryKey: ["ai-offers"],
    queryFn: async () => {
      const res = await apiClient.get(AI_ENDPOINTS.OFFERS);
      return (res.data?.results ?? []) as Offer[];
    },
    staleTime: 60_000,
  });
  const offers = offersData ?? [];

  // Auto-select first offer if none selected
  React.useEffect(() => {
    if (!selectedOfferId && offers.length > 0) selectOffer(offers[0].id);
  }, [offers, selectedOfferId, selectOffer]);

  // ── Load pipeline for selected offer ─────────────────────────────────────
  const {
    data: pipelineData,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["ai-pipeline", selectedOfferId, filters.minScore],
    queryFn: async () => {
      if (!selectedOfferId) return null;
      const params: Record<string, string> = {
        offer_id: String(selectedOfferId),
      };
      if (filters.minScore > 0) params.min_score = String(filters.minScore);
      const res = await apiClient.get(AI_ENDPOINTS.PIPELINE, { params });
      return res.data;
    },
    enabled: !!selectedOfferId,
    refetchInterval: 10_000,
  });

  const stats: PipelineStats = pipelineData?.stats ?? {
    applications: 0,
    average_score: 0,
    top_candidates: 0,
    best_matches: 0,
    needs_review: 0,
    rejected_by_ai: 0,
    processing: 0,
  };
  const allApplications: Candidate[] = pipelineData?.results ?? [];

  // Auto-trigger processing for unscored apps in this offer
  React.useEffect(() => {
    const unscoredCount = allApplications.filter(a => a.ai_score === null).length
    if (selectedOfferId && unscoredCount > 0 && !isFetching) {
      apiClient.post(AI_ENDPOINTS.PROCESS, { offer_id: selectedOfferId })
        .catch(err => console.error('Auto-process failed:', err))
    }
  }, [selectedOfferId, allApplications.length, isFetching])

  // Filter + sort (client-side)
  const filtered = useMemo(() => {
    let list = filterByTab(allApplications, tab);
    if (filters.location)
      list = list.filter((a) =>
        a.job_location?.toLowerCase().includes(filters.location.toLowerCase()),
      );
    if (sortBy === "name")
      list = [...list].sort((a, b) =>
        a.candidate_name.localeCompare(b.candidate_name),
      );
    if (sortBy === "applied")
      list = [...list].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    return list;
  }, [allApplications, tab, filters, sortBy]);

  const timelineEvents = [
    {
      time: "Just now",
      title: "Ranked",
      subtitle: "Sorted by AI score",
      status: "done" as const,
      type: "rank" as const,
    },
    {
      time: "1m ago",
      title: "Match Scored",
      subtitle: "Weighted score computed",
      status: "done" as const,
      type: "score" as const,
    },
    {
      time: "2m ago",
      title: "Skills Matched",
      subtitle: "CV vs job requirements",
      status: "done" as const,
      type: "skills" as const,
    },
    {
      time: "3m ago",
      title: "CV Parsed",
      subtitle: "Extracted via GPT-4.1-mini",
      status: "done" as const,
      type: "parse" as const,
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        padding: "24px",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
      }}
    >
      <style>{`
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── MAIN CONTENT ───────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 800,
                color: "#111827",
              }}
            >
              AI Candidate Pipeline
            </h1>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 13 }}>
              Rankings scoped to selected offer — AI scores are contextual
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <OfferSelector
              offers={offers}
              selectedId={selectedOfferId}
              onSelect={selectOffer}
            />
            <div style={{ position: "relative" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  appearance: "none",
                  padding: "10px 32px 10px 12px",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#374151",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="ai_score">Sort: AI Score</option>
                <option value="name">Sort: Name</option>
                <option value="applied">Sort: Date Applied</option>
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "#9ca3af",
                }}
              />
            </div>
          </div>
        </div>

        {/* No offer selected */}
        {!selectedOfferId && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #f3f4f6",
            }}
          >
            <Building2
              size={40}
              style={{ color: "#d1d5db", marginBottom: 12 }}
            />
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: "#374151",
              }}
            >
              Select a job offer to view its AI pipeline
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9ca3af" }}>
              Rankings are always scoped to a single offer for accuracy
            </p>
          </div>
        )}

        {selectedOfferId && (
          <>
            {/* Stats */}
            <div
              style={{
                display: "flex",
                gap: 12,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <StatCard
                icon={<Users size={20} />}
                label="Applications"
                value={stats.applications}
                sub="for this offer"
              />
              <StatCard
                icon={<BarChart2 size={20} />}
                label="Avg AI Score"
                value={`${stats.average_score}%`}
                sub="scored candidates"
              />
              <StatCard
                icon={<Star size={20} />}
                label="Top Candidates"
                value={stats.top_candidates}
                sub="score ≥ 70%"
              />
              <StatCard
                icon={<TrendingUp size={20} />}
                label="Best Matches"
                value={stats.best_matches}
                sub="score ≥ 80%"
              />
            </div>

            {/* Tabs — counts scoped to this offer */}
            <div
              style={{
                display: "flex",
                marginBottom: 16,
                borderBottom: "2px solid #f3f4f6",
                flexWrap: "wrap",
              }}
            >
              {TABS.map((t) => {
                const count = filterByTab(allApplications, t.key).length;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    style={{
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      color: active ? "#2563eb" : "#6b7280",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      borderBottom: active
                        ? "2px solid #2563eb"
                        : "2px solid transparent",
                      marginBottom: -2,
                      whiteSpace: "nowrap",
                      transition: "color 0.2s",
                    }}
                  >
                    {t.label}{" "}
                    <span
                      style={{
                        fontSize: 11,
                        color: active ? "#2563eb" : "#9ca3af",
                      }}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
              {isFetching && !isLoading && (
                <span
                  style={{
                    marginLeft: "auto",
                    alignSelf: "center",
                    fontSize: 11,
                    color: "#9ca3af",
                    paddingRight: 8,
                  }}
                >
                  Refreshing…
                </span>
              )}
            </div>

            {/* List */}
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filtered.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  background: "#fff",
                  borderRadius: 12,
                  border: "1px solid #f3f4f6",
                }}
              >
                {allApplications.length === 0 ? (
                  <>
                    <AlertCircle
                      size={36}
                      style={{ color: "#d1d5db", marginBottom: 12 }}
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      No applications analyzed yet for this offer
                    </p>
                    <p
                      style={{
                        margin: "6px 0 16px",
                        fontSize: 13,
                        color: "#9ca3af",
                      }}
                    >
                      Candidates will appear here once they apply and the AI
                      processes their CVs
                    </p>
                  </>
                ) : (
                  <>
                    <Zap
                      size={36}
                      style={{
                        opacity: 0.3,
                        marginBottom: 12,
                        color: "#6b7280",
                      }}
                    />
                    <p
                      style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: "#374151",
                      }}
                    >
                      No candidates match these filters
                    </p>
                    <p
                      style={{
                        margin: "6px 0 16px",
                        fontSize: 13,
                        color: "#9ca3af",
                      }}
                    >
                      Try a different tab or clear your filters
                    </p>
                    <button
                      onClick={() => {
                        setTab("all");
                        setFilters({
                          minScore: 0,
                          experience: "",
                          location: "",
                          skills: [],
                          jobId: "",
                        });
                      }}
                      style={{
                        padding: "8px 20px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
            ) : (
              filtered.map((app, i) => (
                <CandidateCard key={app.id} app={app} index={i} />
              ))
            )}
          </>
        )}
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div style={{ width: 270, flexShrink: 0 }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 18,
            border: "1px solid #f3f4f6",
            marginBottom: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
              AI Processing
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "#16a34a",
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#16a34a",
                  display: "inline-block",
                }}
              />
              Live
            </span>
          </div>
          {selectedOfferId ? (
            <ProcessingTimeline events={timelineEvents} />
          ) : (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
              Select an offer to see processing activity
            </p>
          )}
        </div>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 18,
            border: "1px solid #f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <AIFilters filters={filters} onChange={setFilters} />
        </div>
      </div>
    </div>
  );
}
