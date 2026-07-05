from rest_framework import serializers

from common.models import Location
from .models import Trip

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
    