from django.contrib import admin

from .models import Trip, TripStop, DutyLogEntry, ELDDailyLog, TripViolation


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "driver",
        "trip_status",
        "generate_stage",
        "total_distance_miles",
        "total_driving_hours",
        "estimated_arrival",
        "start_date",
        "created_at",
    ]
    list_filter = ["trip_status", "generate_stage"]
    ordering = ["-created_at"]


@admin.register(TripStop)
class TripStopAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "stop_type",
        "sequence",
        "arrival_time",
        "departure_time",
        "duration_hours",
        "odometer_start",
        "remarks",
    ]
    list_filter = ["stop_type"]
    ordering = ["trip", "sequence"]
    raw_id_fields = ["trip", "location"]


@admin.register(DutyLogEntry)
class DutyLogEntryAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "duty_status",
        "trip_day",
        "sequence",
        "start_time",
        "end_time",
        "duration_hours",
        "miles_driven",
    ]
    list_filter = ["duty_status", "trip_day"]
    ordering = ["trip", "sequence"]
    raw_id_fields = ["trip", "trip_stop"]


@admin.register(ELDDailyLog)
class ELDDailyLogAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "day_number",
        "log_date",
        "driving_hours",
        "on_duty_hours",
        "sleeper_berth_hours",
        "off_duty_hours",
        "total_miles_driven",
        "total_on_duty_hours",
        "has_violations",
    ]
    list_filter = ["has_violations"]
    ordering = ["trip", "day_number"]
    raw_id_fields = ["trip"]


@admin.register(TripViolation)
class TripViolationAdmin(admin.ModelAdmin):
    list_display = [
        "trip",
        "violation_type",
        "trip_day",
        "occurred_at",
        "description",
    ]
    list_filter = ["violation_type"]
    ordering = ["trip", "occurred_at"]
    raw_id_fields = ["trip"]
