import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  denormalizeTripDetail,
  getDashboardMetrics,
} from "../network/trips-api";
import type { DashboardMetrics } from "../types/trip";
import { DASHBOARD_METRICS_INFO } from "../constants/dashboard";
import {
  Info,
  MapPin,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../network/api-client";

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDashboardMetrics();
      setMetrics({
        ...data,
        recent_trips: data.recent_trips.map((trip) =>
          denormalizeTripDetail(trip as any),
        ),
      });
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="size-8 text-primary animate-spin" />
        <span className="text-text-muted text-sm">
          Loading dashboard metrics...
        </span>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-surface border-border flex flex-col items-center justify-center gap-3 rounded-lg border p-12 text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="size-12 text-rose-500" />
        <h3 className="text-text font-display text-lg font-bold">
          Failed to load dashboard metrics
        </h3>
        <p className="text-text-muted text-sm">
          {error || "Could not retrieve metrics"}
        </p>
        <button
          type="button"
          onClick={fetchMetrics}
          className="bg-primary hover:bg-primary-hover text-black font-semibold rounded-md px-4 py-2 text-sm mt-2 transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  // Helper to format status display labels
  const getStatusBadgeStyles = (statusVal: string) => {
    switch (statusVal) {
      case "completed":
        return {
          badge: "bg-emerald-950/40 border-emerald-500/30 text-emerald-400",
          icon: "bg-emerald-950/40 text-emerald-400",
          label: "Completed",
        };
      case "failed":
        return {
          badge: "bg-rose-950/40 border-rose-500/30 text-rose-400",
          icon: "bg-rose-950/40 text-rose-400",
          label: "Failed",
        };
      default:
        return {
          badge: "bg-amber-950/40 border-amber-500/30 text-amber-400",
          icon: "bg-amber-950/40 text-amber-400",
          label: statusVal === "calculating" ? "In progress" : "Draft",
        };
    }
  };

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Title block */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text font-display text-2xl font-bold">
            Dashboard
          </h1>
          <p className="text-text-muted text-sm">
            Key HOS metrics and recent trips at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchMetrics}
          className="bg-surface border-border hover:border-primary/40 text-text font-semibold rounded-md border p-2 flex items-center justify-center cursor-pointer transition-colors"
          title="Refresh metrics"
        >
          <RefreshCw className="size-4 text-text-subtle" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Trips Card */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-medium uppercase tracking-wider">
              {DASHBOARD_METRICS_INFO.totalTrips.title}
            </span>
            <div className="relative group/tooltip">
              <Info className="size-4 text-text-subtle cursor-help hover:text-text transition-colors" />
              <div className="absolute hidden group-hover/tooltip:block bottom-6 right-0 w-60 bg-surface-elevated border border-border rounded-lg p-2.5 text-xs text-text-muted z-50 shadow-xl leading-normal pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
                {DASHBOARD_METRICS_INFO.totalTrips.tooltip}
              </div>
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-text">
              {metrics.total_trips}
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              All time trips
            </div>
          </div>
        </div>

        {/* Total Miles Driven Card */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-medium uppercase tracking-wider">
              {DASHBOARD_METRICS_INFO.totalMiles.title}
            </span>
            <div className="relative group/tooltip">
              <Info className="size-4 text-text-subtle cursor-help hover:text-text transition-colors" />
              <div className="absolute hidden group-hover/tooltip:block bottom-6 right-0 w-60 bg-surface-elevated border border-border rounded-lg p-2.5 text-xs text-text-muted z-50 shadow-xl leading-normal pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
                {DASHBOARD_METRICS_INFO.totalMiles.tooltip}
              </div>
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-text">
              {metrics.total_miles.toLocaleString()}
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              across {metrics.completed_trips_count} completed trips
            </div>
          </div>
        </div>

        {/* Average Driving Hours Card */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-medium uppercase tracking-wider">
              {DASHBOARD_METRICS_INFO.avgDrivingHours.title}
            </span>
            <div className="relative group/tooltip">
              <Info className="size-4 text-text-subtle cursor-help hover:text-text transition-colors" />
              <div className="absolute hidden group-hover/tooltip:block bottom-6 right-0 w-60 bg-surface-elevated border border-border rounded-lg p-2.5 text-xs text-text-muted z-50 shadow-xl leading-normal pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
                {DASHBOARD_METRICS_INFO.avgDrivingHours.tooltip}
              </div>
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-text">
              {metrics.avg_driving_hours}h
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              per completed trip
            </div>
          </div>
        </div>

        {/* Cycle Hours Remaining Card */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow relative">
          <div className="flex items-center justify-between">
            <span className="text-text-muted text-xs font-medium uppercase tracking-wider">
              {DASHBOARD_METRICS_INFO.cycleHoursRemaining.title}
            </span>
            <div className="relative group/tooltip">
              <Info className="size-4 text-text-subtle cursor-help hover:text-text transition-colors" />
              <div className="absolute hidden group-hover/tooltip:block bottom-6 right-0 w-60 bg-surface-elevated border border-border rounded-lg p-2.5 text-xs text-text-muted z-50 shadow-xl leading-normal pointer-events-none animate-in fade-in slide-in-from-bottom-1 duration-150">
                {DASHBOARD_METRICS_INFO.cycleHoursRemaining.tooltip}
              </div>
            </div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-amber-500">
              {metrics.cycle_hours_remaining}h
            </div>
            <div className="text-[11px] text-text-muted mt-1.5">
              of 70h cycle
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trips Section */}
      <div className="bg-surface border border-border rounded-lg p-5 shadow-sm mt-2">
        <div className="mb-4">
          <h2 className="text-text font-semibold text-md">Recent trips</h2>
          <p className="text-text-muted text-xs">Last 3 trips created</p>
        </div>

        {metrics.recent_trips.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            No trips found.
          </div>
        ) : (
          <div className="flex flex-col">
            {metrics.recent_trips.map((trip) => {
              if (!trip.pickup_location || !trip.drop_location) return <></>;

              console.log("Pickup Location");
              console.log(JSON.stringify(trip.pickup_location, null, 2));
              const styles = getStatusBadgeStyles(trip.trip_status.value);
              const routeDistance = trip.total_distance_miles
                ? `${trip.total_distance_miles.toLocaleString()} mi`
                : "N/A";
              return (
                <div
                  key={trip.id}
                  className="flex items-center justify-between gap-4 py-3.5 border-b border-border/40 last:border-b-0 hover:bg-surface-elevated/20 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${styles.icon}`}
                    >
                      <MapPin className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-text truncate max-w-md">
                        {trip.pickup_location?.city ||
                          trip.pickup_location?.display_name}{" "}
                        →{" "}
                        {trip.drop_location.city ||
                          trip.drop_location.city}
                      </div>
                      <div className="text-text-muted text-xs mt-0.5">
                        Truck #: {trip.truck_number} • {routeDistance}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${styles.badge}`}
                      >
                        {styles.label}
                      </span>
                      <div className="text-[11px] text-text-muted mt-1.5">
                        {formatDate(trip.created_at || trip.start_date)}
                      </div>
                    </div>

                    <Link
                      to={`/dashboard/trips/${trip.id}`}
                      className="flex items-center justify-center size-8 rounded-full bg-surface-elevated text-text-muted group-hover:bg-primary group-hover:text-black transition-colors cursor-pointer"
                      title="View details"
                    >
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
