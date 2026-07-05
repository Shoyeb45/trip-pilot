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

// Helper to fit the map to the route bounds
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

// Create custom marker icons using Leaflet DivIcon
const createMarkerIcon = (colorHex: string) => {
  return L.divIcon({
    html: `<div style="display: flex; align-items: center; justify-content: center;">
             <div style="
               width: 14px;
               height: 14px;
               border-radius: 50%;
               border: 2.5px solid #ffffff;
               background-color: ${colorHex};
               box-shadow: 0 2px 4px rgba(0,0,0,0.3);
             "></div>
           </div>`,
    className: "custom-div-icon",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const currentIcon = createMarkerIcon("#38bdf8"); // Sky blue
const pickupIcon = createMarkerIcon("#fbbf24"); // Amber yellow
const dropIcon = createMarkerIcon("#10b981"); // Emerald green

interface TripMapProps {
  trip: TripDetail;
}

export function TripMap({ trip }: TripMapProps) {
  const [showFuelStops, setShowFuelStops] = useState(false);
  const [showRestStops, setShowRestStops] = useState(false);

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
            2
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
            1
          </span>
        </button>
      </div>

      {/* Leaflet Map */}
      <div className="relative h-[450px] w-full overflow-hidden rounded-lg border border-border bg-surface-elevated shadow-inner">
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

          {/* Auto bounds zoom - fits to routes, or all markers if routes not ready */}
          <FitBounds points={allCoords.length > 0 ? allCoords : markerCoords} />
        </MapContainer>
      </div>
    </div>
  );
}
