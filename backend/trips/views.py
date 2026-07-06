from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .repository import TripRepository
from .models import Trip
from .serializers import CreateTripInputSerializer, TripPollSerializer, TripListSerializer


class TripView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Trip.objects.filter(driver=request.user)
            .select_related(
                "current_location",
                "pickup_location",
                "drop_location",
                "curr_to_pickup",
                "pickup_to_drop",
                "curr_to_pickup__start_location",
                "curr_to_pickup__end_location",
                "pickup_to_drop__start_location",
                "pickup_to_drop__end_location",
            )
            .order_by("-created_at")
        )

        # Filter by Date
        date_param = request.query_params.get("date")
        if date_param:
            queryset = queryset.filter(start_date__date=date_param)

        # Filter by Location Search
        location_search = request.query_params.get("location")
        if location_search:
            from django.db.models import Q

            queryset = queryset.filter(
                Q(current_location__display_name__icontains=location_search)
                | Q(current_location__city__icontains=location_search)
                | Q(current_location__state__icontains=location_search)
                | Q(pickup_location__display_name__icontains=location_search)
                | Q(pickup_location__city__icontains=location_search)
                | Q(pickup_location__state__icontains=location_search)
                | Q(drop_location__display_name__icontains=location_search)
                | Q(drop_location__city__icontains=location_search)
                | Q(drop_location__state__icontains=location_search)
            )

        # Pagination
        from rest_framework.pagination import PageNumberPagination

        class TripPagination(PageNumberPagination):
            page_size = 10
            page_size_query_param = "page_size"
            max_page_size = 100

        paginator = TripPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = TripListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = TripListSerializer(queryset, many=True)
        return Response(
            {
                "message": "Trips fetched successfully",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

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
            trip = (
                Trip.objects.select_related(
                    "current_location",
                    "pickup_location",
                    "drop_location",
                    "curr_to_pickup",
                    "pickup_to_drop",
                    "curr_to_pickup__start_location",
                    "curr_to_pickup__end_location",
                    "pickup_to_drop__start_location",
                    "pickup_to_drop__end_location",
                )
                .prefetch_related(
                    "stops",
                    "stops__location",
                    "duty_log_entries",
                    "eld_daily_logs",
                    "violations",
                )
                .get(id=trip_id, driver=request.user)
            )
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
