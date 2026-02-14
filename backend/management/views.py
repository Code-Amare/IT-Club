import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django.http import HttpResponse
from io import BytesIO
from datetime import datetime
from utils.auth import JWTCookieAuthentication, IsSuperUser
from users.models import Profile
from users.serializers import UserSerializer, ProfileSerializer, UserInverseSerializer
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .serializers import LanguageSerializer, FrameworkSerializer, SettingSerializer
from learning_task.serializers import (
    LearningTaskSerializer,
    LearningTaskLimitSerializer,
)
import io
from learning_task.models import LearningTaskLimit
from .models import Framework, Language, Setting
from attendance.models import Attendance, AttendanceSession
from learning_task.models import LearningTask, TaskReview
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.db.models import (
    Count,
    Q,
    F,
    Sum,
    When,
    Case,
    Value,
    FloatField,
    Avg,
)
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta
import math
from learning_task.models import LearningTaskLimit
import openpyxl
import environ
import cloudinary
import cloudinary.utils
from pathlib import Path
from asgiref.sync import async_to_sync
from utils.notif import notify_user, notify_users_bulk

from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch


env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent
environ.Env.read_env(str(BASE_DIR / ".env"))

cloudinary.config(
    cloud_name=env("CLOUD_NAME"),
    api_key=env("API_KEY"),
    api_secret=env("API_SECRET"),
    secure=True,
)

User = get_user_model()


class StudentsView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        try:
            search = request.query_params.get("search", "").strip()
            grade = request.query_params.get("grade", "").strip()
            section = request.query_params.get("section", "").strip()
            field = request.query_params.get("field", "").strip()
            account_status = request.query_params.get("accountStatus", "").strip()
            sort_by = request.query_params.get("sort_by", "-user__date_joined")
            sort_order = request.query_params.get("sort_order", "desc")
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 10))

            # Base queryset for all students (used for stats and filter options)
            base_profiles = Profile.objects.select_related("user").filter(
                user__role="user"
            )

            # Get distinct grades and sections for filter dropdowns (from all students)
            all_grades = (
                base_profiles.exclude(grade__isnull=True)
                .values_list("grade", flat=True)
                .distinct()
                .order_by("grade")
            )
            all_sections = (
                base_profiles.exclude(section__isnull=True)
                .exclude(section="")
                .values_list("section", flat=True)
                .distinct()
                .order_by("section")
            )
            all_fields = (
                base_profiles.exclude(field__isnull=True)
                .exclude(field="")
                .values_list("field", flat=True)
                .distinct()
                .order_by("field")
            )

            filter_options = {
                "grades": list(all_grades),
                "sections": list(all_sections),
                "fields": list(all_fields),
            }

            # Now build the main queryset with annotations for the table
            profiles = base_profiles.annotate(
                total_sessions_attended=Count("user__attendances", distinct=True),
                present_count=Count(
                    "user__attendances",
                    filter=Q(user__attendances__status="present"),
                ),
                late_count=Count(
                    "user__attendances", filter=Q(user__attendances__status="late")
                ),
                absent_count=Count(
                    "user__attendances",
                    filter=Q(user__attendances__status="absent"),
                ),
                special_case_count=Count(
                    "user__attendances",
                    filter=Q(user__attendances__status="special_case"),
                ),
            )

            # Attendance percentage
            profiles = profiles.annotate(
                attendance_percentage=Case(
                    When(total_sessions_attended=0, then=Value(0.0)),
                    default=(
                        100.0
                        * (F("present_count") + F("late_count"))
                        / (
                            F("present_count")
                            + F("late_count")
                            + F("absent_count")
                            + F("special_case_count")
                        )
                    ),
                    output_field=FloatField(),
                )
            )

            # Apply filters
            if search:
                search_filter = (
                    Q(user__full_name__icontains=search)
                    | Q(user__email__icontains=search)
                    | Q(grade__icontains=search)
                    | Q(section__icontains=search)
                    | Q(field__icontains=search)
                )
                profiles = profiles.filter(search_filter)

            if grade:
                try:
                    profiles = profiles.filter(grade=int(grade))
                except ValueError:
                    pass

            if section:
                profiles = profiles.filter(section__iexact=section)

            if field:
                profiles = profiles.filter(field__iexact=field)

            if account_status:
                if account_status.lower() == "active":
                    profiles = profiles.filter(user__is_active=True)
                elif account_status.lower() == "inactive":
                    profiles = profiles.filter(user__is_active=False)

            # Sorting
            sort_mapping = {
                "full_name": "user__full_name",
                "email": "user__email",
                "grade": "grade",
                "section": "section",
                "field": "field",
                "account_status": "user__is_active",
                "attendance_percentage": "attendance_percentage",
                "total_sessions": "total_sessions_attended",
            }

            sort_field = sort_by.lstrip("-")
            db_sort_field = sort_mapping.get(sort_field, "user__date_joined")
            profiles = profiles.order_by(
                f"-{db_sort_field}" if sort_by.startswith("-") else db_sort_field
            )

            # Pagination
            total_count = profiles.count()
            total_pages = math.ceil(total_count / page_size) if page_size > 0 else 1
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_profiles = profiles[start_index:end_index]

            # Helper: calculate rating from percentage
            def get_attendance_rating(percentage):
                if percentage >= 90:
                    return "excellent"
                if percentage >= 75:
                    return "good"
                if percentage >= 50:
                    return "average"
                if percentage >= 0:
                    return "poor"
                return "No data"

            students_data = []
            for profile in paginated_profiles:
                user = profile.user
                profile_pic_url, _ = cloudinary.utils.cloudinary_url(
                    user.profile_pic_id,
                    resource_type="image",
                    type="authenticated",
                    sign_url=True,
                    secure=True,
                )

                last_attendance = user.attendances.order_by("-attended_at").first()
                recent_attendance_30d = user.attendances.filter(
                    attended_at__gte=timezone.now() - timedelta(days=30)
                )
                recent_total = recent_attendance_30d.filter(
                    status__in=["present", "late", "absent", "special_case"]
                ).count()
                recent_present_late = recent_attendance_30d.filter(
                    status__in=["present", "late"]
                ).count()
                recent_percentage = (
                    (recent_present_late / recent_total * 100)
                    if recent_total > 0
                    else 0
                )

                attendance_percentage = round(profile.attendance_percentage or 0, 2)
                attendance_rating = get_attendance_rating(attendance_percentage)

                students_data.append(
                    {
                        "id": user.id,
                        "full_name": user.full_name or "",
                        "email": user.email or "",
                        "grade": profile.grade or "",
                        "section": profile.section or "",
                        "field": profile.field or "",
                        "profile_pic_url": profile_pic_url or "",
                        "account_status": "active" if user.is_active else "inactive",
                        "attendance": {
                            "total_sessions": profile.total_sessions_attended or 0,
                            "present": profile.present_count or 0,
                            "late": profile.late_count or 0,
                            "absent": profile.absent_count or 0,
                            "special_case": profile.special_case_count or 0,
                            "attendance_percentage": attendance_percentage,
                            "attendance_rating": attendance_rating,
                            "recent_percentage": round(recent_percentage, 2),
                            "last_attendance_date": (
                                last_attendance.attended_at.isoformat()
                                if last_attendance
                                else None
                            ),
                            "last_attendance_status": (
                                last_attendance.status if last_attendance else None
                            ),
                        },
                    }
                )

            attendance_counts = Attendance.objects.aggregate(
                total_present=Count("id", filter=Q(status="present")),
                total_late=Count("id", filter=Q(status="late")),
                total_absent=Count("id", filter=Q(status="absent")),
                total_special_case=Count("id", filter=Q(status="special_case")),
            )

            total_records = (
                attendance_counts["total_present"]
                + attendance_counts["total_late"]
                + attendance_counts["total_absent"]
                + attendance_counts["total_special_case"]
            )

            average_attendance = (
                (attendance_counts["total_present"] + attendance_counts["total_late"])
                / total_records
                * 100
                if total_records > 0
                else 0
            )

            active_students = Profile.objects.filter(user__is_active=True).count()
            inactive_students = Profile.objects.filter(user__is_active=False).count()
            total_students = User.objects.filter(role="user").count()

            return Response(
                {
                    "students": students_data,
                    "pagination": {
                        "current_page": page,
                        "page_size": page_size,
                        "total_count": total_count,
                        "total_pages": total_pages,
                    },
                    "stats": {
                        "attendance_avg": average_attendance,
                        "total": total_students,
                        "active": active_students,
                        "inactive": inactive_students,
                    },
                    "filter_options": filter_options,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            print(f"Error in StudentsView: {e}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e), "detail": "Failed to fetch students"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TopLearningTasks(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, boundary):
        top_tasks = LearningTask.objects.annotate(
            admin_rating=Avg("reviews__rating", filter=Q(reviews__is_admin=True)),
            likes_count=Count("likes", distinct=True),
        ).order_by("-admin_rating", "-likes_count")[:boundary]
        top_learning_tasks = LearningTaskSerializer(top_tasks, many=True)
        return Response({"top_learning_tasks": top_learning_tasks.data})


@method_decorator(csrf_protect, name="dispatch")
class StudentUpdateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="user")
            profile = Profile.objects.get(user=user)

            errors = {}

            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            gender = (request.data.get("gender") or "").strip().lower()
            grade = request.data.get("grade")
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "N/A").strip()
            phone_number = (request.data.get("phone_number") or "").strip()
            account_status = request.data.get("account_status", "active")
            task_limit = request.data.get("task_limit")
            profile_pic = request.FILES.get("profile_pic")

            if profile_pic:
                if profile_pic.size > 10 * 1024 * 1024:

                    errors["profile_pic"] = ["Profile picture must be less than 10MB"]

                if not profile_pic.content_type.startswith("image/"):
                    errors["profile_pic"] = ["Only image files are allowed"]

            if not email:
                errors["email"] = ["Email is required"]
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["email"] = ["Invalid email format"]

            if (
                email
                and user.email != email
                and User.objects.filter(email=email).exists()
            ):
                errors["email"] = ["User with this email already exists"]

            if not full_name:
                errors["full_name"] = ["Full name is required"]

            if gender not in ["male", "female", "other"]:
                errors["gender"] = ["Gender must be male, female, or other"]

            try:
                grade = int(grade)
                if grade < 1 or grade > 12:
                    raise ValueError
            except Exception:
                errors["grade"] = ["Grade must be between 1 and 12"]

            if not section or len(section) != 1 or not section.isalpha():
                errors["section"] = ["Section must be a single letter (A-Z)"]

            if not field:
                errors["field"] = ["Field is required"]

            if not phone_number:
                errors["phone_number"] = ["Phone number is required"]

            if task_limit is None or int(task_limit) < 0:
                errors["task_limit"] = ["Task limit must be a positive number"]

            if errors:
                return Response(
                    {"detail": "Validation failed", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # -------- atomic update --------
            with transaction.atomic():

                # update task limit
                limit_obj, _ = LearningTaskLimit.objects.get_or_create(user=user)
                limit_obj.limit = task_limit
                limit_obj.save()

                # update user (incl. profile_pic)
                user_serializer = UserSerializer(
                    user,
                    data={
                        "email": email,
                        "full_name": full_name,
                        "gender": gender,
                        "is_active": account_status == "active",
                    },
                    partial=True,
                    context={"request": request},
                )
                user_serializer.is_valid(raise_exception=True)
                user_serializer.save()

                # update profile
                profile.grade = grade
                profile.section = section.upper()
                profile.field = field
                profile.account = account
                profile.phone_number = phone_number
                profile.save()

            return Response(
                {
                    "message": "Student updated successfully",
                    "user": user_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            return Response(
                {"detail": "Student not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Student profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentDetailView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request, student_id):
        try:
            profile = Profile.objects.select_related("user").get(
                user__id=student_id, user__role="user"
            )
            user = profile.user

            profile_data = ProfileSerializer(profile).data

            profile_pic_url = None
            if user.profile_pic_id:
                try:
                    profile_pic_url, _ = cloudinary.utils.cloudinary_url(
                        user.profile_pic_id,
                        resource_type="image",
                        type="authenticated",
                        sign_url=True,
                        secure=True,
                    )
                except Exception:
                    profile_pic_url = None

            attendance_counts = user.attendances.aggregate(
                total_present=Count("id", filter=Q(status="present")),
                total_late=Count("id", filter=Q(status="late")),
                total_absent=Count("id", filter=Q(status="absent")),
                total_special_case=Count("id", filter=Q(status="special_case")),
            )
            total_attendance = sum(v or 0 for v in attendance_counts.values())
            attendance_percentages = {
                "present": (
                    round(
                        (attendance_counts["total_present"] or 0)
                        / total_attendance
                        * 100,
                        2,
                    )
                    if total_attendance
                    else 0.0
                ),
                "late": (
                    round(
                        (attendance_counts["total_late"] or 0) / total_attendance * 100,
                        2,
                    )
                    if total_attendance
                    else 0.0
                ),
                "absent": (
                    round(
                        (attendance_counts["total_absent"] or 0)
                        / total_attendance
                        * 100,
                        2,
                    )
                    if total_attendance
                    else 0.0
                ),
                "special_case": (
                    round(
                        (attendance_counts["total_special_case"] or 0)
                        / total_attendance
                        * 100,
                        2,
                    )
                    if total_attendance
                    else 0.0
                ),
            }

            tasks_qs = LearningTask.objects.filter(user=user).exclude(status="draft")
            for task in tasks_qs:
                print(task.title)

            total_tasks_created = tasks_qs.count()

            # Admin rating only + bonus
            total_rating = 0
            for task in tasks_qs.prefetch_related("reviews", "bonuses"):
                admin_review = task.reviews.filter(is_admin=True).first()
                task_bonus = getattr(task, "bonuses", None)
                task_score = 0
                if admin_review:
                    task_score += admin_review.rating
                if task_bonus:
                    task_score += task_bonus.score
                total_rating += task_score

            task_limit, _ = LearningTaskLimit.objects.get_or_create(user=user)
            task_limit_data = LearningTaskLimitSerializer(task_limit).data

            student_data = {
                "profile": profile_data,
                "profile_pic_url": profile_pic_url,
                "attendance_summary": {
                    "status_counts": attendance_counts,
                    "status_percentages": attendance_percentages,
                    "total": total_attendance,
                },
                "learning_tasks": {
                    "total_created": total_tasks_created,
                    "total_admin_rating_plus_bonus": total_rating,
                },
                "task_limit": task_limit_data,
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


class StudentDataView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        try:
            student = User.objects.get(id=student_id)
            student_serializer = UserInverseSerializer(student)
            student_data = student_serializer.data
            task_limit, created = LearningTaskLimit.objects.get_or_create(user=student)

            return Response(
                {
                    "student": {
                        "id": student_data["id"],
                        "full_name": student_data["full_name"],
                        "email": student_data["email"],
                        "gender": student_data["gender"],
                        "grade": student_data["profile"]["grade"],
                        "section": student_data["profile"]["section"],
                        "field": student_data["profile"]["field"],
                        "phone_number": student_data["profile"]["phone_number"],
                        "account": student_data["profile"]["account"],
                        "account_status": (
                            "active" if student_data["is_active"] else "inactive"
                        ),
                        "profile_pic_url": student_data["profile_pic_url"],
                        "task_limit": {"limit": task_limit.limit},
                    }
                },
                status=status.HTTP_200_OK,
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."}, status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_protect, name="dispatch")
class StudentDeleteView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, role="user")
        except User.DoesNotExist:
            return None

    def delete(self, request, pk):
        try:
            user = self.get_object(pk)
            if not user:
                return Response(
                    {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
                )

            student_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
            }

            with transaction.atomic():
                Profile.objects.filter(user=user).delete()
                user.delete()

            return Response(
                {
                    "message": "Student deleted successfully",
                    "deleted_student": student_data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            import traceback

            print(f"Error deleting student: {str(e)}")
            print(traceback.format_exc())

            return Response(
                {
                    "error": "Failed to delete student",
                    "detail": "An unexpected error occurred",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_protect, name="dispatch")
class StudentCreateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    FIELD_LIST = ["ai", "other", "backend", "frontend", "embedded", "cyber"]

    def post(self, request):
        try:
            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            grade = request.data.get("grade")
            section = (request.data.get("section") or "").strip().upper()
            field = (request.data.get("field") or "").strip().lower()
            account = (request.data.get("account") or "N/A").strip()
            phone_number = (request.data.get("phone_number") or "").strip()

            # Validate all required fields
            errors = {}

            if not email:
                errors["email"] = ["Email is required"]
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["email"] = ["Invalid email format"]

            if not full_name:
                errors["full_name"] = ["Full name is required"]

            if grade is None:
                errors["grade"] = ["Grade is required"]
            else:
                try:
                    grade = int(grade)
                    if grade < 1 or grade > 12:
                        errors["grade"] = ["Grade must be between 1 and 12"]
                except (ValueError, TypeError):
                    errors["grade"] = ["Grade must be a valid number"]

            if not section:
                errors["section"] = ["Section is required"]
            elif len(section) != 1 or not section.isalpha():
                errors["section"] = ["Section must be a single letter (A-Z)"]

            if not field:
                errors["field"] = ["Field is required"]

            if field not in self.FIELD_LIST:
                errors["field"] = ["Invalid field name"]

            if not phone_number:
                errors["phone_number"] = ["Phone number is required"]

            # Check for existing email
            if (
                email
                and not errors.get("email")
                and User.objects.filter(email=email).exists()
            ):
                errors["email"] = ["User with this email already exists"]

            if errors:
                return Response(
                    {"detail": "Validation failed", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    email=email,
                    full_name=full_name,
                    is_active=True,  # Always active on creation
                    role="user",
                )

                # Create profile with proper field values
                profile = Profile.objects.create(
                    user=user,
                    grade=grade,
                    section=section,
                    field=field,
                    account=account,
                    phone_number=phone_number,
                )

                LearningTaskLimit.objects.create(user=user)

            response_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account,
                "phone_number": profile.phone_number,
                "account_status": "active",
                "created_at": profile.created_at,
                "message": "Student created successfully",
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {"detail": "Validation error", "errors": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            import traceback

            print(f"Error creating student: {str(e)}")
            print(traceback.format_exc())

            return Response(
                {
                    "detail": "Failed to create student",
                    "error": "An unexpected error occurred",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_protect, name="dispatch")
class StudentsBulkUploadView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    LEARNING_TASK_LIMIT_DEFAULT = 20
    FIELD_LIST = ["ai", "other", "backend", "frontend", "embedded", "cyber"]

    def post(self, request):
        try:
            if "file" not in request.FILES:
                return Response(
                    {"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST
                )

            file = request.FILES["file"]
            file_extension = file.name.split(".")[-1].lower()

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
            required_columns = [
                "full_name",
                "email",
                "grade",
                "section",
                "field",
                "gender",
                "phone_number",
            ]
            missing_columns = [col for col in required_columns if col not in df.columns]

            if missing_columns:
                return Response(
                    {
                        "error": f"Missing required columns: {', '.join(missing_columns)}",
                        "required_columns": required_columns,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            created_students = []
            errors = []
            users_to_create = []
            profiles_to_create = []
            learning_task_limits_to_create = []

            emails_in_file = set()
            duplicate_emails_in_file = set()

            # First pass: validate
            for index, row in df.iterrows():
                row_errors = {}

                email = str(row["email"]).strip().lower()
                full_name = str(row.get("full_name", "")).strip()
                grade_str = str(row.get("grade", "")).strip()
                section = str(row.get("section", "")).strip().upper()
                field = str(row.get("field", "")).strip().lower()
                phone_number = str(row.get("phone_number", "")).strip()
                account = str(row.get("account", "")).strip()
                gender = str(row.get("gender", "male")).strip().lower()

                if gender not in ["male", "female"]:
                    row_errors["gender"] = ["Invalid gender"]

                if email in emails_in_file:
                    duplicate_emails_in_file.add(email)
                emails_in_file.add(email)

                if not email:
                    row_errors["email"] = ["Email is required"]
                else:
                    try:
                        validate_email(email)
                    except ValidationError:
                        row_errors["email"] = ["Invalid email format"]

                if not full_name:
                    row_errors["full_name"] = ["Full name is required"]

                if not grade_str:
                    row_errors["grade"] = ["Grade is required"]
                else:
                    try:
                        grade = int(grade_str)
                        if grade < 1 or grade > 12:
                            row_errors["grade"] = ["Grade must be between 1 and 12"]
                    except (ValueError, TypeError):
                        row_errors["grade"] = ["Grade must be a valid number"]

                if not section:
                    row_errors["section"] = ["Section is required"]
                elif len(section) != 1 or not section.isalpha():
                    row_errors["section"] = ["Section must be a single letter (A-Z)"]

                if not field:
                    row_errors["field"] = ["Field is required"]
                elif field not in self.FIELD_LIST:
                    row_errors["field"] = [f"'{field}' is invalid field name."]

                if not phone_number:
                    row_errors["phone_number"] = ["Phone number is required"]

                if row_errors:
                    errors.append(
                        {"row": index + 1, "email": email, "errors": row_errors}
                    )

            if duplicate_emails_in_file:
                for index, row in df.iterrows():
                    email = str(row["email"]).strip().lower()
                    if email in duplicate_emails_in_file:
                        errors.append(
                            {
                                "row": index + 1,
                                "email": email,
                                "errors": {"email": ["Duplicate email in the file"]},
                            }
                        )

            if errors:
                return Response(
                    {
                        "error": "Validation failed for some rows",
                        "created_count": 0,
                        "created_students": [],
                        "error_count": len(errors),
                        "errors": errors,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Second pass: create users
            with transaction.atomic():
                existing_emails = set(
                    User.objects.filter(
                        email__in=[
                            str(row["email"]).strip().lower()
                            for _, row in df.iterrows()
                        ]
                    ).values_list("email", flat=True)
                )

                for index, row in df.iterrows():
                    email = str(row["email"]).strip().lower()
                    full_name = str(row.get("full_name", "")).strip()
                    gender = str(row.get("gender", "male")).strip().lower()

                    if email in existing_emails:
                        errors.append(
                            {
                                "row": index + 1,
                                "email": email,
                                "error": "User with this email already exists in the database",
                            }
                        )
                        continue

                    user = User(
                        email=email,
                        full_name=full_name,
                        is_active=True,
                        role="user",
                        gender=gender,  # ← gender now goes to User
                    )
                    users_to_create.append(user)

                if users_to_create:
                    created_users = User.objects.bulk_create(users_to_create)

                    user_dict = {user.email: user for user in created_users}

                    for index, row in df.iterrows():
                        email = str(row["email"]).strip().lower()
                        if email in user_dict:
                            user = user_dict[email]
                            grade_str = str(row.get("grade", "")).strip()
                            section = str(row.get("section", "")).strip().upper()
                            field = str(row.get("field", "")).strip()
                            phone_number = str(row.get("phone_number", "")).strip()
                            account = str(row.get("account", "")).strip()

                            profile = Profile(
                                user=user,
                                grade=int(grade_str),
                                section=section.upper(),
                                field=field.lower(),
                                account=(
                                    account if account and account != "N/A" else None
                                ),
                                phone_number=phone_number,
                            )
                            profiles_to_create.append(profile)

                            learning_task_limit = LearningTaskLimit(
                                user=user, limit=self.LEARNING_TASK_LIMIT_DEFAULT
                            )
                            learning_task_limits_to_create.append(learning_task_limit)

                    if profiles_to_create:
                        Profile.objects.bulk_create(profiles_to_create)

                    if learning_task_limits_to_create:
                        LearningTaskLimit.objects.bulk_create(
                            learning_task_limits_to_create
                        )

                    for user in created_users:
                        profile = next(
                            (p for p in profiles_to_create if p.user_id == user.id),
                            None,
                        )
                        created_students.append(
                            {
                                "id": user.id,
                                "full_name": user.full_name,
                                "email": user.email,
                                "grade": profile.grade if profile else None,
                                "section": profile.section if profile else None,
                                "field": profile.field if profile else None,
                                "account": profile.account if profile else "N/A",
                                "phone_number": (
                                    profile.phone_number if profile else None
                                ),
                                "gender": user.gender,  # ← from User
                                "learning_task_limit": self.LEARNING_TASK_LIMIT_DEFAULT,
                                "message": "Please change your password on first login",
                            }
                        )

            response_data = {
                "created_count": len(created_students),
                "created_students": created_students,
                "error_count": len(errors),
                "errors": errors,
                "learning_task_limit_default": self.LEARNING_TASK_LIMIT_DEFAULT,
            }

            status_code = (
                status.HTTP_207_MULTI_STATUS if errors else status.HTTP_201_CREATED
            )
            return Response(response_data, status=status_code)

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {"error": str(e), "detail": "Failed to process bulk upload"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class StudentsExportView(APIView):

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            # Get query parameters for filtering
            search = request.query_params.get("search", "").strip()
            grade = request.query_params.get("grade", "").strip()
            section = request.query_params.get("section", "").strip()
            account_status = request.query_params.get("account_status", "").strip()

            # Get filtered students
            profiles = Profile.objects.select_related("user").filter(
                user__role="user", user__is_deleted=False
            )

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
                        "Gender": profile.user.gender or "",
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

            # Export to Excel
            output = BytesIO()
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Students")
            output.seek(0)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"students_export_{timestamp}.xlsx"

            response = HttpResponse(
                output.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to export students"}, status=500
            )


class StudentsStatsView(APIView):

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

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
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        try:
            # Create empty dataframe with just the column names
            df = pd.DataFrame(
                columns=[
                    "full_name",
                    "email",
                    "grade",
                    "section",
                    "field",
                    "phone_number",
                    "account",
                    "gender",
                ]
            )

            # Convert to Excel
            output = BytesIO()
            df.to_excel(output, index=False)
            output.seek(0)

            # Create response
            response = HttpResponse(
                output.getvalue(),
                content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            response["Content-Disposition"] = (
                'attachment; filename="student_template.xlsx"'
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
            return Response(
                {"error": f"Language with {pk} doesn't exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = LanguageSerializer(languages)
        return Response(serializer.data)


@method_decorator(csrf_protect, name="dispatch")
class LanguageAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

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
            return Response(
                {"error": f"Language with {pk} doesn't exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        languages.delete()
        return Response(
            {"message": "Language deleted successfully"}, status=status.HTTP_200_OK
        )

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
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = LanguageSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FrameworkDetailAPIView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            frameworks = Framework.objects.get(pk=pk)
        except Framework.DoesNotExist:
            return Response(
                {"error": f"Framework with {pk} doesn't exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = FrameworkSerializer(frameworks)
        return Response(serializer.data)


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
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = FrameworkSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            frameworks = Framework.objects.get(pk=pk)
        except Framework.DoesNotExist:
            return Response(
                {"error": f"Framework with {pk} doesn't exist."},
                status=status.HTTP_404_NOT_FOUND,
            )
        frameworks.delete()
        return Response(
            {"message": "Framework deleted successfully."},
            status=status.HTTP_400_BAD_REQUEST,
        )

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
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        serializer = FrameworkSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_protect, name="dispatch")
class DeleteLearningTaskView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def delete(self, request, task_id):
        try:
            task = LearningTask.objects.get(id=task_id)
            user = task.user
            task_limit = LearningTaskLimit.objects.get(user=user)

            with transaction.atomic():
                async_to_sync(notify_user)(
                    recipient=task.user,
                    actor=user,
                    title=f"Your learning task deletion.",
                    description=f"Your learning task '{task.title}' has been deleted by admin.",
                    code="info",
                    is_push_notif=True,
                )
                task.delete()
                task_limit.deleted()

            return Response(
                {"message": "Task deleted successfully."},
                status=status.HTTP_204_NO_CONTENT,
            )
        except LearningTaskLimit.DoesNotExist:

            return Response(
                {"error": "Learning task limit has not been set yet."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except LearningTask.DoesNotExist:

            return Response(
                {"error": "Task not found."}, status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_protect, name="dispatch")
class DeleteTaskReviewView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def delete(self, request, task_id):
        try:
            task_review = TaskReview.objects.get(task__id=task_id, user=request.user)
            task = task_review.task

            with transaction.atomic():
                if task_review.is_admin:
                    task.status = "under_review"
                    task.save()
                task_review.delete()
            return Response(
                {"message": "Task review deleted successfully."},
                status=status.HTTP_200_OK,
            )

        except TaskReview.DoesNotExist:
            return Response(
                {"error": "Task review not found."}, status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_protect, name="dispatch")
class TaskLimitView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def post(self, request):
        data = request.data

        value = data.get("value")
        scope = data.get("scope")
        operation = data.get("operation")
        grade = data.get("grade")
        section = data.get("section")
        field = data.get("field")

        errors = {}

        valid_scopes = ["all", "active", "inactive", "by_grade", "by_field"]
        if scope not in valid_scopes:
            errors["scope"] = "Invalid scope."

        valid_ops = ["set", "increment", "decrement"]
        if operation not in valid_ops:
            errors["operation"] = "Invalid operation."

        try:
            value = int(value)
            if value < 0 or value > 300:
                errors["value"] = "Value must be between 0 and 300."
            if operation in ["increment", "decrement"] and value == 0:
                errors["value"] = "Value must be greater than zero."
        except (TypeError, ValueError):
            errors["value"] = "Value must be an integer."

        if scope == "by_grade" and not grade:
            errors["grade"] = "Grade is required."
        if scope == "by_field" and not field:
            errors["field"] = "Field is required."

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        users = User.objects.filter(role="user")

        if scope == "active":
            users = users.filter(is_active=True)
        elif scope == "inactive":
            users = users.filter(is_active=False)
        elif scope == "by_grade":
            users = users.filter(profile__grade=grade, profile__section=section)
        elif scope == "by_field":
            users = users.filter(profile__field=field)

        if not users.exists():
            return Response(
                {
                    "error": "No users found with the selected filters.",
                    "no_user": True,
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        user_ids = list(users.values_list("id", flat=True))

        limits = LearningTaskLimit.objects.filter(user_id__in=user_ids)

        for limit_obj in limits:
            if operation == "set":
                limit_obj.limit = value
            elif operation == "increment":
                limit_obj.limit += value
            elif operation == "decrement":
                limit_obj.limit = max(limit_obj.limit - value, 0)
        users_list = list(users)

        with transaction.atomic():
            async_to_sync(notify_users_bulk)(
                recipients=users_list,
                actor=request.user,
                title="Task limit updated",
                description="Your task limit has been updated.",
                code="info",
                is_push_notif=True,
            )

            LearningTaskLimit.objects.bulk_update(limits, ["limit"])

        return Response(
            {
                "message": "Task limits updated successfully.",
                "affected_users": user_ids,
                "total_users": len(users_list),
            },
            status=status.HTTP_200_OK,
        )


class GetAllUsersView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = Profile.objects.filter(user__role="user")
        if not users.exists():
            return Response(
                {"warning": "No user found."}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProfileSerializer(users, many=True)
        return Response({"users": serializer.data}, status=status.HTTP_200_OK)


class DashboardView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAdminUser]

    def get(self, request):
        students = User.objects.filter(role="user", is_deleted=False)
        gender_counts_query = students.values("gender").annotate(count=Count("id"))
        gender_counts = {item["gender"]: item["count"] for item in gender_counts_query}
        for g in ["male", "female"]:
            gender_counts.setdefault(g, 0)

        sessions_query = AttendanceSession.objects.all()
        total_sessions = sessions_query.count()

        status_counts_query = Attendance.objects.values("status").annotate(
            count=Count("id")
        )
        status_counts = {
            status: 0 for status in ["present", "late", "absent", "special_case"]
        }
        for item in status_counts_query:
            status_counts[item["status"]] = item["count"]

        total_attendance = sum(status_counts.values()) or 1
        status_percentages = {
            k: round(v / total_attendance * 100, 2) for k, v in status_counts.items()
        }

        grade_distribution_query = (
            Profile.objects.values("grade")
            .annotate(count=Count("id"))
            .order_by("grade")
        )
        grade_distribution = {
            item["grade"]: item["count"] for item in grade_distribution_query
        }

        boundary = int(request.query_params.get("boundary", 10))
        top_tasks = LearningTask.objects.annotate(
            admin_rating=Avg("reviews__rating", filter=Q(reviews__is_admin=True)),
            likes_count=Count("likes", distinct=True),
        ).order_by("-admin_rating", "-likes_count")[:boundary]
        top_learning_tasks = LearningTaskSerializer(top_tasks, many=True).data

        response_data = {
            "gender_counts": gender_counts,
            "attendance_summary": {
                "total_sessions": total_sessions,
                "status_counts": status_counts,
                "status_percentages": status_percentages,
            },
            "grade_distribution": grade_distribution,
            "top_learning_tasks": top_learning_tasks,
            "total_students": students.count(),
        }

        return Response(response_data)


@method_decorator(csrf_protect, name="dispatch")
class AdminControlView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsSuperUser]

    def get(self, request, pk=None):
        if pk:
            admin = (
                User.objects.filter(role="admin", is_staff=True, pk=pk)
                .exclude(id=request.user.id)
                .first()
            )
            if not admin:
                return Response(
                    {"error": "Admin not found."}, status=status.HTTP_404_NOT_FOUND
                )
            serializer = UserInverseSerializer(admin)
            return Response({"admin": serializer.data}, status=status.HTTP_200_OK)

        admins = User.objects.filter(role="admin", is_staff=True).exclude(
            id=request.user.id
        )
        admins_serializer = UserInverseSerializer(admins, many=True)
        return Response({"admins": admins_serializer.data}, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            grade = request.data.get("grade")
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "N/A").strip()
            phone_number = (request.data.get("phone_number") or "").strip()
            is_superuser = request.data.get("is_superuser", False)

            # Validate all required fields
            errors = {}

            if not email:
                errors["email"] = ["Email is required"]
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["email"] = ["Invalid email format"]

            if not full_name:
                errors["full_name"] = ["Full name is required"]

            if grade is None:
                errors["grade"] = ["Grade is required"]
            else:
                try:
                    grade = int(grade)
                    if grade < 1 or grade > 12:
                        errors["grade"] = ["Grade must be between 1 and 12"]
                except (ValueError, TypeError):
                    errors["grade"] = ["Grade must be a valid number"]

            if not section:
                errors["section"] = ["Section is required"]
            elif len(section) != 1 or not section.isalpha():
                errors["section"] = ["Section must be a single letter (A-Z)"]

            if not field:
                errors["field"] = ["Field is required"]

            if not phone_number:
                errors["phone_number"] = ["Phone number is required"]

            # Check for existing email
            if (
                email
                and not errors.get("email")
                and User.objects.filter(email=email).exists()
            ):
                errors["email"] = ["User with this email already exists"]

            if errors:
                return Response(
                    {"detail": "Validation failed", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    email=email,
                    full_name=full_name,
                    is_active=True,
                    is_staff=True,
                    is_superuser=is_superuser,
                    role="admin",
                )

                # Create profile with proper field values
                profile = Profile.objects.create(
                    user=user,
                    grade=grade,
                    section=section.upper() if section else None,
                    field=field if field else None,
                    account=account,
                    phone_number=phone_number if phone_number else None,
                )

            response_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account,
                "phone_number": profile.phone_number,
                "account_status": "active",
                "created_at": profile.created_at,
                "message": "Admin created successfully",
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            return Response(
                {"detail": "Validation error", "errors": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            # Log the error for debugging
            import traceback

            print(f"Error creating admin: {str(e)}")
            print(traceback.format_exc())

            return Response(
                {
                    "detail": "Failed to create admin",
                    "error": "An unexpected error occurred",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, pk):
        try:
            admin = User.objects.get(pk=pk, role="admin")
            profile = Profile.objects.get(user=admin)

            errors = {}

            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            gender = (request.data.get("gender") or "").strip().lower()
            grade = request.data.get("grade")
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "N/A").strip()
            phone_number = (request.data.get("phone_number") or "").strip()
            account_status = request.data.get("account_status", "active")
            profile_pic = request.FILES.get("profile_pic")

            if profile_pic:
                if profile_pic.size > 10 * 1024 * 1024:

                    errors["profile_pic"] = ["Profile picture must be less than 10MB"]

                if not profile_pic.content_type.startswith("image/"):
                    errors["profile_pic"] = ["Only image files are allowed"]

            if not email:
                errors["email"] = ["Email is required"]
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["email"] = ["Invalid email format"]

            if (
                email
                and admin.email != email
                and User.objects.filter(email=email).exists()
            ):
                errors["email"] = ["Admin with this email already exists"]

            if not full_name:
                errors["full_name"] = ["Full name is required"]

            if gender not in ["male", "female", "other"]:
                errors["gender"] = ["Gender must be male, female, or other"]

            try:
                grade = int(grade)
                if grade < 1 or grade > 12:
                    raise ValueError
            except Exception:
                errors["grade"] = ["Grade must be between 1 and 12"]

            if not section or len(section) != 1 or not section.isalpha():
                errors["section"] = ["Section must be a single letter (A-Z)"]

            if not field:
                errors["field"] = ["Field is required"]

            if not phone_number:
                errors["phone_number"] = ["Phone number is required"]

            if errors:
                return Response(
                    {"detail": "Validation failed", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():

                user_serializer = UserSerializer(
                    admin,
                    data={
                        "email": email,
                        "full_name": full_name,
                        "gender": gender,
                        "is_active": account_status == "active",
                    },
                    partial=True,
                    context={"request": request},
                )
                user_serializer.is_valid(raise_exception=True)
                user_serializer.save()

                # update profile
                profile.grade = grade
                profile.section = section.upper()
                profile.field = field
                profile.account = account
                profile.phone_number = phone_number
                profile.save()

            return Response(
                {
                    "message": "Admin updated successfully",
                    "user": user_serializer.data,
                },
                status=status.HTTP_200_OK,
            )

        except User.DoesNotExist:
            return Response(
                {"detail": "Admin not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Admin profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, pk):
        try:
            admin = (
                User.objects.filter(role="admin", is_staff=True, id=pk)
                .exclude(id=request.user.id)
                .first()
            )
        except User.DoesNotExist:
            return Response(
                {"error": "Admin not found."}, status=status.HTTP_404_NOT_FOUND
            )

        admin.delete()
        return Response(
            {"message": "Admin successfully deleted."}, status=status.HTTP_200_OK
        )


@method_decorator(csrf_protect, name="dispatch")
class SettingUpdateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsSuperUser]

    def get(self, request):
        setting, _ = Setting.objects.get_or_create(id=1)
        serializer = SettingSerializer(setting)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        setting, created = Setting.objects.get_or_create(id=1)

        serializer = SettingSerializer(setting, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class GradesRankExportPdfView(APIView):

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    MAX_TEXT_LENGTH = 30

    def truncate(self, text):
        if not text:
            return ""
        return (
            text
            if len(text) <= self.MAX_TEXT_LENGTH
            else text[: self.MAX_TEXT_LENGTH - 3] + "..."
        )

    def get(self, request):
        try:
            # ----------------------------
            # Filters
            # ----------------------------
            search = request.query_params.get("search", "").strip()
            grade_q = request.query_params.get("grade", "").strip()
            section_q = request.query_params.get("section", "").strip()
            field_q = request.query_params.get("field", "").strip()
            account_status = request.query_params.get("account_status", "").strip()

            profiles = Profile.objects.select_related("user").filter(
                user__role="user",
                user__is_deleted=False,
            )

            if search:
                profiles = profiles.filter(
                    Q(user__full_name__icontains=search)
                    | Q(user__email__icontains=search)
                    | Q(grade__icontains=search)
                    | Q(section__icontains=search)
                    | Q(field__icontains=search)
                )

            if grade_q:
                try:
                    profiles = profiles.filter(grade=int(grade_q))
                except ValueError:
                    pass

            if section_q:
                profiles = profiles.filter(section=section_q)

            if field_q:
                profiles = profiles.filter(field=field_q)

            if account_status == "active":
                profiles = profiles.filter(user__is_active=True)
            elif account_status == "inactive":
                profiles = profiles.filter(user__is_active=False)

            # ----------------------------
            # Score Annotation (Fast DB Aggregation)
            # ----------------------------
            annotated_qs = (
                profiles.annotate(
                    reviews_sum=Coalesce(
                        Sum(
                            "user__learningtask__reviews__rating",
                            filter=Q(user__learningtask__reviews__is_admin=True),
                        ),
                        0,
                    ),
                    bonus_sum=Coalesce(
                        Sum("user__learningtask__bonuses__score"),
                        0,
                    ),
                )
                .annotate(score=F("reviews_sum") + F("bonus_sum"))
                .order_by("-score", "user__full_name")
                .values(
                    "user__full_name",
                    "grade",
                    "section",
                    "field",
                    "score",
                )
            )

            rows = list(annotated_qs)

            # ----------------------------
            # Dense Ranking
            # ----------------------------
            result_rows = []
            prev_score = None
            rank = 0

            for idx, row in enumerate(rows, start=1):
                score = int(row["score"]) if row["score"] else 0

                if prev_score is None or score != prev_score:
                    rank += 1
                    prev_score = score

                result_rows.append(
                    [
                        str(idx),
                        self.truncate(row["user__full_name"]),
                        row["grade"] or "",
                        row["section"] or "",
                        row["field"] or "",
                        str(score),
                        str(rank),
                    ]
                )

            # ----------------------------
            # Build PDF
            # ----------------------------
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=30,
                leftMargin=30,
                topMargin=30,
                bottomMargin=30,
            )

            elements = []
            styles = getSampleStyleSheet()

            # Title
            elements.append(
                Paragraph("<b>Student Score Ranking Report</b>", styles["Title"])
            )
            elements.append(Spacer(1, 0.2 * inch))

            # Metadata
            metadata_lines = [
                f"Total Students: {len(result_rows)}",
                f"Exported At: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
            ]

            for line in metadata_lines:
                elements.append(Paragraph(line, styles["Normal"]))

            elements.append(Spacer(1, 0.4 * inch))

            # ----------------------------
            # Table Setup (90% Width)
            # ----------------------------
            table_data = [
                ["#", "Full Name", "Grade", "Section", "Field", "Score", "Rank"]
            ] + result_rows

            wrapped_data = [
                [Paragraph(str(cell), styles["Normal"]) for cell in row]
                for row in table_data
            ]

            available_width = doc.width
            table_width = available_width * 0.90  # EXACT 90%

            col_widths = [
                table_width * 0.06,  # #
                table_width * 0.28,  # Full Name
                table_width * 0.12,  # Grade
                table_width * 0.12,  # Section
                table_width * 0.12,  # Field
                table_width * 0.15,  # Score
                table_width * 0.15,  # Rank
            ]

            table = Table(
                wrapped_data,
                repeatRows=1,
                colWidths=col_widths,
            )

            table.hAlign = "CENTER"

            table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0e0e0")),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                        # Alignments
                        ("ALIGN", (0, 1), (0, -1), "CENTER"),  # Index
                        ("ALIGN", (5, 1), (6, -1), "CENTER"),  # Score + Rank
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        # Padding
                        ("LEFTPADDING", (0, 0), (-1, -1), 4),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                        ("TOPPADDING", (0, 0), (-1, -1), 3),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ]
                )
            )

            elements.append(table)

            doc.build(elements)
            buffer.seek(0)

            filename = (
                f"student_score_ranking_{timezone.now().strftime('%Y%m%d_%H%M%S')}.pdf"
            )

            response = HttpResponse(
                buffer.read(),
                content_type="application/pdf",
            )
            response["Content-Disposition"] = f'attachment; filename="{filename}"'

            return response

        except Exception as e:
            return Response(
                {"error": "Failed to export ranking", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_protect, name="dispatch")
class StudentsBulkOperationView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsSuperUser]

    FIELD_LIST = ["ai", "other", "backend", "frontend", "embedded", "cyber"]

    def post(self, request):
        try:
            action = request.data.get("action")
            if action not in ["delete", "edit"]:
                return Response(
                    {"error": "Invalid action. Must be 'delete' or 'edit'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # --- Filters ---
            search = (request.data.get("search") or "").strip()
            grade_q = request.data.get("grade")
            section_q = (request.data.get("section") or "").strip().upper()
            field_q = (request.data.get("field") or "").strip().lower()
            account_status = (request.data.get("account_status") or "").strip().lower()

            profiles = Profile.objects.select_related("user").filter(
                user__role="user", user__is_deleted=False
            )

            if search:
                profiles = profiles.filter(
                    Q(user__full_name__icontains=search)
                    | Q(user__email__icontains=search)
                    | Q(grade__icontains=search)
                    | Q(section__icontains=search)
                    | Q(field__icontains=search)
                )

            if grade_q is not None:
                try:
                    grade_int = int(grade_q)
                    profiles = profiles.filter(grade=grade_int)
                except ValueError:
                    pass

            if section_q:
                profiles = profiles.filter(section__iexact=section_q)

            if field_q:
                profiles = profiles.filter(field__iexact=field_q)

            if account_status:
                if account_status == "active":
                    profiles = profiles.filter(user__is_active=True)
                elif account_status == "inactive":
                    profiles = profiles.filter(user__is_active=False)

            affected_count = profiles.count()
            if affected_count == 0:
                return Response(
                    {"message": "No students match the given filters."},
                    status=status.HTTP_200_OK,
                )

            with transaction.atomic():
                if action == "delete":
                    user_ids = list(
                        profiles.values_list("user_id", flat=True).distinct()
                    )
                    # Count users BEFORE deletion
                    user_deleted_count = len(user_ids)
                    # Delete users (cascades will still happen, but not counted)
                    deleted_detail = User.objects.filter(id__in=user_ids).delete()

                    return Response(
                        {
                            "deleted_count": user_deleted_count,
                            "cascaded_deletions": deleted_detail,  # optional debug info
                        },
                        status=status.HTTP_200_OK,
                    )

                elif action == "edit":
                    edit_data = request.data.get("edit_data", {})
                    allowed_fields = [
                        "grade",
                        "section",
                        "field",
                        "account",
                        "phone_number",
                        "is_active",
                    ]

                    update_data = {}
                    profile_update_data = {}

                    for key, value in edit_data.items():
                        if key not in allowed_fields:
                            continue
                        if key == "field" and value.lower() not in self.FIELD_LIST:
                            continue
                        if key == "section":
                            value = value.upper() if value else value
                        if key in [
                            "grade",
                            "section",
                            "field",
                            "account",
                            "phone_number",
                        ]:
                            profile_update_data[key] = value
                        if key == "is_active":
                            update_data["is_active"] = bool(value)

                    # Update users
                    if update_data:
                        user_ids = profiles.values_list("user_id", flat=True)
                        User.objects.filter(id__in=user_ids).update(**update_data)

                    # Update profiles
                    if profile_update_data:
                        profiles.update(**profile_update_data)

                    return Response(
                        {
                            "message": f"{affected_count} students updated successfully",
                            "updated_fields": list(profile_update_data.keys())
                            + list(update_data.keys()),
                        },
                        status=status.HTTP_200_OK,
                    )

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {"error": str(e), "detail": "Failed to perform bulk operation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
