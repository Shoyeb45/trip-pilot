import uuid

from django.db import models


class TimeStampedModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class Location(TimeStampedModel):
    display_name = models.CharField(max_length=255)

    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100)
    country_code = models.CharField(max_length=2)
    pincode = models.CharField(max_length=10, blank=True)
    
    latitude = models.FloatField()
    longitude = models.FloatField()

    place_id = models.CharField(max_length=100, unique=True)


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
    GENERATING_ROUTE = 'generating_route', "Generating Route"
    # stops - fuel or rest
    GENERATING_FUEL_STOPS = 'generating_fuel_stops', "Generating Fuel Stops"
    GENERATING_REST_STOPS = 'generating_rest_stops', "Generating Rest Stops"

    # generating logs
    GENERATING_LOGS = 'generating_logs', "Generating Logs"
    GENERATION_COMPLETED = 'generation_completed', "Generation Completed"

class ViolationType(models.TextChoices):
    DAILY_DRIVING_LIMIT = "daily_driving_limit", "Daily Driving Limit Exceeded"
    DRIVING_WINDOW_14HR = "driving_window_14hr", "14-Hour Window Exceeded"
    BREAK_REQUIRED = "break_required", "30-Minute Break Required"
    CYCLE_HOURS_EXCEEDED = "cycle_hours_exceeded", "70-Hour/8-Day Cycle Exceeded"
    INSUFFICIENT_RESET = "insufficient_reset", "Insufficient 10-Hour Reset"
