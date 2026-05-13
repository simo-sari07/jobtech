/**
 * JobsPage — /jobs
 * Public-facing job listing with URL-synced filters.
 * Indeed-inspired: search bar + sidebar filters + job list.
 */
import { useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import JobSearchBar from "../components/JobSearchBar";
import JobFilters from "../components/JobFilters";
import JobCard from "../components/JobCard";
import { usePublicJobs } from "../hooks/usePublicJobs";
import type { PublicJobFilters } from "../api";

function JobListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  );
}

function Pagination({
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        ← Previous
      </button>
      <span className="px-4 py-2 text-sm text-gray-500">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        Next →
      </button>
    </div>
  );
}

export default function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const filters: PublicJobFilters = {
    search: searchParams.get("search") || undefined,
    location: searchParams.get("location") || undefined,
    contract_type: searchParams.get("contract_type") || undefined,
    ordering: searchParams.get("ordering") || undefined,
    page: Number(searchParams.get("page")) || 1,
  };

  const { data, isLoading } = usePublicJobs(filters);

  const updateFilters = (updates: Partial<PublicJobFilters>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries({ ...filters, ...updates }).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") next.set(k, String(v));
      else next.delete(k);
    });
    // Reset to page 1 when filters change (unless we're explicitly changing page)
    if (!("page" in updates)) next.set("page", "1");
    setSearchParams(next);
  };

  const jobs = data?.results ?? [];
  const totalCount = data?.count ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Search bar */}
      <div className="mb-6">
        <JobSearchBar
          defaultValues={{ search: filters.search, location: filters.location }}
          onSearch={({ search, location }) =>
            updateFilters({ search, location })
          }
        />
      </div>

      {/* Results count + mobile filter toggle */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          {isLoading ? (
            <span className="text-gray-400">Searching…</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{totalCount}</span>{" "}
              job{totalCount !== 1 ? "s" : ""} found
              {filters.search && (
                <>
                  {" "}
                  for{" "}
                  <span className="italic text-gray-700">
                    "{filters.search}"
                  </span>
                </>
              )}
              {filters.location && (
                <>
                  {" "}
                  in{" "}
                  <span className="italic text-gray-700">
                    {filters.location}
                  </span>
                </>
              )}
            </>
          )}
        </p>
        <button
          className="flex lg:hidden items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          onClick={() => setMobileFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden mb-6 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <JobFilters
            filters={filters}
            onChange={(updates) => {
              updateFilters(updates);
              setMobileFiltersOpen(false);
            }}
          />
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filters — desktop */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-20">
            <JobFilters filters={filters} onChange={updateFilters} />
          </div>
        </aside>

        {/* Job list */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <JobListSkeleton />
          ) : jobs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SlidersHorizontal size={22} className="opacity-40" />
              </div>
              <p className="font-medium text-gray-600 mb-1">
                No jobs match your search
              </p>
              <p className="text-sm">
                Try different keywords or remove some filters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={filters.page ?? 1}
            totalCount={totalCount}
            pageSize={20}
            onPageChange={(page) => updateFilters({ page })}
          />
        </div>
      </div>
    </div>
  );
}
