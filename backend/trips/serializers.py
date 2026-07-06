from rest_framework import serializers

from common.models import Location, LocationRoute
from .models import Trip, TripStop, DutyLogEntry, ELDDailyLog, TripViolation


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = [
            "id",
            "display_name",
            "city",
            "state",
            "country",
            "country_code",
            "pincode",
            "latitude",
            "longitude",
            "place_id",
            "created_at",
            "updated_at",
        ]


class LocationRouteSerializer(serializers.ModelSerializer):
    start_location = serializers.PrimaryKeyRelatedField(read_only=True)
    end_location = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LocationRoute
        fields = [
            "id",
            "start_location",
            "end_location",
            "distance",
            "time",
            "points_encoded",
            "bbox",
            "max_speed",
            "average_speed",
            "created_at",
            "updated_at",
        ]


class TripStopSerializer(serializers.ModelSerializer):
    location = serializers.PrimaryKeyRelatedField(read_only=True)
    stop_type_display = serializers.CharField(
        source="get_stop_type_display", read_only=True
    )

    class Meta:
        model = TripStop
        fields = [
            "id",
            "stop_type",
            "stop_type_display",
            "location",
            "arrival_time",
            "departure_time",
            "duration_hours",
            "odometer_start",
            "odometer_end",
            "sequence",
            "remarks",
            "created_at",
            "updated_at",
        ]


class DutyLogEntrySerializer(serializers.ModelSerializer):
    duty_status_display = serializers.CharField(
        source="get_duty_status_display", read_only=True
    )

    class Meta:
        model = DutyLogEntry
        fields = [
            "id",
            "duty_status",
            "duty_status_display",
            "start_time",
            "end_time",
            "duration_hours",
            "miles_driven",
            "odometer_start",
            "odometer_end",
            "trip_day",
            "remarks",
            "sequence",
            "created_at",
            "updated_at",
        ]


class ELDDailyLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ELDDailyLog
        fields = [
            "id",
            "day_number",
            "log_date",
            "off_duty_hours",
            "sleeper_berth_hours",
            "driving_hours",
            "on_duty_hours",
            "total_miles_driven",
            "total_on_duty_hours",
            "has_violations",
            "created_at",
            "updated_at",
        ]


class TripViolationSerializer(serializers.ModelSerializer):
    violation_type_display = serializers.CharField(
        source="get_violation_type_display", read_only=True
    )

    class Meta:
        model = TripViolation
        fields = [
            "id",
            "violation_type",
            "violation_type_display",
            "occurred_at",
            "description",
            "trip_day",
            "created_at",
            "updated_at",
        ]


class TripPollSerializer(serializers.ModelSerializer):
    current_location = serializers.PrimaryKeyRelatedField(read_only=True)
    pickup_location = serializers.PrimaryKeyRelatedField(read_only=True)
    drop_location = serializers.PrimaryKeyRelatedField(read_only=True)
    curr_to_pickup = LocationRouteSerializer(read_only=True)
    pickup_to_drop = LocationRouteSerializer(read_only=True)
    stops = TripStopSerializer(many=True, read_only=True)
    duty_log_entries = DutyLogEntrySerializer(many=True, read_only=True)
    eld_daily_logs = ELDDailyLogSerializer(many=True, read_only=True)
    violations = TripViolationSerializer(many=True, read_only=True)
    trip_status = serializers.SerializerMethodField()
    generate_stage = serializers.SerializerMethodField()
    loading_text = serializers.SerializerMethodField()
    message = serializers.SerializerMethodField()
    locations = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "locations",
            "current_location",
            "pickup_location",
            "drop_location",
            "truck_number",
            "tailor_number",
            "trip_status",
            "generate_stage",
            "start_date",
            "curr_to_pickup",
            "pickup_to_drop",
            "total_distance_miles",
            "total_driving_hours",
            "total_on_duty_hours",
            "total_rest_hours",
            "estimated_arrival",
            "stops",
            "duty_log_entries",
            "eld_daily_logs",
            "violations",
            "loading_text",
            "message",
            "created_at",
            "updated_at",
        ]

    def get_trip_status(self, obj):
        return {"value": obj.trip_status, "label": obj.get_trip_status_display()}

    def get_generate_stage(self, obj):
        if not obj.generate_stage:
            return None
        return {"value": obj.generate_stage, "label": obj.get_generate_stage_display()}

    def get_loading_text(self, obj):
        from common.models import TripStatus, GenerateStage

        if obj.trip_status == TripStatus.CALCULATING:
            if obj.generate_stage == GenerateStage.GENERATING_ROUTE:
                return "Calculating routes..."
            elif obj.generate_stage == GenerateStage.GENERATING_FUEL_STOPS:
                return "Generating fuel stops..."
            elif obj.generate_stage == GenerateStage.GENERATING_REST_STOPS:
                return "Generating rest stops..."
            elif obj.generate_stage == GenerateStage.GENERATING_LOGS:
                return "Generating logs..."
            return "Processing..."
        return None

    def get_message(self, obj):
        from common.models import TripStatus, GenerateStage

        if obj.trip_status == TripStatus.COMPLETED:
            return "Trip processing completed successfully."
        elif obj.trip_status == TripStatus.FAILED:
            return "Trip processing failed."
        elif obj.trip_status == TripStatus.DRAFT:
            return "Trip is in draft status."
        elif obj.trip_status == TripStatus.CALCULATING:
            if obj.generate_stage == GenerateStage.GENERATING_ROUTE:
                return "Trip routes are being generated."
            elif obj.generate_stage == GenerateStage.GENERATING_FUEL_STOPS:
                return "Fuel stops are being generated."
            elif obj.generate_stage == GenerateStage.GENERATING_REST_STOPS:
                return "Rest stops are being generated."
            elif obj.generate_stage == GenerateStage.GENERATING_LOGS:
                return "Logs are being generated."
            return "Trip generation is in progress."
        return "Unknown trip status."

    def get_locations(self, obj):
        locations_dict = {}

        def add_location(loc):
            if loc and loc.id not in locations_dict:
                locations_dict[str(loc.id)] = LocationSerializer(loc).data

        if obj.current_location:
            add_location(obj.current_location)
        if obj.pickup_location:
            add_location(obj.pickup_location)
        if obj.drop_location:
            add_location(obj.drop_location)

        if obj.curr_to_pickup:
            if obj.curr_to_pickup.start_location:
                add_location(obj.curr_to_pickup.start_location)
            if obj.curr_to_pickup.end_location:
                add_location(obj.curr_to_pickup.end_location)

        if obj.pickup_to_drop:
            if obj.pickup_to_drop.start_location:
                add_location(obj.pickup_to_drop.start_location)
            if obj.pickup_to_drop.end_location:
                add_location(obj.pickup_to_drop.end_location)

        for stop in obj.stops.all():
            if stop.location:
                add_location(stop.location)

        return locations_dict


class LocationInputSerializer(serializers.Serializer):
    city = serializers.CharField(required=False, allow_blank=True)
    state = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField()
    country_code = serializers.CharField(max_length=2)
    pincode = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    place_id = serializers.CharField(required=False)


class CreateTripInputSerializer(serializers.Serializer):
    truck_number = serializers.IntegerField()
    tailor_number = serializers.IntegerField()
    current_location = LocationInputSerializer()
    pickup_location = LocationInputSerializer()
    drop_location = LocationInputSerializer()
    start_date = serializers.DateTimeField(required=False, allow_null=True)

    def validate_start_date(self, value):
        if value:
            from django.utils import timezone

            now = timezone.now()
            if value.date() < now.date():
                raise serializers.ValidationError("Start date cannot be in the past.")
        return value


class TripListSerializer(serializers.ModelSerializer):
    current_location = serializers.PrimaryKeyRelatedField(read_only=True)
    pickup_location = serializers.PrimaryKeyRelatedField(read_only=True)
    drop_location = serializers.PrimaryKeyRelatedField(read_only=True)
    curr_to_pickup = LocationRouteSerializer(read_only=True)
    pickup_to_drop = LocationRouteSerializer(read_only=True)
    trip_status = serializers.SerializerMethodField()
    generate_stage = serializers.SerializerMethodField()
    locations = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "locations",
            "current_location",
            "pickup_location",
            "drop_location",
            "truck_number",
            "tailor_number",
            "trip_status",
            "generate_stage",
            "start_date",
            "curr_to_pickup",
            "pickup_to_drop",
            "total_distance_miles",
            "total_driving_hours",
            "total_on_duty_hours",
            "total_rest_hours",
            "estimated_arrival",
            "created_at",
            "updated_at",
        ]

    def get_trip_status(self, obj):
        return {"value": obj.trip_status, "label": obj.get_trip_status_display()}

    def get_generate_stage(self, obj):
        if not obj.generate_stage:
            return None
        return {"value": obj.generate_stage, "label": obj.get_generate_stage_display()}

    def get_locations(self, obj):
        locations_dict = {}

        def add_location(loc):
            if loc and loc.id not in locations_dict:
                locations_dict[str(loc.id)] = LocationSerializer(loc).data

        if obj.current_location:
            add_location(obj.current_location)
        if obj.pickup_location:
            add_location(obj.pickup_location)
        if obj.drop_location:
            add_location(obj.drop_location)

        if obj.curr_to_pickup:
            if obj.curr_to_pickup.start_location:
                add_location(obj.curr_to_pickup.start_location)
            if obj.curr_to_pickup.end_location:
                add_location(obj.curr_to_pickup.end_location)

        if obj.pickup_to_drop:
            if obj.pickup_to_drop.start_location:
                add_location(obj.pickup_to_drop.start_location)
            if obj.pickup_to_drop.end_location:
                add_location(obj.pickup_to_drop.end_location)

        return locations_dict
