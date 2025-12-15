from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework.permissions import BasePermission
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import UntypedToken


def RolePermissionFactory(allowed_roles):
    class CustomRolePermission(BasePermission):
        def has_permission(self, request, view):
            user = request.user
            if not user or not user.is_authenticated:
                return False
            return getattr(user, "role", None) in allowed_roles

    return CustomRolePermission

class JWTCookieAuthentication(JWTAuthentication):
    cookie_name = "access"

    def authenticate(self, request):
        token = request.COOKIES.get(self.cookie_name)
        if not token:
            return None

        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except (InvalidToken, TokenError):
            raise AuthenticationFailed("Invalid or expired token")
