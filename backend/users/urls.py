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
    UserDeleteView,
    PasswordChangeView,
    PasswordChangeViaEmailView,
    PasswordChangeViaEmailRequestView,
    ConfPasswordChangeViaEmailView,
    PasswordChangeViaCodeView,
    EnableTwoFaView,
    DisableTwoFaView,
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
    path("delete/", UserDeleteView.as_view(), name="delete-user"),
    path("password/change/", PasswordChangeView.as_view(), name="password-change"),
    path(
        "password/change/request/",
        PasswordChangeViaEmailRequestView.as_view(),
        name="password-change-request",
    ),
    path(
        "password/change/verify/<str:signed_inst>/",
        ConfPasswordChangeViaEmailView.as_view(),
        name="password-change-verify",
    ),
    path(
        "password/change/confirm/",
        PasswordChangeViaEmailView.as_view(),
        name="password-change-confirm",
    ),
    path(
        "password/change/code/",
        PasswordChangeViaCodeView.as_view(),
        name="password-change-code",
    ),
    path("twofa/enable/", EnableTwoFaView.as_view(), name="enable-twofa"),
    path("twofa/disable/", DisableTwoFaView.as_view(), name="disable-twofa"),
]
