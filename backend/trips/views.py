from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .repository import TripRepository
from .serializers import CreateTripInputSerializer


class TripView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateTripInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        trip = TripRepository.create_trip(
            validated_data=serializer.validated_data, driver=request.user
        )

        return Response(
            {
                "message": "Trip created successfully",
                "data": {"id": str(trip.id)},
            },
            status=status.HTTP_201_CREATED,
        )
    

