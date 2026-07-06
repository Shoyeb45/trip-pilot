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
import { Fuel, Map, Sun } from "lucide-react";
import { currentIcon, dropIcon, fuelIcon, pickupIcon, restIcon } from "../../constants/map-icons";

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    const validPoints = points.filter(p => p && !isNaN(p[0]) && !isNaN(p[1]));
    if (validPoints.length > 0) {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);

  return null;
};


interface TripMapProps {
  trip: TripDetail;
}

export function TripMap({ trip }: TripMapProps) {
  const [showFuelStops, setShowFuelStops] = useState(false);
  const [showRestStops, setShowRestStops] = useState(false);
  const fuelStopsCount = (trip?.stops || []).filter(s => s && s.stop_type === "fuel").length;
  const restStopsCount = (trip?.stops || []).filter(s =>
    s && ["rest_break", "sleeper_reset", "restart_34hr"].includes(s.stop_type) && s.location
  ).length;

  // Decode polylines
  const currToPickupCoords = trip?.curr_to_pickup?.points_encoded
    ? (polyline.decode(trip.curr_to_pickup.points_encoded) as [
        number,
        number,
      ][])
    : [];

  const pickupToDropCoords = trip?.pickup_to_drop?.points_encoded
    ? (polyline.decode(trip.pickup_to_drop.points_encoded) as [
        number,
        number,
      ][])
    : [];

  // Combine coordinates for fitting bounds
  const allCoords = [...currToPickupCoords, ...pickupToDropCoords];

  // All marker locations
  const markerCoords: [number, number][] = [];
  if (trip?.current_location?.latitude != null && trip?.current_location?.longitude != null) {
    markerCoords.push([trip.current_location.latitude, trip.current_location.longitude]);
  }
  if (trip?.pickup_location?.latitude != null && trip?.pickup_location?.longitude != null) {
    markerCoords.push([trip.pickup_location.latitude, trip.pickup_location.longitude]);
  }
  if (trip?.drop_location?.latitude != null && trip?.drop_location?.longitude != null) {
    markerCoords.push([trip.drop_location.latitude, trip.drop_location.longitude]);
  }

  // Default center if no coordinates are available
  const defaultCenter: [number, number] = markerCoords[0] || [39.8283, -98.5795];

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
            <div className="flex gap-2"><Fuel size={16} /> Fuel stops</div>
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
            <div className="flex gap-2"><Sun size={16} /> Rest stops</div>
            
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
            {trip?.current_location?.latitude != null && trip?.current_location?.longitude != null && (
              <Marker
                position={[
                  trip.current_location.latitude,
                  trip.current_location.longitude,
                ]}
                icon={currentIcon}
              >
                <Popup>
                  <div className="font-body text-sm font-semibold text-[#38bdf8]">
                    Current: {trip.current_location.display_name || "Unknown"}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Pickup Location Marker */}
            {trip?.pickup_location?.latitude != null && trip?.pickup_location?.longitude != null && (
              <Marker
                position={[
                  trip.pickup_location.latitude,
                  trip.pickup_location.longitude,
                ]}
                icon={pickupIcon}
              >
                <Popup>
                  <div className="font-body text-sm font-semibold text-primary">
                    Pickup: {trip.pickup_location.display_name || "Unknown"}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Drop Location Marker */}
            {trip?.drop_location?.latitude != null && trip?.drop_location?.longitude != null && (
              <Marker
                position={[
                  trip.drop_location.latitude,
                  trip.drop_location.longitude,
                ]}
                icon={dropIcon}
              >
                <Popup>
                  <div className="font-body text-sm font-semibold text-[#10b981]">
                    Drop-off: {trip.drop_location.display_name || "Unknown"}
                  </div>
                </Popup>
              </Marker>
            )}

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
            {(trip?.stops || []).map((stop) => {
              if (!stop || !stop.location || stop.location.latitude == null || stop.location.longitude == null) {
                return null;
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
              const typeLabel = stop.stop_type_display || stop.stop_type || "Stop";

              return (
                <Marker
                  key={stop.id}
                  position={[stop.location.latitude, stop.location.longitude]}
                  icon={icon}
                >
                  <Popup>
                    <div className="font-body text-sm font-semibold flex flex-col gap-1 min-w-50">
                      <span className={`${titleColor} font-bold text-xs uppercase tracking-wider`}>
                        Stop #{stop.sequence || 0} &middot; {typeLabel}
                      </span>
                      <span className="text-text font-semibold text-sm">
                        {stop.location.place_name || stop.location.display_name || "Unknown"}
                      </span>
                      {stop.location.place_name && stop.location.display_name && (
                        <span className="text-text-muted text-xs">
                          {stop.location.display_name}
                        </span>
                      )}
                      <div className="text-text-muted text-xs mt-1.5 border-t border-border/40 pt-1.5 flex flex-col gap-0.5">
                        <span>Arrival: {stop.arrival_time ? new Date(stop.arrival_time).toLocaleString() : "N/A"}</span>
                        <span>Duration: {(stop.duration_hours ?? 0).toFixed(1)} hrs</span>
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
