from django.test import TestCase
from unittest.mock import patch
from common.models import Location, LocationRoute
from trips.models import Trip
from user.models import User
from services.route_generation import get_route_detail


class RouteGenerationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testdriver", email="driver@example.com", password="password"
        )
        self.loc1 = Location.objects.create(
            display_name="Location 1",
            latitude=23.065035,
            longitude=69.668365,
            place_id="loc1",
            country="India",
            country_code="IN",
        )
        self.loc2 = Location.objects.create(
            display_name="Location 2",
            latitude=23.254481,
            longitude=70.131975,
            place_id="loc2",
            country="India",
            country_code="IN",
        )
        self.trip = Trip.objects.create(
            driver=self.user,
            current_location=self.loc1,
            pickup_location=self.loc2,
            drop_location=self.loc2,  # same location to test the same-location optimization
            truck_number=123,
            tailor_number=456,
        )

    @patch("services.route_generation.http_client.post")
    def test_get_route_detail(self, mock_post):
        # Mock successful GraphHopper API response
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "paths": [
                {
                    "distance": 61220.723,
                    "time": 6289916,
                    "points": "un{lCibfhLXwA...",
                    "bbox": [69.668365, 23.065035, 70.131975, 23.254481],
                    "details": {
                        "max_speed": [[0, 459, None], [459, 485, 80]],
                        "average_speed": [[0, 2, 12], [2, 6, 18]],
                    },
                }
            ]
        }

        # Call get_route_detail
        curr_to_pickup, pickup_to_drop = get_route_detail(self.trip)

        # Assert curr_to_pickup was created from the mocked API response
        self.assertIsNotNone(curr_to_pickup)
        self.assertEqual(curr_to_pickup.distance, 61220.723)
        self.assertEqual(curr_to_pickup.time, 6289916)
        self.assertEqual(curr_to_pickup.points_encoded, "un{lCibfhLXwA...")
        self.assertEqual(curr_to_pickup.max_speed, 80)
        self.assertEqual(curr_to_pickup.average_speed, 15)  # average of 12 and 18

        # Assert pickup_to_drop was handled by the same-location optimization (0 distance)
        self.assertIsNotNone(pickup_to_drop)
        self.assertEqual(pickup_to_drop.distance, 0.0)
        self.assertEqual(pickup_to_drop.time, 0.0)
        self.assertEqual(pickup_to_drop.max_speed, 0.0)
        self.assertEqual(pickup_to_drop.average_speed, 0.0)

        # Check trip links
        self.trip.refresh_from_db()
        self.assertEqual(self.trip.curr_to_pickup, curr_to_pickup)
        self.assertEqual(self.trip.pickup_to_drop, pickup_to_drop)


from trips.serializers import CreateTripInputSerializer
from django.utils import timezone
from datetime import timedelta


class TripValidationTest(TestCase):
    def setUp(self):
        self.loc_data = {
            "city": "Test",
            "state": "TS",
            "country": "Test Country",
            "country_code": "TC",
            "pincode": "12345",
            "latitude": 12.34,
            "longitude": 56.78,
            "place_id": "test_place",
        }
        self.base_data = {
            "truck_number": 123,
            "tailor_number": 456,
            "current_location": self.loc_data,
            "pickup_location": self.loc_data,
            "drop_location": self.loc_data,
        }

    def test_serializer_valid_date(self):
        # Today's date is valid
        data = self.base_data.copy()
        data["start_date"] = timezone.now().isoformat()
        serializer = CreateTripInputSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        # Future date is valid
        data["start_date"] = (timezone.now() + timedelta(days=2)).isoformat()
        serializer = CreateTripInputSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_serializer_past_date(self):
        # Yesterday's date is invalid
        data = self.base_data.copy()
        data["start_date"] = (timezone.now() - timedelta(days=1)).isoformat()
        serializer = CreateTripInputSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_date", serializer.errors)
