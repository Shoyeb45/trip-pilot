import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { pollTrip } from "../network/trips-api";
import { TripDetailsSkeleton } from "../components/trips/trip-details-skeleton";
import { TripMap } from "../components/trips/trip-map";
import { getApiErrorMessage } from "../network/api-client";
import type { TripDetail } from "../types/trip";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { RouteDetail } from "../components/trips/route-detail";
import { EldLogSection } from "../components/trips/eld-log-section";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;

    let isMounted = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchTrip = async () => {
      try {
        const data = await pollTrip(tripId);
        if (!isMounted) return;
        setTrip(data);
        setError(null);
        setIsLoading(false);

        // Stop polling if processing is finished (completed or failed)
        if (
          data.trip_status.value === "completed" ||
          data.trip_status.value === "failed"
        ) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      } catch (err) {
        if (!isMounted) return;
        const msg = getApiErrorMessage(err);
        setError(msg);
        setIsLoading(false);
      }
    };

    // Execute first API request immediately
    fetchTrip();

    // Start polling every 2 seconds (2000 milliseconds)
    intervalId = setInterval(fetchTrip, 2000);

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [tripId]);

  // Show skeleton during first-time loading while we have no data
  if (isLoading && !trip) {
    return <TripDetailsSkeleton />;
  }

  // Show error only if we failed and still have no trip details
  if (error && !trip) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 py-16 text-center">
        <AlertCircle className="size-12 text-rose-500" />
        <h2 className="text-xl font-bold text-text">
          Failed to load trip details
        </h2>
        <p className="text-text-muted max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            if (tripId) {
              pollTrip(tripId)
                .then(setTrip)
                .catch((err) => setError(getApiErrorMessage(err)))
                .finally(() => setIsLoading(false));
            }
          }}
          className="bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!trip) return null;

  const isCompleted = trip.trip_status.value === "completed";
  const isFailed = trip.trip_status.value === "failed";
  const isCalculating = trip.trip_status.value === "calculating";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text font-display text-3xl font-bold tracking-wide">
            Trip details
          </h1>
          <p className="text-text-muted font-body mt-1 text-sm">
            Trip overview and generated logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
              isCompleted
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                : isFailed
                  ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                  : isCalculating
                    ? "bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse"
                    : "bg-surface-elevated border-border text-text-muted"
            }`}
          >
            {trip.trip_status.label}
          </span>

          {trip.generate_stage && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                isCompleted
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                  : isFailed
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                    : "bg-[#1e293b] border-primary/20 text-primary"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="size-3.5 text-emerald-400" />
              ) : isFailed ? (
                <AlertCircle className="size-3.5 text-rose-400" />
              ) : (
                <Loader2 className="size-3.5 animate-spin text-primary" />
              )}
              {trip.generate_stage.label}
            </span>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex flex-col gap-6">
        <RouteDetail trip={trip} />

        <TripMap trip={trip} />

        <EldLogSection trip={trip} />
      </div>
    </div>
  );
}
