from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .repository import TripRepository
from .models import Trip
from .serializers import CreateTripInputSerializer, TripPollSerializer


class TripView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateTripInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trip = TripRepository.create_trip(
            validated_data=serializer.validated_data, driver=request.user
        )

        # Push the trip id into the queue for background processing
        from services.queue import JobQueue
        JobQueue.push({"trip_id": str(trip.id)})

        return Response(
            {
                "message": "Trip created successfully",
                "data": {"id": str(trip.id)},
            },
            status=status.HTTP_201_CREATED,
        )


class TripPollView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trip_id):
        try:
            trip = Trip.objects.get(id=trip_id, driver=request.user)
        except Trip.DoesNotExist:
            return Response(
                {"success": False, "error_message": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = TripPollSerializer(trip)
        return Response(
            {
                "message": "Trip status fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    

