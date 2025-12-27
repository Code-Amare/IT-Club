import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime
import re
import random
import string
from utils.auth import JWTCookieAuthentication, RolePermissionFactory
from users.models import Profile
from users.serializers import UserSerializer, ProfileSerializer
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .serializers import LanguageSerializer, FrameworkSerializer
from .models import Framework, Language
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect


User = get_user_model()


class StudentsView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Get query parameters
            search = request.query_params.get("search", "").strip()
            grade = request.query_params.get("grade", "").strip()
            section = request.query_params.get("section", "").strip()
            account_status = request.query_params.get("account_status", "").strip()
            sort_by = request.query_params.get("sort_by", "-user__date_joined")
            sort_order = request.query_params.get("sort_order", "desc")
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 10))

            # Build base queryset
            profiles = Profile.objects.select_related("user").all()

            # Apply text search across multiple fields
            if search:
                profiles = profiles.filter(
                    Q(user__full_name__icontains=search)
                    | Q(user__email__icontains=search)
                    | Q(
                        grade__icontains=search
                    )  # Fixed: grade is integer, but we can compare as string
                    | Q(section__icontains=search)
                    | Q(field__icontains=search)
                    | Q(account__icontains=search)
                    | Q(phone_number__icontains=search)
                )

            # Apply filters
            if grade:
                # Grade is PositiveSmallIntegerField, so we need to convert
                try:
                    grade_int = int(grade)
                    profiles = profiles.filter(grade=grade_int)
                except ValueError:
                    # If grade is not a valid integer, don't filter
                    pass

            if section:
                profiles = profiles.filter(section=section)

            if account_status:
                if account_status == "active":
                    profiles = profiles.filter(user__is_active=True)
                elif account_status == "inactive":
                    profiles = profiles.filter(user__is_active=False)

            # Apply sorting - handle both user and profile fields
            if sort_by.startswith("-"):
                sort_field = sort_by[1:]
                if sort_field in ["created_at", "updated_at"]:
                    # These are on Profile model
                    profiles = profiles.order_by(
                        f"-{sort_field}" if sort_order == "desc" else sort_field
                    )
                elif sort_field in ["date_joined", "last_login", "full_name", "email"]:
                    # These are on User model
                    profiles = profiles.order_by(
                        f"-user__{sort_field}"
                        if sort_order == "desc"
                        else f"user__{sort_field}"
                    )
                else:
                    # Default sorting
                    profiles = profiles.order_by(
                        f"-{sort_field}" if sort_order == "desc" else sort_field
                    )
            else:
                if sort_by in ["created_at", "updated_at"]:
                    profiles = profiles.order_by(
                        f"-{sort_by}" if sort_order == "desc" else sort_by
                    )
                elif sort_by in ["date_joined", "last_login", "full_name", "email"]:
                    profiles = profiles.order_by(
                        f"-user__{sort_by}"
                        if sort_order == "desc"
                        else f"user__{sort_by}"
                    )
                else:
                    profiles = profiles.order_by(
                        f"-{sort_by}" if sort_order == "desc" else sort_by
                    )

            # Calculate pagination
            total_count = profiles.count()
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_profiles = profiles[start_index:end_index]

            # Prepare response data
            students_data = []
            for profile in paginated_profiles:
                student_data = {
                    "id": profile.user.id,
                    "full_name": profile.user.full_name,
                    "email": profile.user.email,
                    "grade": profile.grade,
                    "section": profile.section,
                    "field": profile.field,
                    "account": profile.account,
                    "phone_number": profile.phone_number,
                    "account_status": (
                        "active" if profile.user.is_active else "inactive"
                    ),
                    "profile_pic_url": profile.user.profile_pic_id,  # Fixed: using profile_pic_id instead of profile_pic_url
                    "created_at": profile.created_at,
                    "updated_at": profile.updated_at,
                    "date_joined": profile.user.date_joined,
                }
                students_data.append(student_data)

            # Calculate statistics
            total_students = Profile.objects.count()
            active_students = Profile.objects.filter(user__is_active=True).count()
            inactive_students = Profile.objects.filter(user__is_active=False).count()

            # Get grade distribution
            grade_distribution = {}
            grade_counts = Profile.objects.values("grade").annotate(
                count=Count("grade")
            )
            for item in grade_counts:
                if item["grade"]:
                    grade_distribution[str(item["grade"])] = item[
                        "count"
                    ]  # Convert grade to string for JSON

            # Get section distribution
            section_distribution = {}
            section_counts = Profile.objects.values("section").annotate(
                count=Count("section")
            )
            for item in section_counts:
                if item["section"]:
                    section_distribution[item["section"]] = item["count"]

            response_data = {
                "students": students_data,
                "pagination": {
                    "current_page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": (
                        (total_count + page_size - 1) // page_size
                        if page_size > 0
                        else 0
                    ),
                },
                "stats": {
                    "total": total_students,
                    "active": active_students,
                    "inactive": inactive_students,
                    "by_grade": grade_distribution,
                    "by_section": section_distribution,
                },
                "filters": {
                    "available_grades": list(
                        Profile.objects.values_list("grade", flat=True).distinct()
                    ),
                    "available_sections": list(
                        Profile.objects.values_list("section", flat=True).distinct()
                    ),
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to fetch students"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentDetailView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def _get_profile(self, student_id):
        try:
            return Profile.objects.select_related("user").get(user_id=student_id)
        except Profile.DoesNotExist:
            return Profile.objects.select_related("user").get(id=student_id)

    def get(self, request, student_id):
        try:
            profile = self._get_profile(student_id)

            # best-effort profile pic URL (if ImageField used)
            profile_pic_url = None
            user = profile.user
            if hasattr(user, "profile_pic") and getattr(user, "profile_pic"):
                try:
                    profile_pic_url = user.profile_pic.url
                except Exception:
                    profile_pic_url = getattr(user, "profile_pic_id", None)
            else:
                profile_pic_url = getattr(user, "profile_pic_id", None)

            student_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account,
                "phone_number": profile.phone_number,
                "address": profile.address if hasattr(profile, "address") else None,
                "date_of_birth": getattr(profile, "date_of_birth", None),
                "account_status": "active" if user.is_active else "inactive",
                "profile_pic_url": profile_pic_url,
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
                "last_login": user.last_login,
                "date_joined": user.date_joined,
                "profile_id": profile.id,
                "notes": getattr(profile, "notes", None),
                "parent_name": getattr(profile, "parent_name", None),
                "homeroom_teacher": getattr(profile, "homeroom_teacher", None),
                "academic_year": getattr(profile, "academic_year", None),
            }

            return Response({"student": student_data}, status=status.HTTP_200_OK)

        except Profile.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to fetch student details"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, student_id):
        try:
            profile = self._get_profile(student_id)
            user = profile.user

            # Accept both nested payloads and flat payloads
            user_data = (
                request.data.get("user")
                if isinstance(request.data.get("user"), dict)
                else {}
            )
            profile_data = (
                request.data.get("profile")
                if isinstance(request.data.get("profile"), dict)
                else {}
            )

            # If top-level fields were sent flat, merge them
            if not user_data:
                for k in ("full_name", "email", "is_active"):
                    if k in request.data:
                        user_data[k] = request.data.get(k)
            if not profile_data:
                for k in ("grade", "section", "field", "account", "phone_number"):
                    if k in request.data:
                        profile_data[k] = request.data.get(k)

            with transaction.atomic():
                if "full_name" in user_data:
                    user.full_name = user_data["full_name"]
                if "email" in user_data:
                    user.email = user_data["email"]
                if "is_active" in user_data:
                    user.is_active = bool(user_data["is_active"])
                user.save()

                if "grade" in profile_data:
                    try:
                        profile.grade = (
                            int(profile_data["grade"])
                            if profile_data["grade"] not in (None, "")
                            else None
                        )
                    except (ValueError, TypeError):
                        profile.grade = None
                if "section" in profile_data:
                    profile.section = profile_data["section"]
                if "field" in profile_data:
                    profile.field = profile_data["field"]
                if "account" in profile_data:
                    profile.account = profile_data["account"]
                if "phone_number" in profile_data:
                    profile.phone_number = profile_data["phone_number"]
                profile.save()

            return Response(
                {"message": "Student updated successfully"}, status=status.HTTP_200_OK
            )

        except Profile.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to update student"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, student_id):
        try:
            profile = self._get_profile(student_id)
            user = profile.user
            with transaction.atomic():
                user.is_active = False
                # if your User model has is_deleted; otherwise implement soft-delete differently
                if hasattr(user, "is_deleted"):
                    user.is_deleted = True
                user.save()

            return Response(
                {"message": "Student deactivated successfully"},
                status=status.HTTP_200_OK,
            )

        except Profile.DoesNotExist:
            return Response(
                {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to deactivate student"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentCreateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        try:
            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            grade = (request.data.get("grade") or "").strip()
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "").strip()
            phone_number = (request.data.get("phone_number") or "").strip()
            account_status = request.data.get("account_status", "active")

            if not email:
                return Response(
                    {"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
                )
            if not full_name:
                return Response(
                    {"error": "Full name is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                validate_email(email)
            except ValidationError:
                return Response(
                    {"error": "Invalid email format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if User.objects.filter(email=email).exists():
                return Response(
                    {"error": "User with this email already exists"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    full_name=full_name,
                    is_active=(account_status == "active"),
                    role="user",
                )

                profile = Profile.objects.create(
                    user=user,
                    grade=int(grade) if grade and grade.isdigit() else None,
                    section=section or None,
                    field=field or None,
                    account=account or None,
                    phone_number=phone_number or None,
                )

            response_data = {
                "student": {
                    "id": user.id,
                    "full_name": user.full_name,
                    "email": user.email,
                    "grade": profile.grade,
                    "section": profile.section,
                    "field": profile.field,
                    "account": profile.account,
                    "phone_number": profile.phone_number,
                    "account_status": "active" if user.is_active else "inactive",
                    "created_at": profile.created_at,
                },
                "message": "Student created successfully",
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to create student"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentsBulkUploadView(APIView):
    """
    View for bulk uploading students from CSV/Excel files
    """

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        try:
            if "file" not in request.FILES:
                return Response(
                    {"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST
                )

            file = request.FILES["file"]
            file_extension = file.name.split(".")[-1].lower()

            # Read file with pandas
            try:
                if file_extension == "csv":
                    df = pd.read_csv(file)
                elif file_extension in ["xlsx", "xls"]:
                    df = pd.read_excel(file)
                else:
                    return Response(
                        {"error": "Unsupported file format. Use CSV or Excel"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Exception as e:
                return Response(
                    {"error": f"Failed to read file: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate required columns
            required_columns = ["full_name", "email"]
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return Response(
                    {
                        "error": f'Missing required columns: {", ".join(missing_columns)}'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            created_students = []
            errors = []

            with transaction.atomic():
                for index, row in df.iterrows():
                    try:
                        # Prepare data
                        email = str(row["email"]).strip().lower()
                        full_name = str(row.get("full_name", "")).strip()

                        # Check if email is valid
                        try:
                            validate_email(email)
                        except ValidationError:
                            errors.append(
                                {
                                    "row": index + 1,
                                    "error": f"Invalid email format: {email}",
                                }
                            )
                            continue

                        # Check if user already exists
                        if User.objects.filter(email=email).exists():
                            errors.append(
                                {
                                    "row": index + 1,
                                    "error": f"User with email {email} already exists",
                                }
                            )
                            continue

                        # Generate random password
                        temp_password = "".join(
                            random.choices(string.ascii_letters + string.digits, k=12)
                        )

                        # Create user
                        user = User.objects.create_user(
                            email=email,
                            full_name=full_name or email.split("@")[0],
                            password=temp_password,
                            is_active=True,  # Default to active
                            role="user",  # Set role to 'user' for students
                        )

                        # Create profile with optional fields
                        grade_str = str(row.get("grade", "")).strip()
                        grade = (
                            int(grade_str)
                            if grade_str and grade_str.isdigit()
                            else None
                        )

                        profile = Profile.objects.create(
                            user=user,
                            grade=grade,
                            section=str(row.get("section", "")).strip(),
                            field=str(row.get("field", "")).strip(),
                            account=str(row.get("account", "")).strip(),
                            phone_number=str(row.get("phone_number", "")).strip(),
                        )

                        created_students.append(
                            {
                                "id": user.id,
                                "full_name": user.full_name,
                                "email": user.email,
                                "grade": profile.grade,
                                "section": profile.section,
                                "field": profile.field,
                                "account": profile.account,
                                "phone_number": profile.phone_number,
                                "temporary_password": temp_password,
                            }
                        )

                    except Exception as e:
                        errors.append({"row": index + 1, "error": str(e)})

            response_data = {
                "created_count": len(created_students),
                "created_students": created_students,
                "error_count": len(errors),
                "errors": errors,
            }

            if errors:
                status_code = status.HTTP_207_MULTI_STATUS
            else:
                status_code = status.HTTP_201_CREATED

            return Response(response_data, status=status_code)

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to process bulk upload"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentsExportView(APIView):
    """
    View for exporting students to CSV/Excel
    """

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Get query parameters for filtering
            search = request.query_params.get("search", "").strip()
            grade = request.query_params.get("grade", "").strip()
            section = request.query_params.get("section", "").strip()
            account_status = request.query_params.get("account_status", "").strip()
            format_type = request.query_params.get("format", "csv")

            # Get filtered students
            profiles = Profile.objects.select_related("user").all()

            if search:
                profiles = profiles.filter(
                    Q(user__full_name__icontains=search)
                    | Q(user__email__icontains=search)
                    | Q(grade__icontains=search)
                    | Q(section__icontains=search)
                )

            if grade:
                try:
                    grade_int = int(grade)
                    profiles = profiles.filter(grade=grade_int)
                except ValueError:
                    pass

            if section:
                profiles = profiles.filter(section=section)

            if account_status:
                if account_status == "active":
                    profiles = profiles.filter(user__is_active=True)
                elif account_status == "inactive":
                    profiles = profiles.filter(user__is_active=False)

            # Prepare data for pandas
            data = []
            for profile in profiles:
                data.append(
                    {
                        "Full Name": profile.user.full_name,
                        "Email": profile.user.email,
                        "Grade": profile.grade or "",
                        "Section": profile.section or "",
                        "Field": profile.field or "",
                        "Account": profile.account or "",
                        "Phone Number": profile.phone_number or "",
                        "Account Status": (
                            "Active" if profile.user.is_active else "Inactive"
                        ),
                        "Created At": profile.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                        "Last Login": (
                            profile.user.last_login.strftime("%Y-%m-%d %H:%M:%S")
                            if profile.user.last_login
                            else ""
                        ),
                        "Date Joined": profile.user.date_joined.strftime(
                            "%Y-%m-%d %H:%M:%S"
                        ),
                    }
                )

            # Create DataFrame
            df = pd.DataFrame(data)

            # Create response
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

            if format_type == "csv":
                # Convert to CSV
                csv_data = df.to_csv(index=False)
                response = HttpResponse(csv_data, content_type="text/csv")
                filename = f"students_export_{timestamp}.csv"
                response["Content-Disposition"] = f'attachment; filename="{filename}"'

            elif format_type == "excel":
                # Convert to Excel
                output = BytesIO()
                with pd.ExcelWriter(output, engine="openpyxl") as writer:
                    df.to_excel(writer, index=False, sheet_name="Students")
                output.seek(0)

                response = HttpResponse(
                    output.getvalue(),
                    content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
                filename = f"students_export_{timestamp}.xlsx"
                response["Content-Disposition"] = f'attachment; filename="{filename}"'

            else:
                return Response(
                    {"error": "Unsupported format. Use csv or excel"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            return response

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to export students"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentsStatsView(APIView):
    """
    View for student statistics
    """

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Basic stats
            total_students = Profile.objects.count()
            active_students = Profile.objects.filter(user__is_active=True).count()
            inactive_students = Profile.objects.filter(user__is_active=False).count()

            # Grade distribution
            grade_distribution = {}
            grade_counts = (
                Profile.objects.values("grade")
                .annotate(count=Count("grade"))
                .order_by("grade")
            )
            for item in grade_counts:
                if item["grade"]:
                    grade_distribution[str(item["grade"])] = item["count"]

            # Section distribution
            section_distribution = {}
            section_counts = (
                Profile.objects.values("section")
                .annotate(count=Count("section"))
                .order_by("section")
            )
            for item in section_counts:
                if item["section"]:
                    section_distribution[item["section"]] = item["count"]

            # Field distribution
            field_distribution = {}
            field_counts = (
                Profile.objects.values("field")
                .annotate(count=Count("field"))
                .order_by("field")
            )
            for item in field_counts:
                if item["field"]:
                    field_distribution[item["field"]] = item["count"]

            # Account distribution
            account_distribution = {}
            account_counts = (
                Profile.objects.values("account")
                .annotate(count=Count("account"))
                .order_by("account")
            )
            for item in account_counts:
                if item["account"]:
                    account_distribution[item["account"]] = item["count"]

            # Monthly registration trend (last 12 months)
            from django.db.models.functions import TruncMonth

            twelve_months_ago = timezone.now() - timezone.timedelta(days=365)
            monthly_trend = (
                Profile.objects.filter(created_at__gte=twelve_months_ago)
                .annotate(month=TruncMonth("created_at"))
                .values("month")
                .annotate(count=Count("id"))
                .order_by("month")
            )

            # Prepare trend data
            trend_data = []
            for item in monthly_trend:
                trend_data.append(
                    {"month": item["month"].strftime("%Y-%m"), "count": item["count"]}
                )

            response_data = {
                "overall": {
                    "total": total_students,
                    "active": active_students,
                    "inactive": inactive_students,
                    "active_percentage": (
                        round((active_students / total_students * 100), 2)
                        if total_students > 0
                        else 0
                    ),
                },
                "distributions": {
                    "by_grade": grade_distribution,
                    "by_section": section_distribution,
                    "by_field": field_distribution,
                    "by_account": account_distribution,
                },
                "trends": {"monthly_registrations": trend_data},
                "last_updated": timezone.now().isoformat(),
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to fetch statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentTemplateView(APIView):

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Create template data with correct field names from Profile model
            template_data = [
                {
                    "full_name": "John Doe",
                    "email": "john.doe@example.com",
                    "grade": "10",
                    "section": "A",
                    "field": "frontend",  # Using actual choice values
                    "account": "Premium",
                    "phone_number": "+1234567890",
                },
                {
                    "full_name": "Jane Smith",
                    "email": "jane.smith@example.com",
                    "grade": "11",
                    "section": "B",
                    "field": "backend",  # Using actual choice values
                    "account": "Basic",
                    "phone_number": "+1987654321",
                },
            ]

            df = pd.DataFrame(template_data)

            # Convert to CSV
            csv_data = df.to_csv(index=False)
            response = HttpResponse(csv_data, content_type="text/csv")
            response["Content-Disposition"] = (
                'attachment; filename="students_template.csv"'
            )

            return response

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to download template"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LanguageGetAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        languages = Language.objects.all()
        serializer = LanguageSerializer(languages, many=True)
        return Response(serializer.data)


class LanguageDetailAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            languages = Language.objects.get(pk=pk)
        except Language.DoesNotExist:
            return Response({"error": f"Language with {pk} doesn't exist."}, status=status.HTTP_404_NOT_FOUND)
        serializer = LanguageSerializer(languages)
        return Response(serializer.data)


@method_decorator(csrf_protect, name="dispatch")
class LanguageAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        serializer = LanguageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

    
    def delete(self, request, pk):
        try:
            languages = Language.objects.get(pk=pk)
        except Language.DoesNotExist:
            return Response({"error": f"Language with {pk} doesn't exist."}, status=status.HTTP_404_NOT_FOUND)
        languages.delete()
        return Response({"message": "Language deleted successfully"}, status=status.HTTP_200_OK)

    def patch(self, request, pk=None):
        if not pk:
            return Response(
                {"detail": "Language ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            language = Language.objects.get(pk=pk)
        except Language.DoesNotExist:
            return Response(
                {"detail": "Language not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = LanguageSerializer(language, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class LanguageBulkAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        serializer = LanguageSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FrameworkGetAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        frameworks = Framework.objects.all()
        serializer = FrameworkSerializer(frameworks, many=True)
        return Response(serializer.data)


@method_decorator(csrf_protect, name="dispatch")
class FrameworkAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        serializer = FrameworkSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk=None):
        if not pk:
            return Response(
                {"detail": "Framework ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            framework = Framework.objects.get(pk=pk)
        except Framework.DoesNotExist:
            return Response(
                {"detail": "Framework not found"}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = FrameworkSerializer(framework, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class FrameworkBulkAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        serializer = FrameworkSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
