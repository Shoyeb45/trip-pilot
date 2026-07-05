import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { pollTrip } from "../network/trips-api";
import { TripDetailsSkeleton } from "../components/trips/trip-details-skeleton";
import { TripMap } from "../components/trips/trip-map";
import { formatDistance, formatDuration, formatTripDate } from "../utils/format";
import { getApiErrorMessage } from "../network/api-client";
import type { TripDetail } from "../types/trip";
import {  Map, CheckCircle2, AlertCircle, Loader2, Route } from "lucide-react";

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
        if (data.trip_status.value === "completed" || data.trip_status.value === "failed") {
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
        <h2 className="text-xl font-bold text-text">Failed to load trip details</h2>
        <p className="text-text-muted max-w-md">{error}</p>
        <button
          type="button"
          onClick={() => {
            setIsLoading(true);
            setError(null);
            if (tripId) {
              pollTrip(tripId).then(setTrip).catch((err) => setError(getApiErrorMessage(err))).finally(() => setIsLoading(false));
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
      {/* Header View */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-text font-display text-3xl font-bold tracking-wide">
            Trip details
          </h1>
          <p className="text-text-muted font-body mt-1 text-sm">
            Trip overview and generated logs
          </p>
        </div>

        {/* Status Badges Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Badge */}
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isCompleted
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
              : isFailed
              ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
              : isCalculating
              ? "bg-amber-950/40 border-amber-500/30 text-amber-400 animate-pulse"
              : "bg-surface-elevated border-border text-text-muted"
          }`}>
            {trip.trip_status.label}
          </span>

          {/* Generation Stage/Loading status badge */}
          {trip.generate_stage && (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              isCompleted
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                : isFailed
                ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                : "bg-[#1e293b] border-primary/20 text-primary"
            }`}>
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
        {/* Card 1: Route details & stops */}
        <div className="bg-surface border-border flex flex-col gap-6 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-amber-500">
            <Route className="size-5" />
            <h2 className="text-text font-display text-lg font-bold">Route</h2>
          </div>

          {/* Responsive Route Timeline (Horizontal on desktop, Vertical on mobile) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-4 py-4 w-full">
            
            {/* Current Location Point */}
            <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-2 w-full md:w-1/3">
              <div className="flex flex-col items-center justify-center">
                <div className="size-4 rounded-full border-2 border-white bg-[#38bdf8] shadow-md" />
                {/* Mobile vertical line */}
                <div className="md:hidden h-14 w-0.5 border-l-2 border-dashed border-border/80 my-2" />
              </div>
              <div className="flex flex-col md:items-center text-left md:text-center">
                <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">Current</span>
                <span className="text-text font-display text-sm font-semibold max-w-[240px] mt-1 line-clamp-2" title={trip.current_location.display_name}>
                  {trip.current_location.display_name}
                </span>
              </div>
            </div>

            {/* Connection 1 (Desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-[100px] relative -mt-5">
              {trip.curr_to_pickup ? (
                <>
                  <span className="text-text-muted font-mono text-xs mb-1.5 font-medium bg-[#1e293b] border border-border/40 rounded px-2.5 py-0.5 whitespace-nowrap shadow-sm">
                    {formatDistance(trip.curr_to_pickup.distance)} &middot; {formatDuration(trip.curr_to_pickup.time)}
                  </span>
                  <div className="w-full h-0.5 border-t-2 border-dashed border-border/80" />
                </>
              ) : (
                <div className="w-full h-0.5 border-t-2 border-dashed border-border/40" />
              )}
            </div>

            {/* Connection 1 Text (Mobile) */}
            <div className="md:hidden flex pl-8 -mt-16 -mb-2">
              {trip.curr_to_pickup && (
                <span className="text-text-muted font-mono text-xs font-medium bg-[#1e293b] border border-border/40 rounded px-2 py-0.5">
                  {formatDistance(trip.curr_to_pickup.distance)} &middot; {formatDuration(trip.curr_to_pickup.time)}
                </span>
              )}
            </div>

            {/* Pickup Location Point */}
            <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-2 w-full md:w-1/3">
              <div className="flex flex-col items-center justify-center">
                <div className="size-4 rounded-full border-2 border-white bg-[#fbbf24] shadow-md" />
                {/* Mobile vertical line */}
                <div className="md:hidden h-14 w-0.5 border-l-2 border-dashed border-border/80 my-2" />
              </div>
              <div className="flex flex-col md:items-center text-left md:text-center">
                <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">Pickup</span>
                <span className="text-text font-display text-sm font-semibold max-w-[240px] mt-1 line-clamp-2" title={trip.pickup_location.display_name}>
                  {trip.pickup_location.display_name}
                </span>
              </div>
            </div>

            {/* Connection 2 (Desktop) */}
            <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-[100px] relative -mt-5">
              {trip.pickup_to_drop ? (
                <>
                  <span className="text-text-muted font-mono text-xs mb-1.5 font-medium bg-[#1e293b] border border-border/40 rounded px-2.5 py-0.5 whitespace-nowrap shadow-sm">
                    {formatDistance(trip.pickup_to_drop.distance)} &middot; {formatDuration(trip.pickup_to_drop.time)}
                  </span>
                  <div className="w-full h-0.5 border-t-2 border-dashed border-border/80" />
                </>
              ) : (
                <div className="w-full h-0.5 border-t-2 border-dashed border-border/40" />
              )}
            </div>

            {/* Connection 2 Text (Mobile) */}
            <div className="md:hidden flex pl-8 -mt-16 -mb-2">
              {trip.pickup_to_drop && (
                <span className="text-text-muted font-mono text-xs font-medium bg-[#1e293b] border border-border/40 rounded px-2 py-0.5">
                  {formatDistance(trip.pickup_to_drop.distance)} &middot; {formatDuration(trip.pickup_to_drop.time)}
                </span>
              )}
            </div>

            {/* Drop-off Location Point */}
            <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-2 w-full md:w-1/3">
              <div className="flex items-center justify-center">
                <div className="size-4 rounded-full border-2 border-white bg-[#10b981] shadow-md" />
              </div>
              <div className="flex flex-col md:items-center text-left md:text-center">
                <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">Drop-off</span>
                <span className="text-text font-display text-sm font-semibold max-w-[240px] mt-1 line-clamp-2" title={trip.drop_location.display_name}>
                  {trip.drop_location.display_name}
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Grid for Truck, Trailer, Start */}
          <div className="border-border grid grid-cols-3 gap-4 border-t pt-6 mt-2">
            <div>
              <span className="text-text-muted font-body text-xs">Truck #</span>
              <p className="text-text font-display text-lg font-bold mt-1">{trip.truck_number}</p>
            </div>
            <div>
              <span className="text-text-muted font-body text-xs">Trailer #</span>
              <p className="text-text font-display text-lg font-bold mt-1">{trip.tailor_number}</p>
            </div>
            <div>
              <span className="text-text-muted font-body text-xs">Start</span>
              <p className="text-text font-display text-lg font-bold mt-1">{formatTripDate(trip.start_date)}</p>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive Map */}
        <div className="bg-surface border-border flex flex-col gap-6 rounded-lg border p-6">
          <div className="flex items-center gap-2 text-amber-500">
            <Map className="size-5" />
            <h2 className="text-text font-display text-lg font-bold">Map</h2>
          </div>

          {/* Map view rendering */}
          <TripMap trip={trip} />
        </div>
      </div>
    </div>
  );
}
