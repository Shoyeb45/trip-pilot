export interface MetricInfo {
  title: string;
  tooltip: string;
}

export const DASHBOARD_METRICS_INFO: Record<string, MetricInfo> = {
  totalTrips: {
    title: "Total trips",
    tooltip: "The total number of trips created in the system, including in-progress, completed, and failed trips.",
  },
  totalMiles: {
    title: "Total miles driven",
    tooltip: "Sum of total_distance_miles across all completed trips, covering every leg from current location through pickup to drop-off.",
  },
  avgDrivingHours: {
    title: "Avg driving hours",
    tooltip: "Average driving-status hours logged per trip, calculated from duty log entries where duty_status is driving.",
  },
  cycleHoursRemaining: {
    title: "Cycle hours remaining",
    tooltip: "Hours left in the rolling 70-hour, 8-day cycle before a 34-hour restart is required. Calculated as 70 minus cycle_hours_used.",
  },
} as const;
