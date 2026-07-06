from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Sum
from django.utils import timezone
from .repository import TripRepository
from .models import Trip
from .serializers import CreateTripInputSerializer, TripPollSerializer, TripListSerializer


class TripView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = (
            Trip.objects.filter(driver=request.user, deleted=False)
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
            return Response( { "data" : paginator.get_paginated_response(serializer.data).data })

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

    def delete(self, request):
        trip_id = request.query_params.get("trip_id") or request.data.get("trip_id") or request.query_params.get("id") or request.data.get("id")
        if not trip_id:
            return Response(
                {"success": False, "error_message": "trip_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            trip = Trip.objects.get(id=trip_id, driver=request.user, deleted=False)
        except Trip.DoesNotExist:
            return Response(
                {"success": False, "error_message": "Trip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        trip.deleted = True
        trip.save(update_fields=["deleted"])

        return Response(
            {
                "message": "Trip deleted successfully",
                "data": {"success": True},
            },
            status=status.HTTP_200_OK,
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
                .get(id=trip_id, driver=request.user, deleted=False)
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


class DashboardMetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        driver = request.user

        # 1. Total Trips
        total_trips = Trip.objects.filter(driver=driver, deleted=False).count()

        # 2. Total Miles Driven
        total_miles = Trip.objects.filter(
            driver=driver, deleted=False, trip_status="completed"
        ).aggregate(total=Sum("total_distance_miles"))["total"] or 0.0

        # 3. Average Driving Hours
        avg_driving_hours = Trip.objects.filter(
            driver=driver, deleted=False, trip_status="completed"
        ).aggregate(avg=Avg("total_driving_hours"))["avg"] or 0.0

        # 4. Hours Remaining in Current Cycle
        from services.hos_engine import get_cycle_hours_used
        
        current_date = timezone.now().date()
        cycle_hours_used = get_cycle_hours_used(driver=driver, trip_start_date=current_date)
        cycle_hours_remaining = max(0.0, 70.0 - cycle_hours_used)

        # 5. Recent Trips (top 3)
        recent_trips_qs = Trip.objects.filter(driver=driver, deleted=False).order_by("-created_at")[:3]
        recent_trips_data = TripListSerializer(recent_trips_qs, many=True).data

        completed_trips_count = Trip.objects.filter(
            driver=driver, deleted=False, trip_status="completed"
        ).count()

        data = {
            "total_trips": total_trips,
            "total_miles": round(total_miles, 1),
            "completed_trips_count": completed_trips_count,
            "avg_driving_hours": round(avg_driving_hours, 1),
            "cycle_hours_remaining": round(cycle_hours_remaining, 1),
            "recent_trips": recent_trips_data,
        }

        return Response(
            {
                "message": "Dashboard metrics fetched successfully",
                "data": data,
            },
            status=status.HTTP_200_OK,
        )
