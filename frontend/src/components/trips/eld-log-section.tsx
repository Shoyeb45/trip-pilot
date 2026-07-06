import type React from "react";
import { useState, useMemo } from "react";
import type { TripDetail } from "../../types/trip";
import { Coffee, Fuel, Bed, Package, RefreshCw } from "lucide-react";

interface EldLogSectionProps {
  trip: TripDetail;
}

function getDayStartUTC(logDateStr: string | null | undefined): Date | null {
  if (!logDateStr) return null;
  return new Date(logDateStr + "T00:00:00Z");
}

function getHoursFromDayStart(dateStr: string | null | undefined, dayStart: Date | null): number {
  if (!dateStr || !dayStart) return 0;
  const date = new Date(dateStr);
  return (date.getTime() - dayStart.getTime()) / (1000 * 60 * 60);
}

function formatLogDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr + "T00:00:00Z");
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getUTCDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function formatTimeRange(arrivalStr: string | null | undefined, departureStr: string | null | undefined): string {
  if (!arrivalStr || !departureStr) return "";
  try {
    const arr = new Date(arrivalStr);
    const dep = new Date(departureStr);
    if (isNaN(arr.getTime()) || isNaN(dep.getTime())) return "";

    const arrHours = String(arr.getUTCHours()).padStart(2, "0");
    const arrMins = String(arr.getUTCMinutes()).padStart(2, "0");

    const depHours = String(dep.getUTCHours()).padStart(2, "0");
    const depMins = String(dep.getUTCMinutes()).padStart(2, "0");

    const arrivalTime = `${arrHours}:${arrMins}`;
    const departureTime = `${depHours}:${depMins}`;

    const isDifferentDay = arr.getUTCDate() !== dep.getUTCDate() || arr.getUTCMonth() !== dep.getUTCMonth();

    if (isDifferentDay) {
      return `${arrivalTime} – next day ${departureTime}`;
    }

    return `${arrivalTime} – ${departureTime}`;
  } catch {
    return "";
  }
}

function formatStopDuration(hours: number | null | undefined): string {
  if (hours == null || isNaN(hours) || hours <= 0) return "0 min";
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  } else if (h > 0) {
    return `${h}h`;
  }
  return `${m} min`;
}

function getStopDutyLabel(stopType: string | null | undefined, durationStr: string): string {
  if (!stopType) return `${durationStr} off duty`;
  if (stopType === "pickup" || stopType === "dropoff" || stopType === "fuel") {
    return `${durationStr} on duty`;
  } else if (stopType === "sleeper_reset") {
    return `${durationStr} sleeper berth`;
  } else {
    return `${durationStr} off duty`;
  }
}

interface StopStyle {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const getStopStyle = (stopType: string): StopStyle => {
  switch (stopType) {
    case "pickup":
    case "dropoff":
      return {
        icon: <Package className="size-4 text-[#22c3a6]" />,
        color: "#22c3a6",
        bgColor: "rgba(34,195,166,0.12)",
      };
    case "fuel":
      return {
        icon: <Fuel className="size-4 text-[#4c8bf5]" />,
        color: "#4c8bf5",
        bgColor: "rgba(76,139,245,0.12)",
      };
    case "rest_break":
      return {
        icon: <Coffee className="size-4 text-[#8b93a7]" />,
        color: "#8b93a7",
        bgColor: "rgba(139,147,167,0.12)",
      };
    case "sleeper_reset":
    case "restart_34hr":
      return {
        icon: <Bed className="size-4 text-[#9b8cf2]" />,
        color: "#9b8cf2",
        bgColor: "rgba(155,140,242,0.12)",
      };
    default:
      return {
        icon: <Coffee className="size-4 text-[#8b93a7]" />,
        color: "#8b93a7",
        bgColor: "rgba(139,147,167,0.12)",
      };
  }
};

function statusToY(statusStr: string): number {
  switch (statusStr) {
    case "off_duty": return 38;
    case "sleeper_berth": return 74;
    case "driving": return 110;
    case "on_duty": return 146;
    default: return 38;
  }
}

function statusToColor(statusStr: string): string {
  switch (statusStr) {
    case "off_duty": return "#8b93a7";
    case "sleeper_berth": return "#9b8cf2";
    case "driving": return "#f2a93b";
    case "on_duty": return "#4c8bf5";
    default: return "#8b93a7";
  }
}

export const EldLogSection: React.FC<EldLogSectionProps> = ({ trip }) => {
  const [activeDay, setActiveDay] = useState(1);



  // Active day details
  const activeDailyLog = useMemo(() => {
    if (!trip?.eld_daily_logs || trip.eld_daily_logs.length === 0) return null;
    return trip.eld_daily_logs.find((log) => log && log.day_number === activeDay) || trip.eld_daily_logs[0];
  }, [trip?.eld_daily_logs, activeDay]);

  // Fixed reference point for this day's grid — every entry's x position
  // is computed relative to THIS, not to the entry's own timestamp.
  const dayStart = useMemo(
    () => activeDailyLog ? getDayStartUTC(activeDailyLog.log_date) : null,
    [activeDailyLog]
  );

  // Active day duty log segments
  const dayEntries = useMemo(() => {
    return (trip?.duty_log_entries || [])
      .filter((entry) => entry && entry.trip_day === activeDay)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }, [trip?.duty_log_entries, activeDay]);

  // Compute SVG stepped line points
  const polylinePoints = useMemo(() => {
    if (dayEntries.length === 0 || !dayStart) return "";
    const points: string[] = [];

    dayEntries.forEach((entry, idx) => {
      if (!entry || !entry.start_time || !entry.end_time) return;
      // Clamp to [0, 24] — an entry that crosses midnight (e.g. a 10-hour
      // sleeper reset) should visually run to the right edge of THIS
      // day's grid, not wrap back around using its own end-of-day hour.
      const startHours = Math.max(0, Math.min(24, getHoursFromDayStart(entry.start_time, dayStart)));
      const endHours = Math.max(0, Math.min(24, getHoursFromDayStart(entry.end_time, dayStart)));

      const xStart = 100 + (startHours / 24) * 500;
      const xEnd = 100 + (endHours / 24) * 500;
      const y = statusToY(entry.duty_status);

      if (idx === 0) {
        points.push(`${xStart.toFixed(1)},${y}`);
      } else {
        const prevEntry = dayEntries[idx - 1];
        const prevY = statusToY(prevEntry ? prevEntry.duty_status : "");
        if (prevY !== y) {
          points.push(`${xStart.toFixed(1)},${y}`);
        }
      }
      points.push(`${xEnd.toFixed(1)},${y}`);
    });

    return points.join(" ");
  }, [dayEntries, dayStart]);

  // Compute transition circle dots
  const transitionCircles = useMemo(() => {
    if (!dayStart) return [];
    return dayEntries.slice(1).map((entry) => {
      if (!entry || !entry.start_time || !entry.id) return null;
      const startHours = Math.max(0, Math.min(24, getHoursFromDayStart(entry.start_time, dayStart)));
      const x = 100 + (startHours / 24) * 500;
      const y = statusToY(entry.duty_status);
      const color = statusToColor(entry.duty_status);

      return (
        <circle
          key={entry.id}
          cx={x.toFixed(1)}
          cy={y}
          r="3"
          fill="#141a2c"
          stroke={color}
          strokeWidth="2"
        />
      );
    }).filter(Boolean);
  }, [dayEntries, dayStart]);

  // If logs are not available yet (calculating/draft)
  if (!trip?.eld_daily_logs || trip.eld_daily_logs.length === 0) {
    return (
      <div className="bg-surface border-border flex flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center">
        <RefreshCw className="size-8 animate-spin text-primary" />
        <h3 className="text-text font-display text-lg font-bold">Logs are being generated</h3>
        <p className="text-text-muted text-sm">Once the processing completes, your ELD daily charts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Day Selector Tabs */}
      {trip?.eld_daily_logs && trip.eld_daily_logs.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border/50">
          {trip.eld_daily_logs.map((log) => {
            if (!log) return null;
            return (
              <button
                key={log.id}
                onClick={() => setActiveDay(log.day_number)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                  activeDay === log.day_number
                    ? "bg-primary text-black border-primary"
                    : "bg-surface border-border text-text-muted hover:text-text hover:border-border/80"
                }`}
              >
                Day {log.day_number}
              </button>
            );
          })}
        </div>
      )}

      {/* Main Grid Card */}
      <div className="bg-surface border-[#232a42] border rounded-lg p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-text font-display text-lg font-bold">
              Daily log — day {activeDailyLog?.day_number || ""}
            </h3>
            <p className="text-text-muted font-body text-xs mt-1">
              {activeDailyLog ? formatLogDate(activeDailyLog.log_date) : ""} &middot; truck {trip?.truck_number || "N/A"} &middot; trailer {trip?.tailor_number || "N/A"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeDailyLog && (activeDailyLog.driving_hours ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-[#f2a93b] bg-[#f2a93b]/10 border border-[#f2a93b]/20 px-2.5 py-1 rounded-md">
                {(activeDailyLog.driving_hours ?? 0).toFixed(1)}h driving
              </span>
            )}
            {activeDailyLog && (activeDailyLog.off_duty_hours ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-[#8b93a7] bg-[#8b93a7]/10 border border-[#8b93a7]/20 px-2.5 py-1 rounded-md">
                {(activeDailyLog.off_duty_hours ?? 0).toFixed(1)}h off
              </span>
            )}
            {activeDailyLog && (activeDailyLog.sleeper_berth_hours ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-[#9b8cf2] bg-[#9b8cf2]/10 border border-[#9b8cf2]/20 px-2.5 py-1 rounded-md">
                {(activeDailyLog.sleeper_berth_hours ?? 0).toFixed(1)}h sleeper
              </span>
            )}
            {activeDailyLog && (activeDailyLog.on_duty_hours ?? 0) > 0 && (
              <span className="text-[11px] font-semibold text-[#4c8bf5] bg-[#4c8bf5]/10 border border-[#4c8bf5]/20 px-2.5 py-1 rounded-md">
                {(activeDailyLog.on_duty_hours ?? 0).toFixed(1)}h on duty
              </span>
            )}
          </div>
        </div>

        {/* 24h HOS Step Graph */}
        <div className="w-full overflow-x-auto pb-2">
          <svg viewBox="0 0 620 210" width="100%" className="min-w-155 h-auto">
            <title>Duty status grid for day {activeDailyLog?.day_number || ""}</title>
 
             <text x="8" y="42" font-size="11" fill="#8b93a7">Off duty</text>
             <text x="8" y="78" font-size="11" fill="#9b8cf2">Sleeper</text>
             <text x="8" y="114" font-size="11" fill="#f2a93b">Driving</text>
             <text x="8" y="150" font-size="11" fill="#4c8bf5">On duty</text>
 
             {/* Grid horizontal guidelines */}
             <line x1="100" y1="20" x2="600" y2="20" stroke="#232a42" strokeWidth="1"/>
             <line x1="100" y1="56" x2="600" y2="56" stroke="#232a42" strokeWidth="1"/>
             <line x1="100" y1="92" x2="600" y2="92" stroke="#232a42" strokeWidth="1"/>
             <line x1="100" y1="128" x2="600" y2="128" stroke="#232a42" strokeWidth="1"/>
             <line x1="100" y1="164" x2="600" y2="164" stroke="#232a42" strokeWidth="1"/>
 
             {/* Minor hour dividers (dashed / light lines) */}
             <g stroke="#1a2036" strokeWidth="1">
               <line x1="120.8" y1="20" x2="120.8" y2="164"/>
               <line x1="141.7" y1="20" x2="141.7" y2="164"/>
               <line x1="162.5" y1="20" x2="162.5" y2="164"/>
               <line x1="204.2" y1="20" x2="204.2" y2="164"/>
               <line x1="225" y1="20" x2="225" y2="164"/>
               <line x1="245.8" y1="20" x2="245.8" y2="164"/>
               <line x1="287.5" y1="20" x2="287.5" y2="164"/>
               <line x1="308.3" y1="20" x2="308.3" y2="164"/>
               <line x1="329.2" y1="20" x2="329.2" y2="164"/>
               <line x1="370.8" y1="20" x2="370.8" y2="164"/>
               <line x1="391.7" y1="20" x2="391.7" y2="164"/>
               <line x1="412.5" y1="20" x2="412.5" y2="164"/>
               <line x1="454.2" y1="20" x2="454.2" y2="164"/>
               <line x1="475" y1="20" x2="475" y2="164"/>
               <line x1="495.8" y1="20" x2="495.8" y2="164"/>
               <line x1="537.5" y1="20" x2="537.5" y2="164"/>
               <line x1="558.3" y1="20" x2="558.3" y2="164"/>
               <line x1="579.2" y1="20" x2="579.2" y2="164"/>
             </g>
 
             {/* Major hour dividers */}
             <g stroke="#2c3352" strokeWidth="1">
               <line x1="100" y1="20" x2="100" y2="164"/>
               <line x1="183.3" y1="20" x2="183.3" y2="164"/>
               <line x1="266.7" y1="20" x2="266.7" y2="164"/>
               <line x1="350" y1="20" x2="350" y2="164"/>
               <line x1="433.3" y1="20" x2="433.3" y2="164"/>
               <line x1="516.7" y1="20" x2="516.7" y2="164"/>
               <line x1="600" y1="20" x2="600" y2="164"/>
             </g>
 
             {/* Hour Labels */}
             <text x="100" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">mid</text>
             <text x="183.3" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">4</text>
             <text x="266.7" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">8</text>
             <text x="350" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">noon</text>
             <text x="433.3" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">4</text>
             <text x="516.7" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">8</text>
             <text x="600" y="180" font-size="10" fill="#8b93a7" text-anchor="middle">mid</text>
 
             {/* The Stepped Polyline */}
             {polylinePoints && (
               <polyline
                 points={polylinePoints}
                 fill="none"
                 stroke="#f2a93b"
                 strokeWidth="2.5"
                 strokeLinejoin="round"
               />
             )}
 
             {/* Transition dots */}
             {transitionCircles}
           </svg>
         </div>
       </div>
 
       {/* Stops List Card */}
       <div className="bg-surface border-[#232a42] border rounded-lg p-6">
         <h3 className="text-text font-display text-lg font-bold mb-4">
           Trip stops
         </h3>
 
         <div className="flex flex-col">
           {(!trip?.stops || trip.stops.length === 0) ? (
             <p className="text-text-muted text-sm py-4 text-center">No intermediate stops recorded for this route.</p>
           ) : (
             trip.stops.map((stop, idx) => {
               if (!stop || !stop.location) {
                 return null;
               }
               const style = getStopStyle(stop.stop_type);
               const durationStr = formatStopDuration(stop.duration_hours);
               const dutyLabel = getStopDutyLabel(stop.stop_type, durationStr);
 
               return (
                 <div
                   key={stop.id}
                   className={`flex gap-4 py-3 items-center ${
                     idx < (trip.stops?.length ?? 0) - 1 ? "border-b border-[#1e2438]" : ""
                   }`}
                 >
                   {/* Category icon */}
                   <div
                     style={{ backgroundColor: style.bgColor }}
                     className="size-8 rounded-lg flex items-center justify-center shrink-0"
                   >
                     {style.icon}
                   </div>
 
                   {/* Stop detail */}
                   <div className="flex-1 min-w-0">
                     <div className="text-text text-sm font-semibold capitalize">
                       {stop.stop_type_display || stop.stop_type || "Stop"}
                     </div>
                     <div className="text-text-muted text-xs truncate mt-0.5" title={stop.location.display_name || ""}>
                       {stop.location.place_name || stop.location.display_name || "Unknown"}
                     </div>
                   </div>
 
                   {/* Time and HOS category */}
                   <div className="text-right shrink-0">
                     <div className="text-text font-mono text-xs">
                       {formatTimeRange(stop.arrival_time, stop.departure_time)}
                     </div>
                     <div className="text-text-muted text-[11px] mt-0.5">
                       {dutyLabel}
                     </div>
                   </div>
                 </div>
               );
             })
           )}
         </div>
       </div>
    </div>
  );
};