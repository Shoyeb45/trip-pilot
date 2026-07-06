"""
trips/repository.py
--------------------
Data-access layer for the trips app.
"""

from django.db.models import Sum

from common.repository import CommonRepository
from .models import Trip, TripStop, DutyLogEntry, TripViolation


class TripRepository:

    # ── Trip creation ────────────────────────────────────────────────────────

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

        start_date = validated_data.get("start_date")
        if not start_date:
            from django.utils import timezone

            validated_data["start_date"] = timezone.now()

        return Trip.objects.create(
            driver=driver,
            current_location=current_location,
            pickup_location=pickup_location,
            drop_location=drop_location,
            **validated_data,
        )

    # ── HOS engine bulk persistence ──────────────────────────────────────────

    @staticmethod
    def bulk_create_stops(trip: Trip, stops_data: list[dict]) -> dict[int, TripStop]:
        """
        Convert a list of TripStop kwargs dicts (from EngineState.pending_stops)
        into TripStop model instances and bulk-create them.

        Returns a dict mapping sequence_number → TripStop instance, so that
        DutyLogEntry.trip_stop FK can be resolved immediately after.
        """
        if not stops_data:
            return {}

        instances = [
            TripStop(
                trip=trip,
                stop_type=d["stop_type"],
                location=d["location"],
                arrival_time=d["arrival_time"],
                departure_time=d["departure_time"],
                duration_hours=d["duration_hours"],
                odometer_start=d["odometer_start"],
                odometer_end=d["odometer_end"],
                sequence=d["sequence"],
                remarks=d["remarks"],
            )
            for d in stops_data
        ]

        created = TripStop.objects.bulk_create(instances)
        # Build seq → instance map for FK resolution
        return {stop.sequence: stop for stop in created}

    @staticmethod
    def bulk_create_entries(
        trip: Trip,
        entries_data: list[dict],
        stop_seq_map: dict[int, TripStop],
    ) -> None:
        """
        Convert a list of DutyLogEntry kwargs dicts (from EngineState.pending_entries)
        into DutyLogEntry instances and bulk-create them.

        `stop_seq_map` maps TripStop.sequence → TripStop instance (from
        bulk_create_stops) so the trip_stop FK can be resolved here.
        """
        if not entries_data:
            return

        instances = [
            DutyLogEntry(
                trip=trip,
                duty_status=d["duty_status"],
                start_time=d["start_time"],
                end_time=d["end_time"],
                duration_hours=d["duration_hours"],
                miles_driven=d["miles_driven"],
                odometer_start=d["odometer_start"],
                odometer_end=d["odometer_end"],
                trip_stop=stop_seq_map.get(d.get("trip_stop_seq")),
                trip_day=d["trip_day"],
                remarks=d["remarks"],
                sequence=d["sequence"],
            )
            for d in entries_data
        ]

        DutyLogEntry.objects.bulk_create(instances)

    @staticmethod
    def bulk_create_violations(trip: Trip, violations_data: list[dict]) -> None:
        """Create TripViolation rows if any HOS violations were detected."""
        if not violations_data:
            return

        from .models import TripViolation

        instances = [
            TripViolation(
                trip=trip,
                violation_type=d["violation_type"],
                occurred_at=d["occurred_at"],
                description=d["description"],
                trip_day=d.get("trip_day"),
            )
            for d in violations_data
        ]
        TripViolation.objects.bulk_create(instances)

    @staticmethod
    def finalize_trip_totals(trip: Trip, state) -> None:
        """
        Write computed totals from EngineState back to the Trip row.
        Called after both legs are complete and before ELD log generation.
        """
        from django.db.models import Q
        from common.models import DutyStatus

        agg = DutyLogEntry.objects.filter(trip=trip).aggregate(
            driving_hours=Sum(
                "duration_hours", filter=Q(duty_status=DutyStatus.DRIVING)
            ),
            on_duty_hours=Sum(
                "duration_hours", filter=Q(duty_status=DutyStatus.ON_DUTY)
            ),
            off_duty_hours=Sum(
                "duration_hours", filter=Q(duty_status=DutyStatus.OFF_DUTY)
            ),
            sleeper_hours=Sum(
                "duration_hours", filter=Q(duty_status=DutyStatus.SLEEPER_BERTH)
            ),
            total_miles=Sum("miles_driven"),
        )

        trip.total_distance_miles = round(float(agg["total_miles"] or 0.0), 4)
        trip.total_driving_hours = round(float(agg["driving_hours"] or 0.0), 4)
        trip.total_on_duty_hours = round(
            float((agg["driving_hours"] or 0.0) + (agg["on_duty_hours"] or 0.0)), 4
        )
        trip.total_rest_hours = round(
            float((agg["off_duty_hours"] or 0.0) + (agg["sleeper_hours"] or 0.0)), 4
        )
        trip.estimated_arrival = state.estimated_arrival
        trip.save(
            update_fields=[
                "total_distance_miles",
                "total_driving_hours",
                "total_on_duty_hours",
                "total_rest_hours",
                "estimated_arrival",
            ]
        )
