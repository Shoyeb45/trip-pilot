from .models import Location


class CommonRepository:
    @staticmethod
    def get_or_create_location(data: dict) -> Location:
        place_id = data.get('place_id')
        
        if place_id:
            location, _ = Location.objects.get_or_create(
                place_id=place_id,
                defaults=data
            )
            return location
        return Location.objects.create(**data)