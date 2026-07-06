import type React from "react";
import { Link } from "react-router-dom";
import type { TripDetail } from "../../types/trip";
import {
  formatDistance,
  formatDuration,
  formatTripDate,
} from "../../utils/format";
import { Calendar, Truck, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface TripCardProps {
  trip: TripDetail;
}

export const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  const isCompleted = trip.trip_status.value === "completed";
  const isFailed = trip.trip_status.value === "failed";
  const isCalculating = trip.trip_status.value === "calculating";

  // Calculate total distance & time if available
  const totalMeters = (trip.curr_to_pickup?.distance || 0) + (trip.pickup_to_drop?.distance || 0);
  const totalTimeMs = (trip.curr_to_pickup?.time || 0) + (trip.pickup_to_drop?.time || 0);

  return (
    <div className="bg-surface border-border hover:border-primary/40 flex flex-col gap-4 rounded-lg border p-5 transition-all hover:shadow-lg group">
      {/* Top row: Status badges & Date */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
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
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                isCompleted
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                  : isFailed
                    ? "bg-rose-950/40 border-rose-500/30 text-rose-400"
                    : "bg-[#1e293b] border-primary/20 text-primary"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="size-3 text-emerald-400" />
              ) : isFailed ? (
                <AlertCircle className="size-3 text-rose-400" />
              ) : (
                <Loader2 className="size-3 animate-spin text-primary" />
              )}
              {trip.generate_stage.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-text-muted text-xs">
          <Calendar className="size-3.5 text-text-subtle" />
          <span>{formatTripDate(trip.start_date)}</span>
        </div>
      </div>

      {/* Middle row: Route timeline representation */}
      <div className="flex flex-col gap-2 my-1">
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="size-3 rounded-full border border-white bg-[#38bdf8]" />
            <div className="h-4 w-0.5 bg-border/80 my-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">Start / Current</span>
            <span className="text-text text-sm font-semibold truncate max-w-sm" title={trip.current_location.display_name}>
              {trip.current_location.city || trip.current_location.display_name}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="size-3 rounded-full border border-white bg-[#fbbf24]" />
            <div className="h-4 w-0.5 bg-border/80 my-0.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">Pickup</span>
            <span className="text-text text-sm font-semibold truncate max-w-sm" title={trip.pickup_location.display_name}>
              {trip.pickup_location.city || trip.pickup_location.display_name}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center mt-1">
            <div className="size-3 rounded-full border border-white bg-[#10b981]" />
          </div>
          <div className="flex flex-col">
            <span className="text-text-muted text-[10px] font-semibold uppercase tracking-wider">Drop-off</span>
            <span className="text-text text-sm font-semibold truncate max-w-sm" title={trip.drop_location.display_name}>
              {trip.drop_location.city || trip.drop_location.display_name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom row: Truck numbers & metrics */}
      <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-3 mt-1">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1 text-text-muted">
            <Truck className="size-3.5 text-text-subtle" />
            <span>Truck #: <strong className="text-text font-semibold">{trip.truck_number}</strong></span>
          </div>
          <div className="text-text-muted">
            <span>Trailer #: <strong className="text-text font-semibold">{trip.tailor_number}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {totalMeters > 0 && (
            <div className="text-right text-xs">
              <span className="text-text font-mono font-bold block">
                {formatDistance(totalMeters)}
              </span>
              <span className="text-text-muted text-[10px] font-medium block">
                {formatDuration(totalTimeMs)}
              </span>
            </div>
          )}

          <Link
            to={`/dashboard/trips/${trip.id}`}
            className="flex items-center justify-center size-8 rounded-full bg-surface-elevated text-text-muted group-hover:bg-primary group-hover:text-black transition-colors cursor-pointer"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
