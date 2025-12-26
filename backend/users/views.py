from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.response import Response
from rest_framework import status
from utils.auth import JWTCookieAuthentication, RolePermissionFactory
from rest_framework.permissions import IsAuthenticated
from django.middleware.csrf import get_token
from .models import VerifyEmail
from django.contrib.auth import get_user_model
from django.db import transaction
from django.core.mail import send_mail
from django.contrib.auth import authenticate
from .serializers import UserSerializer
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect

# from axes.handlers.database import AxesDatabaseHandler
from axes.handlers.proxy import AxesProxyHandler
from utils.axes import get_lockout_remaining, get_client_ip


IS_TWOFA_MANDATORY = settings.IS_TWOFA_MANDATORY

User = get_user_model()

EMAIL = settings.EMAIL


class GetUserView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.is_authenticated:
            return Response(
                {"user": UserSerializer(user).data}, status=status.HTTP_200_OK
            )
        return Response(
            {"detail": "User is not authenticated."}, status=status.HTTP_400_BAD_REQUEST
        )


class SendVerificationCodeView(APIView):
    authentication_classes = [JWTCookieAuthentication]

    def post(self, request):

        if request.user.is_authenticated:
            return Response(
                {"detail": "Already authenticated."},
                status=status.HTTP_200_OK,
            )

        email = request.data.get("email", "").strip()
        if not email:
            return Response(
                {"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"detail": "Invalid Email."}, status=status.HTTP_400_BAD_REQUEST
            )

        old_email_ver = VerifyEmail.objects.filter(user=user).first()
        if old_email_ver:
            old_email_ver.delete()

        email_verif = VerifyEmail.objects.create(user=user)

        try:
            send_mail(
                subject="Verify your email",
                message=f"Your verification code is {email_verif.code}",
                from_email=EMAIL,
                recipient_list=[email],
            )
        except Exception as e:

            return Response(
                {"detail": f"Unable to send the code{str(e)}."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"detail": "verification code sent successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyCodeView(APIView):
    def post(self, request):
        data = request.data
        email = data.get("email", "").strip()
        code = data.get("code", "").strip()

        # Check if data is being sent from the front-end
        if not code and not email:
            return Response(
                {"detail": "Code and Email are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        elif not email:
            return Response(
                {"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        elif not code:
            return Response(
                {"error": "Code is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Get user from email
        user = User.objects.filter(email=email).first()

        if not user:
            return Response(
                {"error": "Invalid email."}, status=status.HTTP_400_BAD_REQUEST
            )

        # Check if verification code sent before
        email_ver = VerifyEmail.objects.filter(user=user).first()

        if not email_ver:
            return Response(
                {"error": "Verificaiton code has not been sent yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if str(email_ver.code) != str(code):
            return Response(
                {"error": "Invalid verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if email_ver.is_expired():
            email_ver.delete()
            return Response(
                {"error": "Code expired."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                user.is_active = True
                user.email_verified = True
                if IS_TWOFA_MANDATORY:
                    user.twofa_enabled = True
                email_ver.delete()
                user.save()
            refresh = RefreshToken.for_user(user)

            response = Response(
                {"user": UserSerializer(user).data},
                status=status.HTTP_200_OK,
            )

            response.set_cookie(
                "access",
                str(refresh.access_token),
                httponly=True,
                secure=True,
                samesite="Lax",
            )
            response.set_cookie(
                "refresh",
                str(refresh),
                httponly=True,
                secure=True,
                samesite="Lax",
            )

            csrf_token = get_token(request)
            response.set_cookie(
                "csrftoken",
                csrf_token,
                httponly=False,
                secure=True,
                samesite="Lax",
            )

            return response
        except Exception as e:
            return Response(
                {"detail": f"Something went wrong.{str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class RegisterView(APIView):
    def post(self, request):
        serializer = UserSerializer(data=request.data)
        email = request.data.get("email", "")
        if not email:
            return Response(
                {"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "User with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if serializer.is_valid():
            with transaction.atomic():
                user = serializer.save()
                if IS_TWOFA_MANDATORY:
                    user.is_active = False
                    user.twofa_endabled = True
                user.save()
                email_ver = VerifyEmail.objects.create(user=user)

            try:
                send_mail(
                    subject="Verify your email",
                    message=f"Your verification code is {email_ver.code}",
                    from_email=settings.EMAIL,
                    recipient_list=[user.email],
                )
            except Exception as e:
                return Response(
                    {
                        "error": "Unable to send verification email.",
                        "email_sent": False,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return Response(
                {"detail": "User created successfully.", "user": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        return Response(
            {"error": "Invalid user credintals."}, status=status.HTTP_400_BAD_REQUEST
        )


class LoginView(APIView):
    def post(self, request):
        email = request.data.get("email").strip()
        password = request.data.get("password").strip()

        if not email or not password:
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        handler = AxesProxyHandler()

        if handler.is_locked(request._request, credentials={"email": email}):
            ip_address = get_client_ip(request)
            print(ip_address)

            # 2. Check lockout for this user + IP
            minutes, seconds = get_lockout_remaining(email, ip_address=ip_address)
            if minutes == 0:
                return Response(
                    {
                        "error": f"User will be allowed to login again in {seconds} second{"" if seconds <= 1 else "s"}."
                    },
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            if minutes == 1:

                return Response(
                    {"error": "User will be allowed to login again in 1 minute."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return Response(
                {"error": f"User will be allowed to login again in {minutes} minutes."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if IS_TWOFA_MANDATORY or user.twofa_endabled:
            old_email_ver = VerifyEmail.objects.filter(user=user).first()
            if old_email_ver:
                old_email_ver.delete()

            email_verif = VerifyEmail.objects.create(user=user)

            try:
                send_mail(
                    subject="Verify your email",
                    message=f"Your verification code is {email_verif.code}",
                    from_email=EMAIL,
                    recipient_list=[email],
                )
            except Exception as e:

                return Response(
                    {
                        "error": "Unable to send the code.",
                        "email_sent": False,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {
                    "detail": "verification code sent successfully.",
                    "verify_email": True,
                },
                status=status.HTTP_200_OK,
            )

        refresh = RefreshToken.for_user(user)

        response = Response(
            {"user": UserSerializer(user).data},
            status=200,
        )

        response.set_cookie(
            "access",
            str(refresh.access_token),
            httponly=True,
            secure=True,
            samesite="Lax",
        )
        response.set_cookie(
            "refresh",
            str(refresh),
            httponly=True,
            secure=True,
            samesite="Lax",
        )

        csrf_token = get_token(request)
        response.set_cookie(
            "csrftoken",
            csrf_token,
            httponly=False,
            secure=True,
            samesite="Lax",
        )

        return response


class LogoutView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response(
            {"message": "Logged out successfully."}, status=status.HTTP_200_OK
        )

        response.delete_cookie("access")
        response.delete_cookie("refresh")
        response.delete_cookie("csrftoken")
        return response


class RefreshTokenView(APIView):

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh")
        if not refresh_token:
            return Response(
                {"detail": "Refresh token missing"}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)
            new_refresh = str(token)

            response = Response({"success": True}, status=status.HTTP_200_OK)
            response.set_cookie("access", new_access, httponly=True)
            response.set_cookie("refresh", new_refresh, httponly=True)
            return response
        except TokenError:
            return Response(
                {"detail": "Invalid or expired refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )


class UserDeleteView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        try:
            user = request.user
            user.is_delete = True

            user.save()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class EditProfileView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [
        IsAuthenticated,
        RolePermissionFactory(["admin", "staff"]),
    ]

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(
            user,
            data=request.data,
            partial=True,
            context={
                "request": request
            },  # needed to access request.FILES in serializer
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"user": serializer.data}, status=status.HTTP_200_OK)

        return Response(
            {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )
