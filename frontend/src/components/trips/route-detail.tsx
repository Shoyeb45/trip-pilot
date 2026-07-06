import type React from "react";
import type { TripDetail } from "../../types/trip";
import {
  formatDistance,
  formatDuration,
  formatTripDate,
} from "../../utils/format";
import { Route } from "lucide-react";

interface Props {
  trip: TripDetail;
}

export const RouteDetail: React.FC<Props> = ({ trip }) => {
  return (
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
            <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">
              Current
            </span>
            <span
              className="text-text font-display text-sm font-semibold max-w-60 mt-1 line-clamp-2"
              title={trip.current_location.display_name}
            >
              {trip.current_location.display_name}
            </span>
          </div>
        </div>

        {/* Connection 1 (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-25 relative -mt-5">
          {trip.curr_to_pickup ? (
            <>
              <span className="text-text-muted font-mono text-xs mb-1.5 font-medium bg-[#1e293b] border border-border/40 rounded px-2.5 py-0.5 whitespace-nowrap shadow-sm">
                {formatDistance(trip.curr_to_pickup.distance)} &middot;{" "}
                {formatDuration(trip.curr_to_pickup.time)}
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
              {formatDistance(trip.curr_to_pickup.distance)} &middot;{" "}
              {formatDuration(trip.curr_to_pickup.time)}
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
            <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">
              Pickup
            </span>
            <span
              className="text-text font-display text-sm font-semibold max-w-60 mt-1 line-clamp-2"
              title={trip.pickup_location.display_name}
            >
              {trip.pickup_location.display_name}
            </span>
          </div>
        </div>

        {/* Connection 2 (Desktop) */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1 min-w-25 relative -mt-5">
          {trip.pickup_to_drop ? (
            <>
              <span className="text-text-muted font-mono text-xs mb-1.5 font-medium bg-[#1e293b] border border-border/40 rounded px-2.5 py-0.5 whitespace-nowrap shadow-sm">
                {formatDistance(trip.pickup_to_drop.distance)} &middot;{" "}
                {formatDuration(trip.pickup_to_drop.time)}
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
              {formatDistance(trip.pickup_to_drop.distance)} &middot;{" "}
              {formatDuration(trip.pickup_to_drop.time)}
            </span>
          )}
        </div>

        {/* Drop-off Location Point */}
        <div className="flex flex-row md:flex-col items-center md:text-center gap-4 md:gap-2 w-full md:w-1/3">
          <div className="flex items-center justify-center">
            <div className="size-4 rounded-full border-2 border-white bg-[#10b981] shadow-md" />
          </div>
          <div className="flex flex-col md:items-center text-left md:text-center">
            <span className="text-text-muted font-body text-xs font-semibold uppercase tracking-wider">
              Drop-off
            </span>
            <span
              className="text-text font-display text-sm font-semibold max-w-60 mt-1 line-clamp-2"
              title={trip.drop_location.display_name}
            >
              {trip.drop_location.display_name}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Grid for Truck, Trailer, Start */}
      <div className="border-border grid grid-cols-3 gap-4 border-t pt-6 mt-2">
        <div>
          <span className="text-text-muted font-body text-xs">Truck #</span>
          <p className="text-text font-display text-lg font-bold mt-1">
            {trip.truck_number}
          </p>
        </div>
        <div>
          <span className="text-text-muted font-body text-xs">Trailer #</span>
          <p className="text-text font-display text-lg font-bold mt-1">
            {trip.tailor_number}
          </p>
        </div>
        <div>
          <span className="text-text-muted font-body text-xs">Start</span>
          <p className="text-text font-display text-lg font-bold mt-1">
            {formatTripDate(trip.start_date)}
          </p>
        </div>
      </div>
    </div>
  );
};
