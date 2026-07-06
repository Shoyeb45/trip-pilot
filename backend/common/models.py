import uuid

from django.db import models
from django.db.models import Index


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class LocationType(models.TextChoices):
    WAYPOINT = "waypoint", "Waypoint"
    GAS_STATION = "gas_station", "Gas Station"
    MOTEL_HOTEL = "motel_hotel", "Motel / Hotel"
    REST_AREA = "rest_area", "Rest Area"


class Location(TimeStampedModel):
    display_name = models.CharField(max_length=255)

    # For named POIs (gas stations, motels): store the business name separately
    place_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Business name (e.g. 'Shell Station', 'Comfort Inn')",
    )

    location_type = models.CharField(
        max_length=20,
        choices=LocationType.choices,
        default=LocationType.WAYPOINT,
        db_index=True,
    )

    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    country_code = models.CharField(max_length=2, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    latitude = models.FloatField()
    longitude = models.FloatField()

    place_id = models.CharField(max_length=200, unique=True)

    class Meta:
        db_table = "locations"
        indexes = [
            Index(fields=["location_type", "latitude", "longitude"]),
        ]


class LocationRoute(TimeStampedModel):

    start_location = models.ForeignKey(
        Location,  # Use string reference if Location is defined later
        on_delete=models.PROTECT,
        related_name="location_start",
    )
    end_location = models.ForeignKey(
        Location, on_delete=models.PROTECT, related_name="location_end"
    )

    distance = models.FloatField(help_text="Distance in meters")
    time = models.FloatField(help_text="Time in milliseconds")

    points_encoded = models.TextField(help_text="Encoded polyline string")

    bbox = models.JSONField(help_text="Bounding box coordinates")

    max_speed = models.FloatField(blank=True, null=True)
    average_speed = models.FloatField(blank=True, null=True)

    class Meta:
        db_table = "location_routes"
        verbose_name = "Location Route"
        verbose_name_plural = "Location Routes"

    def __str__(self):
        return f"Route {self.id} ({self.distance/1000:.2f} km)"


class DutyStatus(models.TextChoices):
    OFF_DUTY = "off_duty", "Off Duty"
    SLEEPER_BERTH = "sleeper_berth", "Sleeper Berth"
    DRIVING = "driving", "Driving"
    ON_DUTY = "on_duty", "On Duty (Not Driving)"


class StopType(models.TextChoices):
    PICKUP = "pickup", "Pickup"
    DROPOFF = "dropoff", "Drop-off"
    FUEL = "fuel", "Fuel Stop"
    REST_BREAK = "rest_break", "30-Minute Rest Break"
    SLEEPER_RESET = "sleeper_reset", "10-Hour Sleeper Berth Reset"
    RESTART_34HR = "restart_34hr", "34-Hour Restart"


class TripStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    CALCULATING = "calculating", "Calculating"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class GenerateStage(models.TextChoices):
    #  route, distance and time
    GENERATING_ROUTE = "generating_route", "Generating Route"
    # stops - fuel or rest
    GENERATING_FUEL_STOPS = "generating_fuel_stops", "Generating Fuel Stops"
    GENERATING_REST_STOPS = "generating_rest_stops", "Generating Rest Stops"

    # generating logs
    GENERATING_LOGS = "generating_logs", "Generating Logs"
    GENERATION_COMPLETED = "generation_completed", "Generation Completed"


class ViolationType(models.TextChoices):
    DAILY_DRIVING_LIMIT = "daily_driving_limit", "Daily Driving Limit Exceeded"
    DRIVING_WINDOW_14HR = "driving_window_14hr", "14-Hour Window Exceeded"
    BREAK_REQUIRED = "break_required", "30-Minute Break Required"
    CYCLE_HOURS_EXCEEDED = "cycle_hours_exceeded", "70-Hour/8-Day Cycle Exceeded"
    INSUFFICIENT_RESET = "insufficient_reset", "Insufficient 10-Hour Reset"
