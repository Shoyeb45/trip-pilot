import math
from typing import Sequence

import polyline as polyline_lib

# ── Decoding ────────────────────────────────────────────────────────────────


def decode_polyline(encoded: str) -> list[tuple[float, float]]:
    if not encoded:
        return []
    return polyline_lib.decode(encoded, geojson=False)



_EARTH_RADIUS_MILES = 3_958.8


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return 2 * _EARTH_RADIUS_MILES * math.asin(math.sqrt(a))


def build_cumulative_distances(
    points: Sequence[tuple[float, float]],
) -> list[float]:
    cumulative = [0.0]
    for i in range(1, len(points)):
        lat1, lon1 = points[i - 1]
        lat2, lon2 = points[i]
        cumulative.append(cumulative[-1] + haversine_miles(lat1, lon1, lat2, lon2))
    return cumulative



def interpolate_position(
    points: Sequence[tuple[float, float]],
    cumulative_distances: Sequence[float],
    target_miles: float,
) -> tuple[float, float]:
    if not points:
        raise ValueError("Empty points list passed to interpolate_position()")

    total_miles = cumulative_distances[-1]

    if target_miles <= 0.0:
        return points[0]
    if target_miles >= total_miles:
        return points[-1]

    lo, hi = 0, len(cumulative_distances) - 1
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        if cumulative_distances[mid] <= target_miles:
            lo = mid
        else:
            hi = mid

    seg_start_miles = cumulative_distances[lo]
    seg_end_miles = cumulative_distances[hi]
    seg_length = seg_end_miles - seg_start_miles

    if seg_length < 1e-9:
        return points[lo]

    # Linear interpolation fraction within the segment
    frac = (target_miles - seg_start_miles) / seg_length

    lat1, lon1 = points[lo]
    lat2, lon2 = points[hi]
    return (
        lat1 + frac * (lat2 - lat1),
        lon1 + frac * (lon2 - lon1),
    )
