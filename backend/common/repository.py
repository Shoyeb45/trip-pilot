from .models import Location, LocationRoute


class CommonRepository:
    @staticmethod
    def get_or_create_location(data: dict) -> Location:
        place_id = data.get("place_id")

        parts = []

        if data.get("city"):
            parts.append(data.get("city"))

        if data.get("state"):
            parts.append(data.get("state"))

        if data.get("country"):
            parts.append(data.get("country"))

        data["display_name"] = ", ".join(parts)

        if place_id:
            location, _ = Location.objects.get_or_create(
                place_id=place_id, defaults=data
            )
            return location
        return Location.objects.create(**data)

    @staticmethod
    def get_location_route(start_id: str, end_id: str):
        try:
            return LocationRoute.objects.get(
                start_location_id=start_id, end_location_id=end_id
            )
        except:
            return None

    @staticmethod
    def create_location_route(**kwargs) -> LocationRoute:
        return LocationRoute.objects.create(**kwargs)
