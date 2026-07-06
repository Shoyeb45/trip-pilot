from django.db import models
from django.utils import timezone
from common.models import (
    Location,
    LocationRoute,
    TimeStampedModel,
    TripStatus,
    GenerateStage,
    DutyStatus,
    StopType,
    ViolationType,
)
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

    # ----------------------------------------------------------------
    # Computed totals — populated after stop + ELD generation completes
    # NOTE: cycle_hours_used is NOT stored here. It is calculated
    # dynamically from ELDDailyLog.total_on_duty_hours of the driver's
    # previous trips within the rolling 8-day window.
    # ----------------------------------------------------------------
    total_distance_miles = models.FloatField(
        null=True,
        blank=True,
        help_text="Total trip distance in miles (both legs combined)",
    )
    total_driving_hours = models.FloatField(
        null=True,
        blank=True,
        help_text="Sum of all DRIVING DutyLogEntry durations",
    )
    total_on_duty_hours = models.FloatField(
        null=True,
        blank=True,
        help_text="DRIVING + ON_DUTY hours (counts toward 70-hr cycle)",
    )
    total_rest_hours = models.FloatField(
        null=True,
        blank=True,
        help_text="OFF_DUTY + SLEEPER_BERTH hours",
    )
    estimated_arrival = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Estimated wall-clock arrival at the drop-off location",
    )

    class Meta:
        db_table = "trips"


class TripStop(TimeStampedModel):
    """
    Represents a discrete pause or activity at a point along the route:
    pickup, drop-off, fuel stop (at a real gas station), rest break, or
    sleeper-berth reset (at a real motel/hotel).

    `location` is always populated — either a named waypoint (pickup/dropoff)
    or a POI found via the places service (gas station / motel).

    `odometer_start` / `odometer_end` track cumulative trip miles at each
    stop so the scheduling engine can insert fuel stops at every 1,000-mile
    mark without re-querying the map API.
    """

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="stops")

    stop_type = models.CharField(
        max_length=30,
        choices=StopType.choices,
        db_index=True,
    )

    # Always a real Location (waypoint or POI fetched from the places service)
    location = models.ForeignKey(
        Location,
        on_delete=models.PROTECT,
        related_name="trip_stops",
        null=True,
        blank=True,
    )

    # Absolute wall-clock times anchored to trip.start_date
    arrival_time = models.DateTimeField()
    departure_time = models.DateTimeField()
    duration_hours = models.FloatField(
        help_text="(departure - arrival) in hours — denormalised for fast queries"
    )

    # Cumulative trip odometer (miles) at arrival / departure
    odometer_start = models.FloatField(
        default=0.0,
        help_text="Cumulative trip miles at arrival at this stop",
    )
    odometer_end = models.FloatField(
        default=0.0,
        help_text="Cumulative trip miles at departure from this stop (= odometer_start for most stops)",
    )

    # Deterministic ordering within the trip
    sequence = models.PositiveIntegerField(db_index=True)

    # ELD remarks: city/state or highway + milepost at this status-change point
    remarks = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "trip_stops"
        ordering = ["sequence"]
        unique_together = [("trip", "sequence")]
        indexes = [
            models.Index(fields=["trip", "stop_type"]),
        ]

    def __str__(self):
        return (
            f"{self.get_stop_type_display()} — Trip {self.trip_id} seq={self.sequence}"
        )


# ---------------------------------------------------------------------------
# DutyLogEntry — raw contiguous duty-status segments (the full timeline)
# ---------------------------------------------------------------------------
class DutyLogEntry(TimeStampedModel):
    """
    One row per contiguous block of a single duty status.
    These are the atomic segments the scheduling engine emits; ELDDailyLog
    rows are derived by aggregating these per calendar day.

    `trip_day` is pre-computed (1-indexed) so a single filter
    `DutyLogEntry.objects.filter(trip=t, trip_day=2)` returns all of Day 2's
    segments with no date arithmetic at query time.

    `miles_driven` is 0 for every status except DRIVING, making a
    `Sum("miles_driven")` across any queryset a cheap, accurate total.
    """

    trip = models.ForeignKey(
        Trip, on_delete=models.CASCADE, related_name="duty_log_entries"
    )

    duty_status = models.CharField(
        max_length=20,
        choices=DutyStatus.choices,
        db_index=True,
    )

    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_hours = models.FloatField(
        help_text="(end - start) in hours — denormalised for metrics queries"
    )

    # Miles — only non-zero for DRIVING segments
    miles_driven = models.FloatField(default=0.0)
    odometer_start = models.FloatField(
        default=0.0, help_text="Cumulative trip miles at segment start"
    )
    odometer_end = models.FloatField(
        default=0.0, help_text="Cumulative trip miles at segment end"
    )

    # Link back to the stop that triggered / ended this segment (optional)
    trip_stop = models.ForeignKey(
        TripStop,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="duty_entries",
    )

    # Pre-computed calendar day within the trip (1 = trip.start_date calendar day)
    trip_day = models.PositiveSmallIntegerField(
        db_index=True,
        help_text="1-indexed calendar day within the trip (used to build ELDDailyLog)",
    )

    # ELD remarks at the status-change point (city, state or highway + milepost)
    remarks = models.CharField(max_length=255, blank=True)

    # Deterministic ordering within the trip
    sequence = models.PositiveIntegerField()

    class Meta:
        db_table = "duty_log_entries"
        ordering = ["sequence"]
        unique_together = [("trip", "sequence")]
        indexes = [
            models.Index(fields=["trip", "duty_status"]),
            models.Index(fields=["trip", "trip_day"]),
            models.Index(fields=["trip", "trip_day", "duty_status"]),
        ]

    def __str__(self):
        return (
            f"{self.get_duty_status_display()} | "
            f"{self.start_time:%Y-%m-%d %H:%M}–{self.end_time:%H:%M} "
            f"({self.duration_hours:.2f}h)"
        )


# ---------------------------------------------------------------------------
# ELDDailyLog — one row per calendar day; drives the ELD chart and metrics
# ---------------------------------------------------------------------------
class ELDDailyLog(TimeStampedModel):
    """
    Aggregated daily ELD log sheet.  One row per calendar day the trip spans.

    The four `*_hours` fields are pre-aggregated from DutyLogEntry rows for
    that day and **must always sum to exactly 24.0** per FMCSA requirement.
    Midnight-crossing segments are split across two rows by the engine.

    These columns power the frontend ELD chart directly with a single DB
    read — no Python post-processing needed at request time.

    Queryable metrics:
      - Driving hours per day:  eld.driving_hours
      - On-duty total per day:  eld.total_on_duty_hours  (driving + on_duty)
      - Cycle accumulation:     Sum(total_on_duty_hours) across days in 8-day window
                                → used to dynamically compute cycle_hours_used
    """

    trip = models.ForeignKey(
        Trip, on_delete=models.CASCADE, related_name="eld_daily_logs"
    )

    # Day identity
    day_number = models.PositiveSmallIntegerField(
        help_text="1-indexed day within the trip"
    )
    log_date = models.DateField(
        help_text="Calendar date (midnight-to-midnight in driver's home-terminal timezone)"
    )

    # ----- The four FMCSA duty-status hour columns (must sum to 24.0) -----
    off_duty_hours = models.FloatField(
        default=0.0,
        help_text="Total Off Duty hours on this calendar day",
    )
    sleeper_berth_hours = models.FloatField(
        default=0.0,
        help_text="Total Sleeper Berth hours on this calendar day",
    )
    driving_hours = models.FloatField(
        default=0.0,
        help_text="Total Driving hours on this calendar day",
    )
    on_duty_hours = models.FloatField(
        default=0.0,
        help_text="Total On Duty (Not Driving) hours on this calendar day",
    )

    # ----- Sheet-header totals -----
    total_miles_driven = models.FloatField(
        default=0.0,
        help_text="Miles driven on this calendar day (ELD sheet header)",
    )
    total_on_duty_hours = models.FloatField(
        default=0.0,
        help_text="driving_hours + on_duty_hours — counts toward 70-hr cycle",
    )

    # Quick flag for frontend warning badge
    has_violations = models.BooleanField(default=False)

    class Meta:
        db_table = "eld_daily_logs"
        ordering = ["day_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["trip", "day_number"], name="uq_eld_trip_day"
            ),
            models.UniqueConstraint(
                fields=["trip", "log_date"], name="uq_eld_trip_date"
            ),
        ]
        indexes = [
            models.Index(fields=["trip", "log_date"]),
        ]

    def __str__(self):
        return f"ELD Day {self.day_number} ({self.log_date}) — Trip {self.trip_id}"


# ---------------------------------------------------------------------------
# TripViolation — HOS rule breaches detected during schedule generation
# ---------------------------------------------------------------------------
class TripViolation(TimeStampedModel):
    """
    One row per FMCSA violation detected during timeline generation.
    The engine generates these as an audit/confirmation output — by
    construction the generated schedule should already prevent violations,
    so a non-empty violations list signals the engine needs a 34-hr restart
    or the trip is genuinely uncompletable without one.
    """

    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="violations")
    violation_type = models.CharField(
        max_length=30,
        choices=ViolationType.choices,
        db_index=True,
    )
    occurred_at = models.DateTimeField(
        help_text="Absolute timestamp within the trip when the violation was detected"
    )
    description = models.TextField(blank=True)
    trip_day = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Calendar day within the trip on which the violation occurs",
    )

    class Meta:
        db_table = "trip_violations"
        ordering = ["occurred_at"]
