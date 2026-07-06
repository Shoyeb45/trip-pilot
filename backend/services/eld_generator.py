"""
services/eld_generator.py
--------------------------
Builds ELDDailyLog rows from the DutyLogEntry rows of a completed trip.

Rules (per FMCSA / engine.md §9):
  - One ELDDailyLog row per calendar day the trip spans.
  - If a DutyLogEntry crosses midnight, it is split proportionally across
    two log rows.
  - Each row's four *_hours columns must sum to exactly 24.0 — any gap is
    padded with Off Duty.
  - has_violations is set to True for any day that has a matching
    TripViolation row.
"""

import logging
from datetime import date, datetime, time, timedelta
from typing import Any

logger = logging.getLogger(__name__)


# ── Internal accumulator ─────────────────────────────────────────────────────

_BUCKET_KEYS = ("off_duty", "sleeper_berth", "driving", "on_duty")


def _accrue(
    buckets: dict[date, dict[str, float]],
    log_date: date,
    duty_status: str,
    hours: float,
    miles: float,
) -> None:
    """Add `hours` and `miles` into the bucket for `log_date`."""
    if log_date not in buckets:
        buckets[log_date] = {k: 0.0 for k in _BUCKET_KEYS}
        buckets[log_date]["miles"] = 0.0

    # Map DutyStatus values to bucket keys
    status_key = duty_status  # they already match: "off_duty", "sleeper_berth", "driving", "on_duty"
    if status_key in buckets[log_date]:
        buckets[log_date][status_key] += hours
    buckets[log_date]["miles"] += miles


# ── Public function ──────────────────────────────────────────────────────────


def build_eld_daily_logs(trip) -> None:
    """
    Read all DutyLogEntry rows for `trip`, aggregate into per-day buckets
    (splitting midnight-crossing entries), pad to 24 hours, then bulk-create
    ELDDailyLog rows.

    Also marks has_violations=True for days that have TripViolation rows.
    """
    from trips.models import DutyLogEntry, ELDDailyLog, TripViolation

    entries = list(DutyLogEntry.objects.filter(trip=trip).order_by("sequence"))

    if not entries:
        logger.warning(
            "build_eld_daily_logs — no DutyLogEntry rows for trip %s", trip.id
        )
        return

    buckets: dict[date, dict[str, float]] = {}

    for entry in entries:
        seg_start = entry.start_time
        seg_end = entry.end_time

        if entry.duration_hours < 1e-9:
            continue  # skip zero-length entries

        # Split across midnight boundaries
        while seg_start.date() < seg_end.date():
            # Next midnight in the same timezone as seg_start
            next_midnight = datetime.combine(
                seg_start.date() + timedelta(days=1),
                time.min,
                tzinfo=seg_start.tzinfo,
            )
            partial_hours = (next_midnight - seg_start).total_seconds() / 3600.0
            fraction = partial_hours / entry.duration_hours
            partial_miles = entry.miles_driven * fraction

            _accrue(
                buckets,
                seg_start.date(),
                entry.duty_status,
                partial_hours,
                partial_miles,
            )
            seg_start = next_midnight

        # Remainder (or the whole entry if no midnight crossing)
        remaining_hours = (seg_end - seg_start).total_seconds() / 3600.0
        if remaining_hours > 1e-9:
            fraction = remaining_hours / entry.duration_hours
            partial_miles = entry.miles_driven * fraction
            _accrue(
                buckets,
                seg_start.date(),
                entry.duty_status,
                remaining_hours,
                partial_miles,
            )

    # Collect days that have violations
    violation_days: set[int] = set(
        TripViolation.objects.filter(trip=trip).values_list("trip_day", flat=True)
    )

    eld_logs = []
    for day_num, log_date in enumerate(sorted(buckets.keys()), start=1):
        b = buckets[log_date]

        total = b["off_duty"] + b["sleeper_berth"] + b["driving"] + b["on_duty"]
        if total < 24.0 - 1e-6:
            # Pad with Off Duty to reach exactly 24 hours
            b["off_duty"] += 24.0 - total
            total = 24.0

        total_on_duty = b["driving"] + b["on_duty"]

        eld_logs.append(
            ELDDailyLog(
                trip=trip,
                day_number=day_num,
                log_date=log_date,
                off_duty_hours=round(b["off_duty"], 6),
                sleeper_berth_hours=round(b["sleeper_berth"], 6),
                driving_hours=round(b["driving"], 6),
                on_duty_hours=round(b["on_duty"], 6),
                total_miles_driven=round(b["miles"], 4),
                total_on_duty_hours=round(total_on_duty, 6),
                has_violations=(day_num in violation_days),
            )
        )

        logger.debug(
            "ELD Day %d (%s) — drive=%.2fh on_duty=%.2fh sleeper=%.2fh off=%.2fh miles=%.1f total=%.4fh",
            day_num,
            log_date,
            b["driving"],
            b["on_duty"],
            b["sleeper_berth"],
            b["off_duty"],
            b["miles"],
            b["driving"] + b["on_duty"] + b["sleeper_berth"] + b["off_duty"],
        )

    ELDDailyLog.objects.bulk_create(eld_logs)
    logger.info(
        "build_eld_daily_logs — created %d ELD log sheets for trip %s",
        len(eld_logs),
        trip.id,
    )
