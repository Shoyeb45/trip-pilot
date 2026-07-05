import logging
import threading
import time
from services.queue import JobQueue
from services.route_generation import get_route_detail

logger = logging.getLogger(__name__)


def process_job(item):
    """
    Processes a single job in a separate thread.
    Updates the trip through all GenerateStage values and completes it.
    """
    from django.db import close_old_connections
    trip_id = item.get("trip_id")

    if not trip_id:
        logger.warning("Worker received item without trip_id: %s", item)
        return

    logger.info("Worker: Starting processing for trip %s", trip_id)

    try:
        from trips.models import Trip
        from common.models import TripStatus, GenerateStage

        try:
            trip = Trip.objects.get(id=trip_id)
        except Trip.DoesNotExist:
            logger.error("Worker: Trip %s not found in database", trip_id)
            return

        trip.trip_status = TripStatus.CALCULATING
        trip.save()

        # Phase 1: Route
        trip.generate_stage = GenerateStage.GENERATING_ROUTE
        trip.save()
        
        logger.info("Worker: Trip %s in ROUTE stage", trip_id)
        curr_to_pickup, pickup_to_drop = get_route_detail(trip)
        time.sleep(2)

        # Phase 2: Stops
        trip.generate_stage = GenerateStage.GENERATING_FUEL_STOPS
        trip.save()
        logger.info("Worker: Trip %s in STOPS stage", trip_id)
        time.sleep(2)

        # Phase 3: Logs
        trip.generate_stage = GenerateStage.GENERATING_LOGS
        trip.save()
        logger.info("Worker: Trip %s in LOGS stage", trip_id)
        time.sleep(2)

        # Finalize
        trip.trip_status = TripStatus.COMPLETED
        # Optionally clear the generate stage, or leave it at LOGS
        trip.save()
        logger.info("Worker: Trip %s processing completed successfully", trip_id)

    except Exception as e:
        logger.exception("Worker: Error processing trip job %s: %s", trip_id, e)
        try:
            from trips.models import Trip
            from common.models import TripStatus
            trip = Trip.objects.get(id=trip_id)
            trip.trip_status = TripStatus.FAILED
            trip.save()
        except Exception:
            pass
    finally:
        # Close connection to database for this worker thread to avoid leaks
        close_old_connections()


def worker_loop():
    """
    Main loop for the worker thread.
    Blocks on the queue and dispatches jobs to new threads.
    """
    logger.info("Worker: Background worker loop started.")
    while True:
        try:
            item = JobQueue.pop()
            if item is None:
                continue

            logger.info("Worker: Received item: %s. Spawning processor thread.", item)
            processing_thread = threading.Thread(
                target=process_job,
                args=(item,),
                daemon=True,
                name=f"TripProcessor-{item.get('trip_id')}"
            )
            processing_thread.start()
        except Exception as e:
            logger.exception("Worker: Exception in worker loop: %s", e)
            time.sleep(1)


def start_worker():
    """
    Starts the background worker thread.
    """
    worker_thread = threading.Thread(
        target=worker_loop,
        daemon=True,
        name="JobQueueWorker"
    )
    worker_thread.start()
    logger.info("Worker: Started main background worker thread.")
