import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import type { TripDetail } from "../../types/trip";
import { Map } from "lucide-react";

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);

  return null;
};

const fuelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="9" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/><rect width="4" height="3" x="6" y="5" rx="1"/></svg>`;

const zapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;

const startSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;

const flagSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;

const endSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;

const createPinIcon = (colorHex: string, iconSvg: string) => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 32px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 3px 4px rgba(0, 0, 0, 0.4));">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 11.25 16 24 16 24s16-12.75 16-24C32 7.16 24.84 0 16 0z" fill="${colorHex}"/>
          <circle cx="16" cy="16" r="10" fill="#ffffff"/>
        </svg>
        <div style="position: absolute; top: 8px; left: 8px; color: ${colorHex}; display: flex; align-items: center; justify-content: center; width: 16px; height: 16px;">
          ${iconSvg}
        </div>
      </div>
    `,
    className: "custom-pin-icon",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36]
  });
};

const currentIcon = createPinIcon("#38bdf8", startSvg); // Sky blue with arrow
const pickupIcon = createPinIcon("#fbbf24", flagSvg); // Amber yellow with flag
const dropIcon = createPinIcon("#10b981", endSvg); // Emerald green with check
const fuelIcon = createPinIcon("#f97316", fuelSvg); // Orange pin with fuel pump
const restIcon = createPinIcon("#6366f1", zapSvg); // Indigo pin with zap/energy bolt

interface TripMapProps {
  trip: TripDetail;
}

export function TripMap({ trip }: TripMapProps) {
  const [showFuelStops, setShowFuelStops] = useState(false);
  const [showRestStops, setShowRestStops] = useState(false);
  const fuelStopsCount = (trip.stops || []).filter(s => s.stop_type === "fuel").length;
  const restStopsCount = (trip.stops || []).filter(s =>
    ["rest_break", "sleeper_reset", "restart_34hr"].includes(s.stop_type) && s.location
  ).length;

  // Decode polylines
  const currToPickupCoords = trip.curr_to_pickup?.points_encoded
    ? (polyline.decode(trip.curr_to_pickup.points_encoded) as [
        number,
        number,
      ][])
    : [];

  const pickupToDropCoords = trip.pickup_to_drop?.points_encoded
    ? (polyline.decode(trip.pickup_to_drop.points_encoded) as [
        number,
        number,
      ][])
    : [];

  // Combine coordinates for fitting bounds
  const allCoords = [...currToPickupCoords, ...pickupToDropCoords];

  // All marker locations
  const markerCoords: [number, number][] = [
    [trip.current_location.latitude, trip.current_location.longitude],
    [trip.pickup_location.latitude, trip.pickup_location.longitude],
    [trip.drop_location.latitude, trip.drop_location.longitude],
  ];

  // Default center if no coordinates are available
  const defaultCenter: [number, number] = [
    trip.current_location.latitude,
    trip.current_location.longitude,
  ];

  return (
    <div className="bg-surface border-border flex flex-col gap-6 rounded-lg border p-6">
      <div className="flex items-center gap-2 text-amber-500">
        <Map className="size-5" />
        <h2 className="text-text font-display text-lg font-bold">Map</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Filters Row */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFuelStops(!showFuelStops)}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              showFuelStops
                ? "bg-[#1e293b] border-primary text-primary"
                : "bg-surface-elevated border-border text-text-muted hover:text-text"
            }`}
          >
            <span>Fuel stops</span>
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                showFuelStops
                  ? "bg-primary text-black"
                  : "bg-border text-text-muted"
              }`}
            >
              {fuelStopsCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowRestStops(!showRestStops)}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              showRestStops
                ? "bg-[#1e293b] border-primary text-primary"
                : "bg-surface-elevated border-border text-text-muted hover:text-text"
            }`}
          >
            <span>Rest stops</span>
            <span
              className={`flex size-5 items-center justify-center rounded-full text-[10px] ${
                showRestStops
                  ? "bg-primary text-black"
                  : "bg-border text-text-muted"
              }`}
            >
              {restStopsCount}
            </span>
          </button>
        </div>

        {/* Leaflet Map */}
        <div className="relative h-112.5 w-full overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-inner">
          <MapContainer
            center={allCoords.length > 0 ? allCoords[0] : defaultCenter}
            zoom={8}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Current Location Marker */}
            <Marker
              position={[
                trip.current_location.latitude,
                trip.current_location.longitude,
              ]}
              icon={currentIcon}
            >
              <Popup>
                <div className="font-body text-sm font-semibold text-[#38bdf8]">
                  Current: {trip.current_location.display_name}
                </div>
              </Popup>
            </Marker>

            {/* Pickup Location Marker */}
            <Marker
              position={[
                trip.pickup_location.latitude,
                trip.pickup_location.longitude,
              ]}
              icon={pickupIcon}
            >
              <Popup>
                <div className="font-body text-sm font-semibold text-primary">
                  Pickup: {trip.pickup_location.display_name}
                </div>
              </Popup>
            </Marker>

            {/* Drop Location Marker */}
            <Marker
              position={[
                trip.drop_location.latitude,
                trip.drop_location.longitude,
              ]}
              icon={dropIcon}
            >
              <Popup>
                <div className="font-body text-sm font-semibold text-[#10b981]">
                  Drop-off: {trip.drop_location.display_name}
                </div>
              </Popup>
            </Marker>

            {/* Route 1: Current to Pickup (Solid Blue line) */}
            {currToPickupCoords.length > 0 && (
              <Polyline
                positions={currToPickupCoords}
                pathOptions={{ color: "#3b82f6", weight: 4.5, opacity: 0.9 }}
              />
            )}

            {/* Route 2: Pickup to Drop (Solid Indigo line) */}
            {pickupToDropCoords.length > 0 && (
              <Polyline
                positions={pickupToDropCoords}
                pathOptions={{ color: "#6366f1", weight: 4.5, opacity: 0.9 }}
              />
            )}

            {/* Intermediate Stops */}
            {(trip.stops || []).map((stop) => {
              if (!stop.location) {
                return ;
              }
              const isFuel = stop.stop_type === "fuel";
              const isRest = ["rest_break", "sleeper_reset", "restart_34hr"].includes(stop.stop_type);

              if (isFuel && !showFuelStops) return null;
              if (isRest && !showRestStops) return null;

              if (stop.stop_type === "pickup" || stop.stop_type === "dropoff") {
                return null;
              }

              const icon = isFuel ? fuelIcon : restIcon;
              const titleColor = isFuel ? "text-orange-400" : "text-indigo-400";
              const typeLabel = stop.stop_type_display;

              return (
                <Marker
                  key={stop.id}
                  position={[stop.location?.latitude, stop.location?.longitude]}
                  icon={icon}
                >
                  <Popup>
                    <div className="font-body text-sm font-semibold flex flex-col gap-1 min-w-[200px]">
                      <span className={`${titleColor} font-bold text-xs uppercase tracking-wider`}>
                        Stop #{stop.sequence} &middot; {typeLabel}
                      </span>
                      <span className="text-text font-semibold text-sm">
                        {stop.location?.place_name || stop.location?.display_name}
                      </span>
                      {stop.location?.place_name && (
                        <span className="text-text-muted text-xs">
                          {stop.location?.display_name}
                        </span>
                      )}
                      <div className="text-text-muted text-xs mt-1.5 border-t border-border/40 pt-1.5 flex flex-col gap-0.5">
                        <span>Arrival: {new Date(stop.arrival_time).toLocaleString()}</span>
                        <span>Duration: {stop.duration_hours.toFixed(1)} hrs</span>
                        {stop.remarks && <span>Remarks: {stop.remarks}</span>}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Auto bounds zoom - fits to routes, or all markers if routes not ready */}
            <FitBounds
              points={allCoords.length > 0 ? allCoords : markerCoords}
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
