import os
import sys
from django.apps import AppConfig


class TripsConfig(AppConfig):
    name = "trips"

    def ready(self):
        # Prevent running worker multiple times during auto-reload
        if "runserver" in sys.argv and os.environ.get("RUN_MAIN") != "true":
            return

        from services.worker import start_worker

        start_worker()
