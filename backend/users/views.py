from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework.response import Response
from rest_framework import status
from utils.auth import JWTCookieAuthentication, RolePermissionFactory
from rest_framework.permissions import IsAuthenticated
from django.middleware.csrf import get_token
from .models import VerifyEmail, ChangePasswordViaEmail
from django.contrib.auth import get_user_model
from django.db import transaction
from utils.mail import send_email
from django.contrib.auth import authenticate
from .serializers import UserSerializer
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from utils.axes import get_lockout_message, is_user_locked
from django.core import signing
from axes.utils import reset as axes_reset



IS_TWOFA_MANDATORY = settings.IS_TWOFA_MANDATORY
BASE_URL = settings.BASE_URL

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
                {"error": "Already authenticated."},
                status=status.HTTP_200_OK,
            )

        email = request.data.get("email", "").strip()
        if not email:
            return Response(
                {"error": "Email is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(email=email).first()
        if not user:
            return Response(
                {"error": "Invalid Email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        VerifyEmail.objects.filter(user=user).delete()
        email_verif = VerifyEmail.objects.create(user=user)

        html_content = f"""
<div style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:8px;
    font-family:Arial, Helvetica, sans-serif;
    box-shadow:0 4px 10px rgba(0,0,0,0.1);
    overflow:hidden;
    border:1px solid #e5e7eb;
">
    <!-- Header -->
    <div style="
        background:#4f46e5;
        color:#ffffff;
        padding:20px;
        text-align:center;
    ">
        <h2 style="margin:0;font-weight:600;">CSSS IT Club</h2>
    </div>

    <!-- Body -->
    <div style="padding:30px;color:#1f2937;">
        <p style="margin-top:0;">
            Hello <strong>{user.full_name}</strong> 👋,
        </p>

        <p style="color:#4b5563;">
            You requested to verify your email address.
            Use the verification code below:
        </p>

        <!-- Verification Code -->
        <div style="
            margin:24px 0;
            text-align:center;
            font-size:28px;
            font-weight:bold;
            letter-spacing:4px;
            color:#4f46e5;
            background:#eef2ff;
            padding:14px 0;
            border-radius:6px;
        ">
            {email_verif.code}
        </div>

        <!-- Danger note -->
        <div style="
            margin-top:20px;
            padding:12px 14px;
            background:rgba(71, 45, 55, 0.3);
            border-left:4px solid #dc2626;
            border-radius:4px;
            color:#1f2937;
            font-size:14px;
        ">
            <strong style="color:#dc2626;">⚠️ Important:</strong>
            Do <strong>not share</strong> this verification code with anyone.
        </div>

        <p style="margin-top:26px;">
            Regards,<br>
            <strong>CSSS IT Club</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="
        background:#f9fafb;
        padding:12px;
        text-align:center;
        font-size:12px;
        color:#6b7280;
        border-top:1px solid #e5e7eb;
    ">
        If you did not request this email, you can safely ignore it.
    </div>
</div>
"""

        try:
            send_email(
                to_email=email,
                subject="Verify your email address",
                html_content=html_content,
                sender_name="CSSS IT Club",
            )

        except Exception as e:
            return Response(
                {"detail": f"Unable to send the code. {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Verification code sent successfully."},
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
                    user.twofa_enabled = True
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
        # Get and clean credentials
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "").strip()

        # Validate required fields
        if not email or not password:
            return Response(
                {"error": "Email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if user is locked
        is_locked, minutes, seconds = is_user_locked(request, email)

        if is_locked:
            lockout_message = get_lockout_message(minutes, seconds)
            return Response(
                {"error": lockout_message},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Authenticate user
        user = authenticate(request, email=email, password=password)

        if not user:
            return Response(
                {"error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        axes_reset(username=user.email)
        # Handle 2FA if enabled
        if getattr(settings, "IS_TWOFA_MANDATORY", False) or getattr(
            user, "twofa_enabled", False
        ):
            return self._handle_twofa(user, email)

        # Generate tokens and set cookies
        return self._generate_auth_response(user, request)

    def _handle_twofa(self, user, email):
        """Handle Two-Factor Authentication flow"""

        # Remove old verification codes
        VerifyEmail.objects.filter(user=user).delete()

        # Create new verification code
        email_verif = VerifyEmail.objects.create(user=user)

        html_content = f"""
        <div style="
            max-width:600px;
            margin:40px auto;
            background:#ffffff;
            border-radius:8px;
            font-family:Arial, Helvetica, sans-serif;
            box-shadow:0 4px 10px rgba(0,0,0,0.1);
            overflow:hidden;
            border:1px solid #e5e7eb;
        ">
            <!-- Header -->
            <div style="
                background:#4f46e5;
                color:#ffffff;
                padding:20px;
                text-align:center;
            ">
                <h2 style="margin:0;font-weight:600;">CSSS IT Club</h2>
            </div>

            <!-- Body -->
            <div style="padding:30px;color:#1f2937;">
                <p style="margin-top:0;">
                    Hello <strong>{user.full_name}</strong> 👋,
                </p>

                <p style="color:#4b5563;">
                    You requested to verify your email address.
                    Use the verification code below:
                </p>

                <!-- Verification Code -->
                <div style="
                    margin:24px 0;
                    text-align:center;
                    font-size:28px;
                    font-weight:bold;
                    letter-spacing:4px;
                    color:#4f46e5;
                    background:#eef2ff;
                    padding:14px 0;
                    border-radius:6px;
                ">
                    {email_verif.code}
                </div>

                <!-- Danger note -->
                <div style="
                    margin-top:20px;
                    padding:12px 14px;
                    background:rgba(71, 45, 55, 0.3);
                    border-left:4px solid #dc2626;
                    border-radius:4px;
                    color:#1f2937;
                    font-size:14px;
                ">
                    <strong style="color:#dc2626;">⚠️ Important:</strong>
                    Do <strong>not share</strong> this verification code with anyone.
                </div>

                <p style="margin-top:26px;">
                    Regards,<br>
                    <strong>CSSS IT Club</strong>
                </p>
            </div>

            <!-- Footer -->
            <div style="
                background:#f9fafb;
                padding:12px;
                text-align:center;
                font-size:12px;
                color:#6b7280;
                border-top:1px solid #e5e7eb;
            ">
                If you did not request this email, you can safely ignore it.
            </div>
        </div>
        """

        try:
            send_email(
                to_email=email,
                subject="Verify your email address",
                html_content=html_content,
                sender_name="CSSS IT Club",
            )
        except Exception:
            return Response(
                {
                    "error": "Unable to send the verification code.",
                    "email_sent": False,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Verification code sent successfully.",
                "verify_email": True,
            },
            status=status.HTTP_200_OK,
        )



    def _generate_auth_response(self, user, request):
        """Generate JWT tokens and set cookies"""
        refresh = RefreshToken.for_user(user)

        response = Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )

        # Set access token cookie
        response.set_cookie(
            "access",
            str(refresh.access_token),
            httponly=True,
            secure=True,
            samesite="Lax",
            max_age=60 * 15,  # 15 minutes
        )

        # Set refresh token cookie
        response.set_cookie(
            "refresh",
            str(refresh),
            httponly=True,
            secure=True,
            samesite="Lax",
            max_age=60 * 60 * 24 * 7,  # 7 days
        )

        # Set CSRF token
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


@method_decorator(csrf_protect, name="dispatch")
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
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"user": serializer.data}, status=status.HTTP_200_OK)

        return Response(
            {"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST
        )


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")

        if not new_password or not current_password:
            return Response(
                {"error": "All fields are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        if not user.check_password(current_password):
            return Response(
                {"error": "The current password is invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.check_password(new_password):
            return Response(
                {"error": "New password cannot match the current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response(
            {"message": "Password changed successfully."}, status=status.HTTP_200_OK
        )


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeViaEmailRequestView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        email = user.email

        ChangePasswordViaEmail.objects.filter(user=user).delete()

        change_pass = ChangePasswordViaEmail.objects.create(user=user)
        signed_code = signing.dumps(
            {
                "code": change_pass.code,
                "user_id": user.id,
            }
        )

        reset_url = f"{BASE_URL}/password/reset/{signed_code}/"

        html_content = f"""
        <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;box-shadow:0 4px 10px rgba(0,0,0,0.1);overflow:hidden;border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:#4f46e5;color:#ffffff;padding:20px;text-align:center;">
        <h2 style="margin:0;font-weight:600;">CSSS IT Club</h2>
    </div>

    <!-- Body -->
    <div style="padding:30px;color:#1f2937;">

        <p style="margin-top:0;margin-bottom:16px;">
            Hello <strong>{user.full_name}</strong>,
        </p>

        <p style="color:#4b5563;line-height:1.6;margin:0 0 20px 0;">
            We received a request to reset the password for your account.
            Click the button below to continue. If you did not request a password reset,
            you can safely ignore this email.
        </p>

        <!-- Button -->
        <div style="text-align:center;margin:32px 0;">
            <a href="{reset_url}"
               style="display:inline-block;padding:14px 30px;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;border-radius:6px;">
                Reset Your Password
            </a>
        </div>

        <p style="color:#4b5563;line-height:1.6;margin:0 0 16px 0;">
            If the button does not work, you may use the verification code below:
        </p>

        <!-- Verification Code -->
        <div style="margin:24px 0;text-align:center;font-size:28px;font-weight:bold;letter-spacing:4px;color:#4f46e5;background:#eef2ff;padding:16px 0;border-radius:6px;">
            {change_pass.code}
        </div>

        <!-- Security Notice -->
        <div style="margin-top:20px;padding:12px 14px;background:#fde8e8;border-left:4px solid #dc2626;border-radius:4px;color:#1f2937;font-size:14px;line-height:1.5;">
            <strong style="color:#dc2626;">⚠️ Security Notice</strong><br>
            Do <strong>not</strong> share this code or link with anyone.
            Our team will never ask for your password or verification code.
        </div>

        <p style="margin-top:26px;margin-bottom:0;">
            Regards,<br>
            <strong>CSSS IT Club</strong>
        </p>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:12px;text-align:center;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
        This password reset link and verification code will expire in 5 minutes for your security.
    </div>

</div>

        """

        try:
            send_email(
                to_email=email,
                subject="Password Change Verification Code",
                html_content=html_content,
                sender_name="CSSS IT Club",
            )

        except Exception as e:
            return Response(
                {"detail": f"Unable to send the verification code. {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Password change verification code sent successfully."},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class ConfPasswordChangeViaEmailView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request, signed_inst):
        try:
            change_pass_dic = signing.loads(signed_inst)
        except signing.BadSignature:
            return Response(
                {"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST
            )

        code = change_pass_dic["code"]
        user_id = change_pass_dic["user_id"]
        user = request.user
        if not user_id == user.id:
            return Response(
                {"error": "You are not allowed to perform this action."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            user = User.objects.get(id=user_id)
            change_pass = ChangePasswordViaEmail.objects.get(user=user, code=code)
        except ChangePasswordViaEmail.DoesNotExist:
            return Response(
                {"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST
            )

        if change_pass.is_expired():
            return Response(
                {"error": "This action has been expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "You can change your password now.",
                "signed_inst": signed_inst,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeViaEmailView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        signed_inst = request.data.get("signed_inst", "")
        new_password = request.data.get("new_password", "")

        try:
            change_pass_dic = signing.loads(signed_inst)
        except signing.BadSignature:
            return Response(
                {"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST
            )

        code = change_pass_dic["code"]
        user_id = change_pass_dic["user_id"]
        user = request.user
        if not user_id == user.id:
            return Response(
                {"error": "You are not allowed to perform this action."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = User.objects.get(id=user_id)
            change_pass = ChangePasswordViaEmail.objects.get(user=user, code=code)
        except ChangePasswordViaEmail.DoesNotExist:
            return Response(
                {"error": "Invalid request."}, status=status.HTTP_400_BAD_REQUEST
            )

        if change_pass.is_expired():
            return Response(
                {"error": "This action has been expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.check_password(new_password):
            return Response(
                {"error": "New password cannot match the current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            change_pass.delete()

        return Response({"message": "Successfully set your new password"})


@method_decorator(csrf_protect, name="dispatch")
class PasswordChangeViaCodeView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = request.data.get("code", None)
        new_password = request.data.get("new_password", "")

        user = request.user
        change_pass = ChangePasswordViaEmail.objects.filter(user=user).first()
        if not change_pass:
            return Response(
                {"error": "Request to change password hasn't been sent yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if change_pass.is_expired():
            return Response(
                {"error": "Code has been expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not change_pass.code == int(code):
            return Response(
                {"error": "Invalid code."}, status=status.HTTP_400_BAD_REQUEST
            )

        if user.check_password(new_password):
            return Response(
                {"error": "New password cannot match the current password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            user.set_password(new_password)
            user.save()
            change_pass.delete()

        return Response({"message": "Successfully set your new password"})


@method_decorator(csrf_protect, name="dispatch")
class EnableTwoFaView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.twofa_enabled:
            return Response(
                {"warning": "Two factor authentication is already enabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.twofa_enabled = True
        user.save()
        return Response(
            {"message": "Two factor authentication has been enabled."},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name="dispatch")
class DisableTwoFaView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if IS_TWOFA_MANDATORY:
            return Response(
                {"error": "Two factor authentication can't be disabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.twofa_enabled:
            return Response(
                {"warning": "Two factor authentication is already disabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.twofa_enabled = False
        user.save()
        return Response(
            {"message": "Two factor authentication has been disabled."},
            status=status.HTTP_200_OK,
        )
