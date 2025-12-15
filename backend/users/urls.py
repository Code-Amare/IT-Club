from django.urls import path
from .views import (
    SendVerificationCodeView,
    VerifyCodeView,
    RegisterView,
    LoginView,
    LogoutView,
    GetUserView,
    RefreshTokenView,
    EditProfileView,
)

urlpatterns = [
    path("token/refresh/", RefreshTokenView.as_view(), name="refresh-token"),
    path("send-code/", SendVerificationCodeView.as_view(), name="send-code"),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("get/", GetUserView.as_view(), name="get-user"),
    path("edit/", EditProfileView.as_view(), name="edit-profile"),
]
