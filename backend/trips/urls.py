from django.urls import path

from trips.views import TripView

urlpatterns = [
    path("", TripView.as_view(), name="create trip")    
]