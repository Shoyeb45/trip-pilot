from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import (
    SignupSerializer,
    LoginSerializer,
    TokenRefreshSerializer,
    UserSerializer,
    UserUpdateSerializer,
    generate_tokens,
)


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)

        if not serializer.is_valid():
            raise ValidationError(serializer.errors)

        user = serializer.save()
        tokens = generate_tokens(user)
        return Response(
            {
                "message": "User created successfully",
                "data": {"user": UserSerializer(user).data, "tokens": tokens},
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            raise ValidationError(serializer.errors)

        user = serializer.validated_data["user"]
        tokens = generate_tokens(user)

        return Response(
            {
                "message": "Login successful",
                "data": {"user": UserSerializer(user).data, "tokens": tokens},
            },
            status=status.HTTP_200_OK,
        )


class TokenRefreshView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TokenRefreshSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data["user"]
            tokens = generate_tokens(user)
            return Response({"data": tokens}, status=status.HTTP_200_OK)

        return ValidationError(serializer.errors)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response({"data": {"user": serializer.data}}, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        if not serializer.is_valid():
            raise ValidationError(serializer.errors)

        user = serializer.save()
        return Response(
            {
                "message": "Profile updated successfully",
                "data": {"user": UserSerializer(user).data},
            },
            status=status.HTTP_200_OK,
        )
