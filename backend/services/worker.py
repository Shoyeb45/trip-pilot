import logging
import threading
from services.queue import JobQueue
from services.route_generation import get_route_detail

logger = logging.getLogger(__name__)


def process_job(item):
    from django.db import close_old_connections

    trip_id = item.get("trip_id")
    if not trip_id:
        logger.warning("Worker received item without trip_id: %s", item)
        return

    logger.info("Worker: Starting processing for trip %s", trip_id)

    try:
        from trips.models import Trip
        from trips.repository import TripRepository
        from common.models import TripStatus, GenerateStage
        from services.polyline_utils import decode_polyline, build_cumulative_distances
        from services.hos_engine import (
            initialize_state,
            drive_leg,
            add_pickup_stop,
            add_dropoff_stop,
        )
        from services.eld_generator import build_eld_daily_logs

        try:
            trip = Trip.objects.select_related(
                "driver",
                "current_location",
                "pickup_location",
                "drop_location",
            ).get(id=trip_id, deleted=False)
        except Trip.DoesNotExist:
            logger.error("Worker: Trip %s not found in database", trip_id)
            return

        trip.trip_status = TripStatus.CALCULATING
        trip.save(update_fields=["trip_status"])

        trip.generate_stage = GenerateStage.GENERATING_ROUTE
        trip.save(update_fields=["generate_stage"])
        logger.info("Worker: Trip %s — GENERATING_ROUTE", trip_id)

        get_route_detail(trip)
        trip.refresh_from_db()

        trip.generate_stage = GenerateStage.GENERATING_FUEL_STOPS
        trip.save(update_fields=["generate_stage"])
        logger.info("Worker: Trip %s — GENERATING_FUEL_STOPS", trip_id)

        state = initialize_state(trip)

        # Decode Leg 1 polyline once
        leg1_points = decode_polyline(trip.curr_to_pickup.points_encoded)
        leg1_dists = build_cumulative_distances(leg1_points)

        drive_leg(state, trip.curr_to_pickup, leg1_points, leg1_dists)
        add_pickup_stop(state, trip.pickup_location)

        # Persist Leg 1 stops + entries to DB
        stop_seq_map = TripRepository.bulk_create_stops(trip, state.pending_stops)
        TripRepository.bulk_create_entries(trip, state.pending_entries, stop_seq_map)
        TripRepository.bulk_create_violations(trip, state.pending_violations)

        state.pending_stops.clear()
        state.pending_entries.clear()
        state.pending_violations.clear()

        # ── Phase 3: Rest stops — Leg 2 (Pickup → Dropoff) + Dropoff ──────
        trip.generate_stage = GenerateStage.GENERATING_REST_STOPS
        trip.save(update_fields=["generate_stage"])
        logger.info("Worker: Trip %s — GENERATING_REST_STOPS", trip_id)

        # Decode Leg 2 polyline once
        leg2_points = decode_polyline(trip.pickup_to_drop.points_encoded)
        leg2_dists = build_cumulative_distances(leg2_points)

        drive_leg(state, trip.pickup_to_drop, leg2_points, leg2_dists)
        add_dropoff_stop(state, trip.drop_location)

        # Persist Leg 2 stops + entries to DB
        stop_seq_map = TripRepository.bulk_create_stops(trip, state.pending_stops)
        TripRepository.bulk_create_entries(trip, state.pending_entries, stop_seq_map)
        TripRepository.bulk_create_violations(trip, state.pending_violations)

        # Write trip-level totals (total_distance_miles, estimated_arrival, etc.)
        TripRepository.finalize_trip_totals(trip, state)

        # ── Phase 4: ELD log generation ────────────────────────────────────
        trip.generate_stage = GenerateStage.GENERATING_LOGS
        trip.save(update_fields=["generate_stage"])
        logger.info("Worker: Trip %s — GENERATING_LOGS", trip_id)

        build_eld_daily_logs(trip)

        # ── Done ───────────────────────────────────────────────────────────
        trip.trip_status = TripStatus.COMPLETED
        trip.generate_stage = GenerateStage.GENERATION_COMPLETED
        trip.save(update_fields=["trip_status", "generate_stage"])
        logger.info("Worker: Trip %s — COMPLETED successfully", trip_id)

    except Exception as exc:
        logger.exception("Worker: Error processing trip %s: %s", trip_id, exc)
        try:
            from trips.models import Trip
            from common.models import TripStatus

            trip = Trip.objects.get(id=trip_id)
            trip.trip_status = TripStatus.FAILED
            trip.save(update_fields=["trip_status"])
        except Exception:
            pass

    finally:
        close_old_connections()


def worker_loop():
    """
    Main loop for the background worker thread.
    Blocks on the queue and dispatches each job to a new thread.
    """
    logger.info("Worker: Background worker loop started.")
    while True:
        try:
            item = JobQueue.pop()
            if item is None:
                continue

            logger.info("Worker: Received item %s — spawning processor thread.", item)
            processing_thread = threading.Thread(
                target=process_job,
                args=(item,),
                daemon=True,
                name=f"TripProcessor-{item.get('trip_id')}",
            )
            processing_thread.start()
        except Exception as exc:
            logger.exception("Worker: Exception in worker loop: %s", exc)
            import time

            time.sleep(1)


def start_worker():
    """Start the main background worker thread."""
    worker_thread = threading.Thread(
        target=worker_loop,
        daemon=True,
        name="JobQueueWorker",
    )
    worker_thread.start()
    logger.info("Worker: Started main background worker thread.")
