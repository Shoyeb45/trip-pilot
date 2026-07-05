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
    