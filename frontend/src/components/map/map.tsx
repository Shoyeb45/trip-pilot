import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Helper to fit the map to the route bounds
const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length > 0) {
      // Create a LatLngBounds object and extend it with all points
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
    }
  }, [map, points]);

  return null;
};

interface RouteData {
  paths: {
    points: {
      coordinates: [number, number][]; // [lon, lat]
    };
  }[];
}

export const RouteMap = ({ routeData }: { routeData: RouteData }) => {
  if (!routeData || !routeData.paths || routeData.paths.length === 0) {
    return <div>No route data available</div>;
  }

  // Extract coordinates and swap [lon, lat] to [lat, lon] for Leaflet
  const rawCoordinates = routeData.paths[0]?.points?.coordinates || [];
  const leafletCoordinates: [number, number][] = rawCoordinates.map(
    ([lon, lat]) => [lat, lon],
  );

  return (
    <MapContainer
      center={[23.15, 69.9]} // Initial center (approximate middle of your route)
      zoom={10}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Render the route line */}
      <Polyline
        positions={leafletCoordinates}
        pathOptions={{ color: "blue", weight: 4 }}
      />

      {/* Automatically adjust zoom/center to show the whole route */}
      <FitBounds points={leafletCoordinates} />
    </MapContainer>
  );
};
