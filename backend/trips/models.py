from django.db import models
from common.models import Location, TimeStampedModel, TripStatus
from user.models import User


class Trip(TimeStampedModel):
    current_location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="current_loc_trips"
    )
    pickup_location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="pickup_loc_trip"
    )
    drop_location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="drop_loc_trips"
    )
    truck_number = models.IntegerField()
    tailor_number = models.IntegerField()
    trip_status = models.CharField(
        max_length=20, choices=TripStatus.choices, default=TripStatus.DRAFT
    )
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="trips",
    )

    class Meta:
        db_table = "trips"
