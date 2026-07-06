"""
services/hos_engine.py
-----------------------
FMCSA Hours-of-Service scheduling engine.

Drives the trip through two legs (Current→Pickup, Pickup→Dropoff), inserting
HOS-compliant stops and duty-log entries.  All output is accumulated in
EngineState.pending_* lists as plain dicts; the worker bulk-creates them
into the database at phase boundaries.

Rules implemented (per engine.md / FMCSA §395.3):
  - 11-hour driving cap per 14-hour window
  - 14-hour on-duty window cap (no driving after 14 hrs)
  - 30-minute break after 8 cumulative driving hours
  - 10-hour Sleeper Berth reset when 11-hr or 14-hr cap is hit
  - Fuel stop every 1,000 miles (30 min On Duty at nearest gas station)
  - 1-hour On Duty at pickup and drop-off
  - 70-hour / 8-day cycle limit (triggers 34-hr restart if exceeded)

Average driving speed assumption: 55 mph (stated in engine.md).
"""

import logging
import math
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone as dt_timezone
from typing import Optional

logger = logging.getLogger(__name__)

# ── HOS Constants ────────────────────────────────────────────────────────────

AVERAGE_SPEED_MPH = 55.0
MAX_DRIVING_HOURS = 11.0  # 11-hr driving cap
MAX_WINDOW_HOURS = 14.0  # 14-hr on-duty window
BREAK_THRESHOLD_HOURS = 8.0  # 30-min break required after this many driving hrs
BREAK_DURATION_HOURS = 0.5  # 30 min
FUEL_INTERVAL_MILES = 1_000.0  # fuel stop every 1,000 miles
FUEL_STOP_DURATION_HOURS = 0.5  # 30 min On Duty
PICKUP_DROPOFF_HOURS = 1.0  # 1 hr On Duty each
SLEEPER_RESET_HOURS = 10.0  # 10-hr sleeper berth reset
RESTART_34HR_HOURS = 34.0  # 34-hr restart
MAX_CYCLE_HOURS = 70.0  # 70-hr / 8-day limit

# Epsilon for float comparisons
_EPS = 1e-6


# ── Engine State ─────────────────────────────────────────────────────────────


@dataclass
class EngineState:
    """
    Mutable state carried across the full trip (both legs).
    All pending_* lists are dicts of kwargs for bulk model creation.
    """

    trip_id: str
    trip_start_date: date  # trip.start_date.date()
    current_time: datetime
    window_start_time: datetime

    odometer: float = 0.0  # cumulative trip miles
    hours_driven_window: float = 0.0  # resets after every sleeper reset
    hours_driven_since_break: float = 0.0  # resets after every 30-min break
    cycle_hours_used: float = 0.0  # rolling 8-day on-duty total

    # Collected for bulk DB insertion
    pending_stops: list = field(default_factory=list)  # TripStop kwargs dicts
    pending_entries: list = field(default_factory=list)  # DutyLogEntry kwargs dicts
    pending_violations: list = field(default_factory=list)  # TripViolation kwargs dicts

    seq_stop: int = 1
    seq_entry: int = 1

    # Set by add_dropoff_stop; written to Trip.estimated_arrival
    estimated_arrival: Optional[datetime] = None


# ── Public initializer ───────────────────────────────────────────────────────


def get_cycle_hours_used(driver, trip_start_date: date) -> float:
    """
    Sum of ELDDailyLog.total_on_duty_hours for this driver in the rolling
    8-day window ending at trip_start_date (exclusive).

    Returns 0.0 if no previous completed trips exist (first trip ever).
    """
    from django.db.models import Sum
    from trips.models import ELDDailyLog

    window_start = trip_start_date - timedelta(days=8)
    result = ELDDailyLog.objects.filter(
        trip__driver=driver,
        trip__trip_status="completed",
        log_date__gte=window_start,
        log_date__lt=trip_start_date,
    ).aggregate(total=Sum("total_on_duty_hours"))
    return float(result["total"] or 0.0)


def initialize_state(trip) -> EngineState:
    """
    Build initial EngineState from a Trip instance.
    Reads cycle_hours_used dynamically from ELDDailyLog history.
    """
    start = trip.start_date
    if start.tzinfo is None:
        from django.utils import timezone

        start = timezone.make_aware(start)

    cycle_used = get_cycle_hours_used(driver=trip.driver, trip_start_date=start.date())
    logger.info(
        "Engine init — trip %s | start=%s | cycle_used=%.2f hrs",
        trip.id,
        start.isoformat(),
        cycle_used,
    )

    return EngineState(
        trip_id=str(trip.id),
        trip_start_date=start.date(),
        current_time=start,
        window_start_time=start,
        cycle_hours_used=cycle_used,
    )


# ── Internal helpers ─────────────────────────────────────────────────────────


def _window_elapsed_hours(state: EngineState) -> float:
    """Hours elapsed since the current 14-hour window started."""
    return (state.current_time - state.window_start_time).total_seconds() / 3600.0


def _compute_trip_day(state: EngineState, dt: datetime) -> int:
    """1-indexed calendar day within the trip (Day 1 = trip.start_date)."""
    return (dt.date() - state.trip_start_date).days + 1


def _emit_stop(
    state: EngineState,
    stop_type: str,
    location,  # Location instance or None (for off-duty breaks)
    duration_hours: float,
    remarks: str = "",
) -> int:
    """
    Append a TripStop kwargs dict to state.pending_stops.
    Returns the sequence number assigned (used to link DutyLogEntry.trip_stop_seq).
    """
    arrival = state.current_time
    departure = arrival + timedelta(hours=duration_hours)
    seq = state.seq_stop

    state.pending_stops.append(
        {
            "stop_type": stop_type,
            "location": location,
            "arrival_time": arrival,
            "departure_time": departure,
            "duration_hours": duration_hours,
            "odometer_start": state.odometer,
            "odometer_end": state.odometer,  # no distance driven during a stop
            "sequence": seq,
            "remarks": remarks,
        }
    )
    state.seq_stop += 1
    return seq


def _emit_entry(
    state: EngineState,
    duty_status: str,
    duration_hours: float,
    miles_driven: float = 0.0,
    odometer_end: Optional[float] = None,
    remarks: str = "",
    trip_stop_seq: Optional[int] = None,
) -> None:
    """Append a DutyLogEntry kwargs dict to state.pending_entries."""
    start_time = state.current_time
    end_time = start_time + timedelta(hours=duration_hours)
    odo_end = odometer_end if odometer_end is not None else state.odometer

    state.pending_entries.append(
        {
            "duty_status": duty_status,
            "start_time": start_time,
            "end_time": end_time,
            "duration_hours": duration_hours,
            "miles_driven": miles_driven,
            "odometer_start": state.odometer,
            "odometer_end": odo_end,
            "trip_day": _compute_trip_day(state, start_time),
            "remarks": remarks,
            "sequence": state.seq_entry,
            "trip_stop_seq": trip_stop_seq,  # resolved to FK by repository
        }
    )
    state.seq_entry += 1


def _emit_violation(
    state: EngineState,
    violation_type: str,
    description: str,
) -> None:
    """Append a TripViolation kwargs dict to state.pending_violations."""
    state.pending_violations.append(
        {
            "violation_type": violation_type,
            "occurred_at": state.current_time,
            "description": description,
            "trip_day": _compute_trip_day(state, state.current_time),
        }
    )


def _location_remarks(location) -> str:
    """Format a Location as 'City, ST' or fall back to place_name."""
    if not location:
        return ""
    parts = [p for p in (location.city, location.state) if p]
    if parts:
        return ", ".join(parts)
    return location.place_name or location.display_name


# ── Private stop inserters ───────────────────────────────────────────────────


def _insert_rest_break(state: EngineState) -> None:
    """
    30-minute Off Duty break (required after 8 cumulative driving hours).
    Does NOT consume on-duty window or add to cycle hours.
    """
    from common.models import StopType, DutyStatus

    logger.debug(
        "Engine — rest break at %.2f mi, t=%s",
        state.odometer,
        state.current_time.isoformat(),
    )

    stop_seq = _emit_stop(
        state, StopType.REST_BREAK, None, BREAK_DURATION_HOURS, "En route"
    )
    _emit_entry(
        state,
        DutyStatus.OFF_DUTY,
        BREAK_DURATION_HOURS,
        trip_stop_seq=stop_seq,
        remarks="En route",
    )

    state.current_time += timedelta(hours=BREAK_DURATION_HOURS)
    state.hours_driven_since_break = 0.0
    # NOTE: window_start_time and hours_driven_window do NOT reset.
    # NOTE: Off Duty does NOT count toward cycle_hours_used.


def _insert_fuel_stop(state: EngineState, lat: float, lon: float) -> None:
    """
    30-minute On Duty fuel stop at the nearest gas station.
    Counts toward 14-hr window and 70-hr cycle.
    """
    from common.models import StopType, DutyStatus
    from services.places_service import find_nearest_gas_station

    logger.info("Engine — fuel stop at %.2f mi (%.4f, %.4f)", state.odometer, lat, lon)
    location = find_nearest_gas_station(lat, lon)
    remarks = _location_remarks(location)

    stop_seq = _emit_stop(
        state, StopType.FUEL, location, FUEL_STOP_DURATION_HOURS, remarks
    )
    _emit_entry(
        state,
        DutyStatus.ON_DUTY,
        FUEL_STOP_DURATION_HOURS,
        trip_stop_seq=stop_seq,
        remarks=remarks,
    )

    state.current_time += timedelta(hours=FUEL_STOP_DURATION_HOURS)
    state.cycle_hours_used += FUEL_STOP_DURATION_HOURS
    # Fuel stop counts against the 14-hr window but does NOT reset driving clocks.


def _insert_sleeper_reset(state: EngineState, lat: float, lon: float) -> None:
    """
    10-hour Sleeper Berth reset (triggered by 11-hr driving cap or 14-hr window).
    Resets driving window clocks. Does NOT count toward 70-hr cycle.
    """
    from common.models import StopType, DutyStatus
    from services.places_service import find_nearest_motel

    logger.info(
        "Engine — sleeper reset at %.2f mi (%.4f, %.4f)", state.odometer, lat, lon
    )
    location = find_nearest_motel(lat, lon)
    remarks = _location_remarks(location)

    stop_seq = _emit_stop(
        state, StopType.SLEEPER_RESET, location, SLEEPER_RESET_HOURS, remarks
    )
    _emit_entry(
        state,
        DutyStatus.SLEEPER_BERTH,
        SLEEPER_RESET_HOURS,
        trip_stop_seq=stop_seq,
        remarks=remarks,
    )

    state.current_time += timedelta(hours=SLEEPER_RESET_HOURS)
    state.hours_driven_window = 0.0
    state.hours_driven_since_break = 0.0
    state.window_start_time = state.current_time
    # Sleeper berth does NOT increment cycle_hours_used.


def _insert_34hr_restart(state: EngineState, lat: float, lon: float) -> None:
    """
    34-hour restart (only when 70-hr cycle limit would be exceeded).
    Fully resets the cycle counter and all window clocks.
    """
    from common.models import StopType, DutyStatus, ViolationType
    from services.places_service import find_nearest_motel

    logger.warning(
        "Engine — 34-hr restart at %.2f mi (cycle=%.2f)",
        state.odometer,
        state.cycle_hours_used,
    )

    _emit_violation(
        state,
        ViolationType.CYCLE_HOURS_EXCEEDED,
        f"70-hour cycle would be exceeded at mile {state.odometer:.1f}. "
        f"34-hour restart inserted (cycle reset to 0).",
    )

    location = find_nearest_motel(lat, lon)
    remarks = _location_remarks(location)

    stop_seq = _emit_stop(
        state, StopType.RESTART_34HR, location, RESTART_34HR_HOURS, remarks
    )
    _emit_entry(
        state,
        DutyStatus.SLEEPER_BERTH,
        RESTART_34HR_HOURS,
        trip_stop_seq=stop_seq,
        remarks=remarks,
    )

    state.current_time += timedelta(hours=RESTART_34HR_HOURS)
    state.cycle_hours_used = 0.0
    state.hours_driven_window = 0.0
    state.hours_driven_since_break = 0.0
    state.window_start_time = state.current_time


# ── Core drive loop ──────────────────────────────────────────────────────────


def drive_leg(
    state: EngineState,
    route,  # LocationRoute instance
    route_points: list[tuple],  # decoded from route.points_encoded
    cumulative_dists: list[float],  # from build_cumulative_distances()
) -> None:
    """
    Drive a single leg of the route.

    Breaks the leg into the smallest safe chunk at each iteration — bounded
    by whichever HOS rule triggers first — then handles the trigger before
    looping.

    The leg is defined by `route.distance` (metres).  The state's `odometer`
    is cumulative across both legs; mileage *within this leg* is tracked
    separately so route_points interpolation works correctly.

    After this function returns, state.current_time has advanced by the
    total driving + stop time of this leg.
    """
    from common.models import DutyStatus
    from services.polyline_utils import interpolate_position

    leg_miles = route.distance / 1_609.344  # metres → miles
    miles_left = leg_miles
    leg_start_odometer = state.odometer  # for within-leg interpolation

    if leg_miles < _EPS:
        logger.info("Engine — zero-length leg, skipping drive loop")
        return

    # First fuel threshold >= current odometer (skip mile-0 stops)
    if state.odometer < _EPS:
        next_fuel_at = FUEL_INTERVAL_MILES
    else:
        next_fuel_at = (
            math.ceil(state.odometer / FUEL_INTERVAL_MILES) * FUEL_INTERVAL_MILES
        )
        if abs(next_fuel_at - state.odometer) < _EPS:
            next_fuel_at += FUEL_INTERVAL_MILES

    logger.info(
        "Engine — driving leg %.2f mi | odometer=%.2f | next_fuel=%.0f | "
        "window=%.2f/11h | since_break=%.2f/8h | cycle=%.2f/70h",
        leg_miles,
        state.odometer,
        next_fuel_at,
        state.hours_driven_window,
        state.hours_driven_since_break,
        state.cycle_hours_used,
    )

    iteration = 0
    while miles_left > _EPS:
        iteration += 1
        if iteration > 10_000:
            # Safety valve — should never be reached in normal operation
            logger.error("Engine — drive loop exceeded 10,000 iterations; aborting leg")
            break

        # ── ① Compute the largest safe driving chunk ──────────────────────
        miles_to_break = max(
            0.0,
            (BREAK_THRESHOLD_HOURS - state.hours_driven_since_break)
            * AVERAGE_SPEED_MPH,
        )
        miles_to_11hr_cap = max(
            0.0, (MAX_DRIVING_HOURS - state.hours_driven_window) * AVERAGE_SPEED_MPH
        )
        miles_to_14hr_cap = max(
            0.0, (MAX_WINDOW_HOURS - _window_elapsed_hours(state)) * AVERAGE_SPEED_MPH
        )
        miles_to_fuel = max(0.0, next_fuel_at - state.odometer)

        # If all driving caps are already hit, we need a reset — don't drive
        if miles_to_11hr_cap < _EPS or miles_to_14hr_cap < _EPS:
            miles_chunk = 0.0
        else:
            miles_chunk = min(
                miles_to_break if miles_to_break > _EPS else miles_left,
                miles_to_11hr_cap,
                miles_to_14hr_cap,
                miles_to_fuel if miles_to_fuel > _EPS else miles_left,
                miles_left,
            )

        # ── ② Handle driving-cap before emitting chunk ────────────────────
        if miles_chunk < _EPS:
            # Must take a sleeper reset before driving more
            within_leg_miles = state.odometer - leg_start_odometer
            lat, lon = interpolate_position(
                route_points, cumulative_dists, within_leg_miles
            )
            _insert_sleeper_reset(state, lat, lon)
            # Recalculate — window is now fresh
            continue

        hours_chunk = miles_chunk / AVERAGE_SPEED_MPH

        # ── ③ Cycle limit check before emitting driving chunk ─────────────
        if state.cycle_hours_used + hours_chunk > MAX_CYCLE_HOURS - _EPS:
            within_leg_miles = state.odometer - leg_start_odometer
            lat, lon = interpolate_position(
                route_points, cumulative_dists, within_leg_miles
            )
            _insert_34hr_restart(state, lat, lon)
            continue

        # ── ④ Emit DRIVING segment ────────────────────────────────────────
        odo_after = state.odometer + miles_chunk
        _emit_entry(
            state,
            DutyStatus.DRIVING,
            hours_chunk,
            miles_driven=miles_chunk,
            odometer_end=odo_after,
        )

        state.odometer += miles_chunk
        state.current_time += timedelta(hours=hours_chunk)
        state.hours_driven_window += hours_chunk
        state.hours_driven_since_break += hours_chunk
        state.cycle_hours_used += hours_chunk
        miles_left -= miles_chunk

        # ── ⑤ Handle triggers in order of priority ────────────────────────

        # 30-min break (check first — lower priority than cap resets)
        if state.hours_driven_since_break >= BREAK_THRESHOLD_HOURS - _EPS:
            _insert_rest_break(state)

        # Fuel stop (check before cap — fuel stop happens at mileage mark,
        # cap resets happen based on time; mileage mark takes priority here
        # since we sized the chunk to stop exactly at it)
        if state.odometer >= next_fuel_at - _EPS and miles_left > _EPS:
            within_leg_miles = state.odometer - leg_start_odometer
            lat, lon = interpolate_position(
                route_points, cumulative_dists, within_leg_miles
            )
            _insert_fuel_stop(state, lat, lon)
            next_fuel_at += FUEL_INTERVAL_MILES

        # 11-hr cap or 14-hr window (handle at top of next iteration via chunk=0 branch)
        # The check on the next loop iteration will detect the cap and call _insert_sleeper_reset.

    logger.info(
        "Engine — leg complete | odometer=%.2f mi | time=%s",
        state.odometer,
        state.current_time.isoformat(),
    )


# ── Pickup / Drop-off ────────────────────────────────────────────────────────


def add_pickup_stop(state: EngineState, location) -> None:
    """
    Insert 1-hour On Duty (pickup) stop + DutyLogEntry.
    Counts toward the 14-hr window and 70-hr cycle.
    Does NOT reset any HOS clock.
    """
    from common.models import StopType, DutyStatus

    remarks = _location_remarks(location)
    stop_seq = _emit_stop(
        state, StopType.PICKUP, location, PICKUP_DROPOFF_HOURS, remarks
    )
    _emit_entry(
        state,
        DutyStatus.ON_DUTY,
        PICKUP_DROPOFF_HOURS,
        trip_stop_seq=stop_seq,
        remarks=remarks,
    )
    state.current_time += timedelta(hours=PICKUP_DROPOFF_HOURS)
    state.cycle_hours_used += PICKUP_DROPOFF_HOURS
    logger.info("Engine — pickup stop done | t=%s", state.current_time.isoformat())


def add_dropoff_stop(state: EngineState, location) -> None:
    """
    Insert 1-hour On Duty (drop-off) stop + DutyLogEntry.
    Sets state.estimated_arrival to the arrival time at drop-off.
    """
    from common.models import StopType, DutyStatus

    remarks = _location_remarks(location)

    # estimated_arrival = when the driver arrives (before the 1-hr on-duty period)
    state.estimated_arrival = state.current_time

    stop_seq = _emit_stop(
        state, StopType.DROPOFF, location, PICKUP_DROPOFF_HOURS, remarks
    )
    _emit_entry(
        state,
        DutyStatus.ON_DUTY,
        PICKUP_DROPOFF_HOURS,
        trip_stop_seq=stop_seq,
        remarks=remarks,
    )
    state.current_time += timedelta(hours=PICKUP_DROPOFF_HOURS)
    state.cycle_hours_used += PICKUP_DROPOFF_HOURS
    logger.info(
        "Engine — dropoff stop done | arrival=%s", state.estimated_arrival.isoformat()
    )
