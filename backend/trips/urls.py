from django.urls import path

from trips.views import TripView, TripPollView

urlpatterns = [
    path("", TripView.as_view(), name="create trip"),
    path("poll/<uuid:trip_id>/", TripPollView.as_view(), name="poll_trip"),
]
