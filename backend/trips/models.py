from django.db import models
from django.utils import timezone
from common.models import Location, LocationRoute, TimeStampedModel, TripStatus, GenerateStage
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
    generate_stage = models.CharField(
        max_length=50, choices=GenerateStage.choices, blank=True
    )
    start_date = models.DateTimeField(default=timezone.now, blank=True, null=True)
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="trips",
    )

    # route detail
    curr_to_pickup = models.ForeignKey(
        LocationRoute,
        on_delete=models.PROTECT,
        related_name="curr_to_pickup_relation",
        null=True,
        blank=True,
    )
    pickup_to_drop = models.ForeignKey(
        LocationRoute,
        on_delete=models.PROTECT,
        related_name="pickup_to_drop_relation",
        null=True,
        blank=True,
    )
    class Meta:
        db_table = "trips"
