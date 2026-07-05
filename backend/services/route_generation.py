from common.models import Location, LocationRoute
from trips.models import Trip
from common.repository import CommonRepository
from config.env_utils import getenv_with_default
import httpx
import json

GRASSHOPPER_API_KEY = getenv_with_default("GRAPHHOPPER_API_KEY")
GRASSHOPPER_API_ENDPOINT = "https://graphhopper.com/api/1"

http_client = httpx.Client()


def get_route_detail(trip: Trip):
    # first find the route for the curr -> pickup
    # handle if both are the same
    curr_to_pickup = get_route(trip.current_location, trip.pickup_location)
    pickup_to_drop = get_route(trip.pickup_location, trip.drop_location)

    # update the Trip model to reference the curr_to_pickup and pickup_to_drop it should point to the LocationRoutes
    trip.curr_to_pickup = curr_to_pickup
    trip.pickup_to_drop = pickup_to_drop
    trip.save()

    return curr_to_pickup, pickup_to_drop


def get_route(start_location: Location, end_location: Location):
    if start_location.id == end_location.id:
        route_detail = CommonRepository.get_location_route(
            start_location.id, end_location.id
        )
        if route_detail:
            return route_detail

        # Create a zero-distance route if start and end locations are the same
        route_detail = CommonRepository.create_location_route(
            start_location=start_location,
            end_location=end_location,
            distance=0.0,
            time=0.0,
            points_encoded="",
            bbox=[
                start_location.longitude,
                start_location.latitude,
                start_location.longitude,
                start_location.latitude,
            ],
            max_speed=0.0,
            average_speed=0.0,
        )
        return route_detail

    route_detail = CommonRepository.get_location_route(
        start_location.id, end_location.id
    )

    if route_detail:
        return route_detail

    # call map api
    # create LocationRoute entry and return the object, update the common repo for this
    url = GRASSHOPPER_API_ENDPOINT + "/route?key=" + GRASSHOPPER_API_KEY

    body = {
        "points": [
            [start_location.longitude, start_location.latitude],
            [end_location.longitude, end_location.latitude],
        ],
        "profile": "car",
        "locale": "en",
        "calc_points": True,
        "points_encoded": True,
        "instructions": True,
        "details": ["road_class", "surface", "average_speed", "max_speed"],
        "snap_preventions": ["ferry"],
    }

    headers = {"Content-Type": "application/json"}
    response = http_client.post(url, json=body, headers=headers, timeout=10)
    response.raise_for_status()
    data = response.json()

    paths = data.get("paths", [])
    if not paths:
        raise ValueError("No paths returned from GraphHopper API")

    path = paths[0]
    distance = path.get("distance")
    time = path.get("time")
    points_encoded = path.get("points")
    bbox = path.get("bbox")

    # Extract max_speed and average_speed from details
    details = path.get("details", {})

    max_speeds = details.get("max_speed", [])
    valid_max_speeds = [val for _, _, val in max_speeds if val is not None]
    max_speed = max(valid_max_speeds) if valid_max_speeds else None

    avg_speeds = details.get("average_speed", [])
    valid_avg_speeds = [val for _, _, val in avg_speeds if val is not None]
    if valid_avg_speeds:
        average_speed = sum(valid_avg_speeds) / len(valid_avg_speeds)
    else:
        if time and time > 0:
            average_speed = (distance / 1000.0) / (time / 3600000.0)
        else:
            average_speed = None

    route_detail = CommonRepository.create_location_route(
        start_location=start_location,
        end_location=end_location,
        distance=distance,
        time=time,
        points_encoded=points_encoded,
        bbox=bbox,
        max_speed=max_speed,
        average_speed=average_speed,
    )
    return route_detail
