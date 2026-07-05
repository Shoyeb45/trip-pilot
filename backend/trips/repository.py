from common.repository import CommonRepository
from .models import Trip


class TripRepository:
    @staticmethod
    def create_trip(validated_data: dict, driver) -> Trip:
        current_location = CommonRepository.get_or_create_location(
            validated_data.pop("current_location")
        )
        pickup_location = CommonRepository.get_or_create_location(
            validated_data.pop("pickup_location")
        )
        drop_location = CommonRepository.get_or_create_location(
            validated_data.pop("drop_location")
        )

        return Trip.objects.create(
            driver=driver,
            current_location=current_location,
            pickup_location=pickup_location,
            drop_location=drop_location,
            **validated_data
        )
