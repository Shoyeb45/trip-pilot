"""
services/places_service.py
--------------------------
Finds nearby Points of Interest (gas stations, motels/hotels) along the
route using the OpenStreetMap Overpass API.

CACHING STRATEGY
~~~~~~~~~~~~~~~~
All found places are persisted as `Location` rows with the appropriate
`location_type` (GAS_STATION or MOTEL_HOTEL).  Before every Overpass
request, the service queries the DB for any cached POI within a bounding
box.  A cache hit avoids the API call entirely — critical for conserving
the limited GraphHopper (and Overpass) rate-limit budget.

Cache key = (location_type, lat ± CACHE_DEGREE_RADIUS, lon ± CACHE_DEGREE_RADIUS).
CACHE_DEGREE_RADIUS ≈ 0.15° ≈ ~10 miles — wide enough to absorb minor
route-position differences between trips while still being a meaningful
fuel/rest location.
"""

import logging
import hashlib

import httpx

from common.models import Location, LocationType

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
SEARCH_RADIUS_METERS = 16_000  # 10-mile search radius around the target point
CACHE_DEGREE_RADIUS = 0.15  # ~10 miles in degrees (lat/lon approx)
HTTP_TIMEOUT_SECONDS = 15

_http_client = httpx.Client(timeout=HTTP_TIMEOUT_SECONDS)


# ── Internal helpers ────────────────────────────────────────────────────────


def _osm_place_id(osm_type: str, osm_id: int) -> str:
    """Build a stable place_id string from an OSM element type and numeric ID."""
    return f"osm:{osm_type}/{osm_id}"


def _synthetic_place_id(lat: float, lon: float, location_type: str) -> str:
    """
    Fallback place_id for highway locations with no OSM result.
    Uses a hash of the rounded coordinates + type so the unique constraint
    on Location.place_id is still satisfied.
    """
    key = f"{location_type}:{lat:.4f},{lon:.4f}"
    return "synthetic:" + hashlib.md5(key.encode()).hexdigest()


def _check_db_cache(lat: float, lon: float, location_type: str) -> Location | None:
    """
    Return a cached Location of the given type near (lat, lon), or None.
    Uses a bounding-box approximation — fast, index-friendly query.
    """
    qs = Location.objects.filter(
        location_type=location_type,
        latitude__range=(lat - CACHE_DEGREE_RADIUS, lat + CACHE_DEGREE_RADIUS),
        longitude__range=(lon - CACHE_DEGREE_RADIUS, lon + CACHE_DEGREE_RADIUS),
    )
    # Pick the geographically closest result using a simple Manhattan-distance sort
    # (no PostGIS required)
    results = list(qs[:20])
    if not results:
        return None
    closest = min(
        results, key=lambda loc: abs(loc.latitude - lat) + abs(loc.longitude - lon)
    )
    logger.debug(
        "Cache HIT for %s near (%.4f, %.4f) → %s",
        location_type,
        lat,
        lon,
        closest.place_id,
    )
    return closest


def _query_overpass(lat: float, lon: float, amenity_tags: list[str]) -> list[dict]:
    """
    Query the Overpass API for nodes matching any of the given amenity tags
    within SEARCH_RADIUS_METERS of (lat, lon).

    Returns a list of dicts with keys: osm_type, osm_id, name, lat, lon,
    display_name, city, state, country, country_code.
    """
    tag_union = "\n".join(
        f'  node["{tag_key}"="{tag_val}"](around:{SEARCH_RADIUS_METERS},{lat},{lon});'
        for tag_key, tag_val in amenity_tags
    )
    query = f"[out:json][timeout:10];\n(\n{tag_union}\n);\nout body 5;"

    try:
        response = _http_client.post(OVERPASS_API_URL, data={"data": query})
        response.raise_for_status()
        elements = response.json().get("elements", [])
    except Exception as exc:
        logger.warning("Overpass API error for (%s, %s): %s", lat, lon, exc)
        return []

    results = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "")
        results.append(
            {
                "osm_type": el.get("type", "node"),
                "osm_id": el.get("id"),
                "name": name,
                "lat": el.get("lat", lat),
                "lon": el.get("lon", lon),
                # Address components from OSM tags (may be absent)
                "city": tags.get("addr:city", ""),
                "state": tags.get("addr:state", ""),
                "country": tags.get("addr:country", ""),
                "country_code": tags.get("addr:country_code", ""),
            }
        )
    return results


def _persist_location(
    *,
    lat: float,
    lon: float,
    place_id: str,
    place_name: str,
    location_type: str,
    city: str = "",
    state: str = "",
    country: str = "",
    country_code: str = "",
) -> Location:
    """Get-or-create a Location row for a POI."""
    parts = [p for p in (city, state, country) if p]
    display_name = place_name or (
        ", ".join(parts) if parts else f"{lat:.4f}, {lon:.4f}"
    )

    location, created = Location.objects.get_or_create(
        place_id=place_id,
        defaults={
            "display_name": display_name,
            "place_name": place_name,
            "location_type": location_type,
            "latitude": lat,
            "longitude": lon,
            "city": city,
            "state": state,
            "country": country,
            "country_code": country_code,
        },
    )
    if created:
        logger.debug(
            "Persisted new %s location: %s (place_id=%s)",
            location_type,
            display_name,
            place_id,
        )
    return location


# ── Public API ──────────────────────────────────────────────────────────────


def find_nearest_gas_station(lat: float, lon: float) -> Location:
    """
    Return a Location representing the nearest gas station to (lat, lon).

    Algorithm:
    1. Check DB cache (Location rows with location_type=GAS_STATION within
       ±CACHE_DEGREE_RADIUS).  Cache hit → return immediately (no API call).
    2. Query Overpass API for OSM nodes tagged amenity=fuel.
    3. Persist the best result as a Location row and return it.
    4. If Overpass returns nothing, create a synthetic Location at the
       exact route coordinate (still logged as On Duty / fuel stop).
    """
    # 1. Cache lookup
    cached = _check_db_cache(lat, lon, LocationType.GAS_STATION)
    if cached:
        return cached

    # 2. Overpass query
    logger.info("Overpass query: gas station near (%.4f, %.4f)", lat, lon)
    elements = _query_overpass(lat, lon, [("amenity", "fuel")])

    if elements:
        # Pick the geographically closest result
        best = min(elements, key=lambda e: abs(e["lat"] - lat) + abs(e["lon"] - lon))
        place_id = _osm_place_id(best["osm_type"], best["osm_id"])
        return _persist_location(
            lat=best["lat"],
            lon=best["lon"],
            place_id=place_id,
            place_name=best["name"] or "Gas Station",
            location_type=LocationType.GAS_STATION,
            city=best["city"],
            state=best["state"],
            country=best["country"],
            country_code=best["country_code"],
        )

    # 4. Synthetic fallback (no API result)
    logger.warning(
        "No gas station found via Overpass near (%.4f, %.4f); using synthetic location",
        lat,
        lon,
    )
    place_id = _synthetic_place_id(lat, lon, LocationType.GAS_STATION)
    return _persist_location(
        lat=lat,
        lon=lon,
        place_id=place_id,
        place_name="Fuel Stop",
        location_type=LocationType.GAS_STATION,
    )


def find_nearest_motel(lat: float, lon: float) -> Location:
    """
    Return a Location representing the nearest motel or hotel to (lat, lon).

    Searches OSM for:
      - tourism=motel
      - tourism=hotel
      - tourism=hostel

    Same 4-step cache → query → persist → fallback pattern as
    find_nearest_gas_station().
    """
    # 1. Cache lookup
    cached = _check_db_cache(lat, lon, LocationType.MOTEL_HOTEL)
    if cached:
        return cached

    # 2. Overpass query — try motel first, then hotel, then hostel
    logger.info("Overpass query: motel/hotel near (%.4f, %.4f)", lat, lon)
    elements = _query_overpass(
        lat,
        lon,
        [("tourism", "motel"), ("tourism", "hotel"), ("tourism", "hostel")],
    )

    if elements:
        best = min(elements, key=lambda e: abs(e["lat"] - lat) + abs(e["lon"] - lon))
        place_id = _osm_place_id(best["osm_type"], best["osm_id"])
        return _persist_location(
            lat=best["lat"],
            lon=best["lon"],
            place_id=place_id,
            place_name=best["name"] or "Motel",
            location_type=LocationType.MOTEL_HOTEL,
            city=best["city"],
            state=best["state"],
            country=best["country"],
            country_code=best["country_code"],
        )

    # 4. Synthetic fallback
    logger.warning(
        "No motel found via Overpass near (%.4f, %.4f); using synthetic location",
        lat,
        lon,
    )
    place_id = _synthetic_place_id(lat, lon, LocationType.MOTEL_HOTEL)
    return _persist_location(
        lat=lat,
        lon=lon,
        place_id=place_id,
        place_name="Rest Stop",
        location_type=LocationType.MOTEL_HOTEL,
    )
