from django.urls import path
from .views import SignupView, LoginView, TokenRefreshView, UserProfileView

urlpatterns = [
    path("signup", SignupView.as_view(), name="signup"),
    path("login", LoginView.as_view(), name="login"),
    path("refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("me", UserProfileView.as_view(), name="user_profile"),
]
