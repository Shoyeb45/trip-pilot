import type React from "react";
import { useEffect, useState } from "react";
import { getTrips } from "../../network/trips-api";
import type { TripDetail } from "../../types/trip";
import { TripCard } from "./trip-card";
import { Search, Calendar, RefreshCw, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../network/api-client";

export const TripsList: React.FC = () => {
  const [trips, setTrips] = useState<TripDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Pagination State
  const [searchText, setSearchText] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const PAGE_SIZE = 10;

  // Debounce location search query to minimize API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedLocation(searchText);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Handle date query changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFilter(e.target.value);
    setPage(1);
  };

  // Reset all filters to default
  const handleClearFilters = () => {
    setSearchText("");
    setDebouncedLocation("");
    setDateFilter("");
    setPage(1);
  };

  const fetchTripsList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTrips({
        page,
        page_size: PAGE_SIZE,
        date: dateFilter || undefined,
        location: debouncedLocation || undefined,
      });
      setTrips(response.results || []);
      setTotalCount(response.count || 0);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsList();
  }, [page, debouncedLocation, dateFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      {/* Search and Filters Controls */}
      <div className="bg-surface border-border flex flex-col md:flex-row items-stretch md:items-center gap-4 rounded-lg border p-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="text-text-subtle absolute top-3.5 left-3.5 size-4" />
          <input
            type="text"
            placeholder="Search by city, state, or location name..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="bg-background border-border text-text placeholder:text-text-subtle font-body w-full rounded-md border py-2.5 pr-4 pl-11 text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Date Input */}
        <div className="relative w-full md:w-56">
          <Calendar className="text-text-subtle absolute top-3.5 left-3.5 size-4 pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={handleDateChange}
            className="bg-background border-border text-text font-body w-full rounded-md border py-2.5 pr-4 pl-11 text-sm outline-none focus:border-primary transition-colors [&::-webkit-calendar-picker-indicator]:invert-[0.8]"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {(searchText || dateFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-text-muted hover:text-text border-border bg-background hover:border-primary/40 font-semibold rounded-md border px-4 py-2.5 text-sm cursor-pointer transition-colors"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={fetchTripsList}
            disabled={isLoading}
            className="bg-background border-border hover:border-primary/40 text-text font-semibold rounded-md border px-4 py-2.5 flex items-center gap-2 cursor-pointer transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`size-4 text-text-subtle ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main List Contents */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface border-border flex flex-col gap-4 rounded-lg border p-5 animate-pulse h-48">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <div className="h-6 w-24 rounded bg-surface-elevated" />
                <div className="h-4 w-32 rounded bg-surface-elevated" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="h-4 w-full rounded bg-surface-elevated" />
                <div className="h-4 w-2/3 rounded bg-surface-elevated" />
              </div>
              <div className="h-6 w-full rounded bg-surface-elevated" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-surface border-border flex flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center">
          <Inbox className="size-12 text-rose-500" />
          <h3 className="text-text font-display text-lg font-bold">Failed to load trips</h3>
          <p className="text-text-muted text-sm max-w-sm">{error}</p>
          <button
            type="button"
            onClick={fetchTripsList}
            className="bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm mt-2 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-surface border-border flex flex-col items-center justify-center gap-3 rounded-lg border p-16 text-center">
          <Inbox className="size-12 text-text-subtle" />
          <h3 className="text-text font-display text-lg font-bold">No trips found</h3>
          <p className="text-text-muted text-sm max-w-xs">
            {searchText || dateFilter
              ? "Try adjusting your search query or clear the filters to see all trips."
              : "Generate a new trip to start tracking your ELD logs and routes."}
          </p>
          {(searchText || dateFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm mt-2 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} onDeleteSuccess={fetchTripsList} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-4 mt-2">
              <span className="text-text-muted text-xs">
                Showing page <strong className="text-text font-semibold">{page}</strong> of <strong className="text-text font-semibold">{totalPages}</strong> ({totalCount} trips)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page <= 1}
                  className="bg-surface border-border text-text hover:border-primary/40 disabled:opacity-50 disabled:hover:border-border font-semibold rounded-md border p-2 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  disabled={page >= totalPages}
                  className="bg-surface border-border text-text hover:border-primary/40 disabled:opacity-50 disabled:hover:border-border font-semibold rounded-md border p-2 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};