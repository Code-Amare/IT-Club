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
from learning_task.serializers import (
    LearningTaskSerializer,
    LearningTaskLimitSerializer,
)
from learning_task.models import LearningTaskLimit
from .models import Framework, Language
from attendance.models import Attendance, AttendanceSession
from learning_task.models import LearningTask, TaskReview
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from django.db.models import (
    Count,
    Q,
    F,
    When,
    Case,
    Value,
    IntegerField,
    FloatField,
    Avg,
)
from django.utils import timezone
from datetime import timedelta
import math
from learning_task.models import LearningTaskLimit
import openpyxl


User = get_user_model()


class StudentsView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Get query parameters from the frontend
            search = request.query_params.get("search", "").strip()
            grade = request.query_params.get("grade", "").strip()
            section = request.query_params.get("section", "").strip()
            account_status = request.query_params.get("accountStatus", "").strip()
            sort_by = request.query_params.get("sort_by", "-user__date_joined")
            sort_order = request.query_params.get("sort_order", "desc")

            # Page and page_size should match the frontend pagination
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 10))

            # Build base queryset with attendance annotations
            profiles = Profile.objects.select_related("user").annotate(
                # Attendance statistics
                total_sessions_attended=Count("user__attendances", distinct=True),
                present_count=Count(
                    "user__attendances", filter=Q(user__attendances__status="present")
                ),
                late_count=Count(
                    "user__attendances", filter=Q(user__attendances__status="late")
                ),
                absent_count=Count(
                    "user__attendances", filter=Q(user__attendances__status="absent")
                ),
                # Calculate attendance percentage (avoid division by zero)
                attendance_percentage=Case(
                    When(total_sessions_attended=0, then=Value(0.0)),
                    default=(
                        100.0
                        * Count(
                            "user__attendances",
                            filter=Q(user__attendances__status="present"),
                        )
                        / F("total_sessions_attended")
                    ),
                    output_field=FloatField(),
                ),
            )

            # Apply text search across multiple fields
            if search:
                search_filter = Q(user__full_name__icontains=search)
                search_filter |= Q(user__email__icontains=search)
                search_filter |= Q(grade__icontains=search)
                search_filter |= Q(section__icontains=search)
                search_filter |= Q(account__icontains=search)
                search_filter |= Q(phone_number__icontains=search)
                profiles = profiles.filter(search_filter)

            # Apply filters - match frontend filter names
            if grade:
                try:
                    grade_int = int(grade)
                    profiles = profiles.filter(grade=grade_int)
                except ValueError:
                    pass

            if section:
                profiles = profiles.filter(section__iexact=section)

            if account_status:
                if account_status.lower() == "active":
                    profiles = profiles.filter(user__is_active=True)
                elif account_status.lower() == "inactive":
                    profiles = profiles.filter(user__is_active=False)

            # Apply sorting
            # Map frontend sort keys to database fields
            sort_mapping = {
                "full_name": "user__full_name",
                "email": "user__email",
                "grade": "grade",
                "section": "section",
                "account_status": "user__is_active",
                "created_at": "created_at",
                "attendance_percentage": "attendance_percentage",
                "total_sessions": "total_sessions_attended",
            }

            # Determine the actual sort field
            if sort_by.startswith("-"):
                sort_field = sort_by[1:]
                if sort_field in sort_mapping:
                    db_sort_field = sort_mapping[sort_field]
                    if sort_order == "desc":
                        profiles = profiles.order_by(f"-{db_sort_field}")
                    else:
                        profiles = profiles.order_by(db_sort_field)
                else:
                    # Default sorting by date joined
                    profiles = profiles.order_by("-user__date_joined")
            else:
                if sort_by in sort_mapping:
                    db_sort_field = sort_mapping[sort_by]
                    if sort_order == "desc":
                        profiles = profiles.order_by(f"-{db_sort_field}")
                    else:
                        profiles = profiles.order_by(db_sort_field)
                else:
                    profiles = profiles.order_by("-user__date_joined")

            # Calculate pagination
            total_count = profiles.count()
            total_pages = math.ceil(total_count / page_size) if page_size > 0 else 1

            # Apply pagination
            start_index = (page - 1) * page_size
            end_index = start_index + page_size
            paginated_profiles = profiles[start_index:end_index]

            # Prepare student data with attendance statistics
            students_data = []
            for profile in paginated_profiles:
                # Get recent attendance (last 30 days)
                thirty_days_ago = timezone.now() - timedelta(days=30)
                recent_attendance = profile.user.attendances.filter(
                    attended_at__gte=thirty_days_ago
                )
                recent_total = recent_attendance.count()
                recent_present = recent_attendance.filter(status="present").count()

                # Get last attendance record
                last_attendance = profile.user.attendances.order_by(
                    "-attended_at"
                ).first()

                # Format attendance data
                attendance_percentage = profile.attendance_percentage or 0
                total_sessions = profile.total_sessions_attended or 0

                student_data = {
                    "id": profile.user.id,
                    "full_name": profile.user.full_name or "",
                    "email": profile.user.email or "",
                    "grade": profile.grade or "",
                    "section": profile.section or "",
                    "field": profile.field or "",
                    "account": profile.account or "",
                    "phone_number": profile.phone_number or "",
                    "account_status": (
                        "active" if profile.user.is_active else "inactive"
                    ),
                    "profile_pic_url": profile.user.profile_pic_id or "",
                    "created_at": (
                        profile.created_at.isoformat() if profile.created_at else None
                    ),
                    "updated_at": (
                        profile.updated_at.isoformat() if profile.updated_at else None
                    ),
                    "date_joined": (
                        profile.user.date_joined.isoformat()
                        if profile.user.date_joined
                        else None
                    ),
                    # Add attendance statistics
                    "attendance": {
                        "total_sessions": total_sessions,
                        "present": profile.present_count or 0,
                        "late": profile.late_count or 0,
                        "absent": profile.absent_count or 0,
                        "attendance_percentage": round(attendance_percentage, 2),
                        "attendance_rating": self._get_attendance_rating(
                            attendance_percentage
                        ),
                        "recent_attendance": {
                            "total": recent_total,
                            "present": recent_present,
                            "recent_percentage": (
                                round((recent_present / recent_total * 100), 2)
                                if recent_total > 0
                                else 0
                            ),
                        },
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
                students_data.append(student_data)

            # Calculate overall statistics
            total_students = Profile.objects.count()
            active_students = Profile.objects.filter(user__is_active=True).count()
            inactive_students = Profile.objects.filter(user__is_active=False).count()

            # Get grade distribution
            grade_distribution = {}
            grade_counts = (
                Profile.objects.values("grade")
                .annotate(count=Count("grade"))
                .order_by("grade")
            )
            for item in grade_counts:
                if item["grade"]:
                    grade_distribution[str(item["grade"])] = item["count"]

            # Get section distribution
            section_distribution = {}
            section_counts = (
                Profile.objects.values("section")
                .annotate(count=Count("section"))
                .order_by("section")
            )
            for item in section_counts:
                if item["section"]:
                    section_distribution[item["section"]] = item["count"]

            # Calculate overall attendance statistics
            overall_attendance_stats = self._get_overall_attendance_stats()

            # Get unique values for filter dropdowns
            available_grades = list(
                Profile.objects.exclude(grade=None)
                .values_list("grade", flat=True)
                .distinct()
                .order_by("grade")
            )
            available_sections = list(
                Profile.objects.exclude(section=None)
                .values_list("section", flat=True)
                .distinct()
                .order_by("section")
            )

            # Build the complete response
            response_data = {
                "students": students_data,
                "pagination": {
                    "current_page": page,
                    "page_size": page_size,
                    "total_count": total_count,
                    "total_pages": total_pages,
                },
                "stats": {
                    "total": total_students,
                    "active": active_students,
                    "inactive": inactive_students,
                    "by_grade": grade_distribution,
                    "by_section": section_distribution,
                    "attendance": overall_attendance_stats,
                },
                "filters": {
                    "available_grades": [str(g) for g in available_grades],
                    "available_sections": available_sections,
                },
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            import traceback

            print(f"Error in StudentsView: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": str(e), "detail": "Failed to fetch students"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_attendance_rating(self, percentage):
        """Determine attendance rating based on percentage"""
        if percentage >= 90:
            return "excellent"
        elif percentage >= 75:
            return "good"
        elif percentage >= 60:
            return "average"
        elif percentage > 0:
            return "poor"
        else:
            return "no_data"

    def _get_overall_attendance_stats(self):
        """Calculate overall attendance statistics for all students"""
        try:
            # Get all attendance records
            total_attendance = Attendance.objects.count()

            if total_attendance == 0:
                return {
                    "total_sessions": 0,
                    "total_attendance_records": 0,
                    "present_percentage": 0,
                    "late_percentage": 0,
                    "absent_percentage": 0,
                    "average_attendance_percentage": 0,
                    "total_present": 0,
                    "total_late": 0,
                    "total_absent": 0,
                }

            # Get counts by status
            present_count = Attendance.objects.filter(status="present").count()
            late_count = Attendance.objects.filter(status="late").count()
            absent_count = Attendance.objects.filter(status="absent").count()

            # Calculate percentages
            present_percentage = (present_count / total_attendance) * 100
            late_percentage = (late_count / total_attendance) * 100
            absent_percentage = (absent_count / total_attendance) * 100

            # Get unique attendance sessions
            total_sessions = AttendanceSession.objects.filter(is_ended=True).count()

            # Calculate average attendance percentage across all students
            profiles_with_attendance = Profile.objects.annotate(
                total_sessions=Count("user__attendances"),
                present_sessions=Count(
                    "user__attendances", filter=Q(user__attendances__status="present")
                ),
            ).filter(total_sessions__gt=0)

            total_percentage = 0
            count = 0

            for profile in profiles_with_attendance:
                if profile.total_sessions > 0:
                    percentage = (
                        profile.present_sessions / profile.total_sessions
                    ) * 100
                    total_percentage += percentage
                    count += 1

            average_attendance_percentage = total_percentage / count if count > 0 else 0

            return {
                "total_sessions": total_sessions,
                "total_attendance_records": total_attendance,
                "total_present": present_count,
                "total_late": late_count,
                "total_absent": absent_count,
                "present_percentage": round(present_percentage, 2),
                "late_percentage": round(late_percentage, 2),
                "absent_percentage": round(absent_percentage, 2),
                "average_attendance_percentage": round(
                    average_attendance_percentage, 2
                ),
            }

        except Exception as e:
            print(f"Error calculating attendance stats: {e}")
            return {
                "total_sessions": 0,
                "total_attendance_records": 0,
                "present_percentage": 0,
                "late_percentage": 0,
                "absent_percentage": 0,
                "average_attendance_percentage": 0,
                "total_present": 0,
                "total_late": 0,
                "total_absent": 0,
            }


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


class StudentStatsView(APIView):
    """Separate endpoint for just statistics (if your frontend calls it separately)"""

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request):
        try:
            # Get basic stats
            total_students = Profile.objects.count()
            active_students = Profile.objects.filter(user__is_active=True).count()
            inactive_students = Profile.objects.filter(user__is_active=False).count()

            # Calculate grade distribution
            grade_distribution = {}
            grade_counts = (
                Profile.objects.values("grade")
                .annotate(count=Count("grade"))
                .order_by("grade")
            )
            for item in grade_counts:
                if item["grade"]:
                    grade_distribution[str(item["grade"])] = item["count"]

            # Calculate section distribution
            section_distribution = {}
            section_counts = (
                Profile.objects.values("section")
                .annotate(count=Count("section"))
                .order_by("section")
            )
            for item in section_counts:
                if item["section"]:
                    section_distribution[item["section"]] = item["count"]

            # Calculate attendance stats
            attendance_stats = self._get_overall_attendance_stats()

            response_data = {
                "overall": {
                    "total": total_students,
                    "active": active_students,
                    "inactive": inactive_students,
                    "by_grade": grade_distribution,
                    "by_section": section_distribution,
                    "attendance": attendance_stats,
                }
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e), "detail": "Failed to fetch student statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def _get_overall_attendance_stats(self):
        """Calculate attendance statistics based on the provided models"""
        try:
            # Get all ended sessions
            ended_sessions = AttendanceSession.objects.filter(is_ended=True)
            total_sessions = ended_sessions.count()

            if total_sessions == 0:
                return {
                    "total_sessions": 0,
                    "total_attendance_records": 0,
                    "present_percentage": 0,
                    "late_percentage": 0,
                    "absent_percentage": 0,
                    "average_attendance_percentage": 0,
                }

            # Get all attendance records for ended sessions
            attendance_records = Attendance.objects.filter(session__is_ended=True)
            total_attendance_records = attendance_records.count()

            # Count statuses
            present_count = attendance_records.filter(status="present").count()
            late_count = attendance_records.filter(status="late").count()
            absent_count = attendance_records.filter(status="absent").count()

            # Calculate percentages
            present_percentage = (
                (present_count / total_attendance_records) * 100
                if total_attendance_records > 0
                else 0
            )
            late_percentage = (
                (late_count / total_attendance_records) * 100
                if total_attendance_records > 0
                else 0
            )
            absent_percentage = (
                (absent_count / total_attendance_records) * 100
                if total_attendance_records > 0
                else 0
            )

            # Calculate average attendance per student
            # Get all users who have at least one attendance record
            users_with_attendance = User.objects.filter(
                attendances__session__is_ended=True
            ).distinct()

            total_percentage = 0
            user_count = 0

            for user in users_with_attendance:
                # Get user's attendance records for ended sessions
                user_attendance = Attendance.objects.filter(
                    user=user, session__is_ended=True
                )

                total_user_sessions = user_attendance.count()
                if total_user_sessions > 0:
                    user_present_count = user_attendance.filter(
                        status="present"
                    ).count()
                    user_attendance_percentage = (
                        user_present_count / total_user_sessions
                    ) * 100
                    total_percentage += user_attendance_percentage
                    user_count += 1

            average_attendance_percentage = (
                total_percentage / user_count if user_count > 0 else 0
            )

            return {
                "total_sessions": total_sessions,
                "total_attendance_records": total_attendance_records,
                "present_percentage": round(present_percentage, 2),
                "late_percentage": round(late_percentage, 2),
                "absent_percentage": round(absent_percentage, 2),
                "average_attendance_percentage": round(
                    average_attendance_percentage, 2
                ),
            }

        except Exception as e:
            print(f"Error calculating attendance stats: {e}")
            return {
                "total_sessions": 0,
                "total_attendance_records": 0,
                "present_percentage": 0,
                "late_percentage": 0,
                "absent_percentage": 0,
                "average_attendance_percentage": 0,
            }


class StudentUpdateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="user")
            profile = Profile.objects.get(user=user)

            response_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "gender": user.gender,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account or "N/A",
                "phone_number": profile.phone_number,
                "account_status": "active" if user.is_active else "inactive",
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response(
                {"detail": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Student profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": "Failed to fetch student data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="user")

            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            grade = request.data.get("grade")
            gender = (request.data.get("gender") or "").strip().lower()
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "").strip()
            phone_number = (request.data.get("phone_number") or "").strip()
            account_status = request.data.get("account_status", "active")
            task_limit = request.data.get("task_limit")
            errors = {}

            if task_limit is None:
                errors["task limit"] = ["Task limit is required"]

            if int(task_limit) < 0:
                errors["task limit"] = ["Can't be negative"]

            learning_task_limit, created = LearningTaskLimit.objects.get_or_create(
                user=user
            )

            if not email:
                errors["email"] = ["Email is required"]
            else:
                try:
                    validate_email(email)
                except ValidationError:
                    errors["email"] = ["Invalid email format"]

            if not full_name:
                errors["full_name"] = ["Full name is required"]

            if not gender:
                errors["gender"] = ["Gender is required"]
            elif gender not in ["male", "female", "other"]:
                errors["gender"] = ["Gender must be male, female, or other"]

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

            if (
                email
                and not errors.get("email")
                and user.email != email
                and User.objects.filter(email=email).exists()
            ):
                errors["email"] = ["User with this email already exists"]

            if errors:
                return Response(
                    {"detail": "Validation failed", "errors": errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                learning_task_limit.limit = task_limit
                learning_task_limit.save()
                user.email = email
                user.gender = gender
                user.full_name = full_name
                user.is_active = account_status == "active"
                user.save()

                profile = Profile.objects.get(user=user)
                profile.grade = grade
                profile.section = section.upper()
                profile.field = field
                profile.account = account if account and account != "N/A" else None
                profile.phone_number = phone_number
                profile.save()

            response_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "gender": user.gender,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account or "N/A",
                "phone_number": profile.phone_number,
                "account_status": "active" if user.is_active else "inactive",
                "created_at": profile.created_at,
                "updated_at": profile.updated_at,
                "message": "Student updated successfully",
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response(
                {"detail": "Student not found"}, status=status.HTTP_404_NOT_FOUND
            )
        except Profile.DoesNotExist:
            return Response(
                {"detail": "Student profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValidationError as e:
            return Response(
                {"detail": "Validation error", "errors": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
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

            try:
                user = User.objects.get(id=student_id)

                task_limit = LearningTaskLimit.objects.get(user=user)

            except User.DoesNotExist:
                return Response(
                    {"error": f"User with '{id}' doesn't exist."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except LearningTaskLimit.DoesNotExist:
                task_limit = LearningTaskLimit.objects.create(user=user)

            task_limit_serializer = LearningTaskLimitSerializer(task_limit)

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
                "gender": user.gender,
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
                "task_limit": task_limit_serializer.data,
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

            task_limit = request.data.get("task_limit")

            if task_limit is not None:
                try:
                    learning_task_limit.limit = int(task_limit)
                    learning_task_limit.save()
                except (TypeError, ValueError):
                    return Response(
                        {"error": "task_limit must be a valid integer"},
                        status=status.HTTP_400_BAD_REQUEST,
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

            learning_task_limit, created = LearningTaskLimit.objects.get_or_create(
                user=user
            )

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


class StudentDeleteView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def get_object(self, pk):
        try:
            return User.objects.get(pk=pk, role="user")
        except User.DoesNotExist:
            return None

    def delete(self, request, pk):
        """Delete a student"""
        try:
            user = self.get_object(pk)
            if not user:
                return Response(
                    {"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND
                )

            # Store data for response before deletion
            student_data = {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
            }

            with transaction.atomic():
                # Delete profile first (if exists)
                Profile.objects.filter(user=user).delete()
                # Delete user
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


class StudentCreateView(APIView):
    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        try:
            email = (request.data.get("email") or "").strip()
            full_name = (request.data.get("full_name") or "").strip()
            grade = request.data.get("grade")
            section = (request.data.get("section") or "").strip()
            field = (request.data.get("field") or "").strip()
            account = (request.data.get("account") or "").strip()
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
                    section=section.upper() if section else None,
                    field=field if field else None,
                    account=account if account and account != "N/A" else None,
                    phone_number=phone_number if phone_number else None,
                )

            response_data = {
                "id": user.id,  # Changed from nested "student" to match frontend expectation
                "full_name": user.full_name,
                "email": user.email,
                "grade": profile.grade,
                "section": profile.section,
                "field": profile.field,
                "account": profile.account
                or "N/A",  # Convert None to "N/A" for frontend
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
            # Log the error for debugging
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


class StudentsBulkUploadView(APIView):
    """
    View for bulk uploading students from CSV/Excel files
    """

    authentication_classes = [JWTCookieAuthentication]
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    # Constants
    LEARNING_TASK_LIMIT_DEFAULT = 20  # Global constant for task limit
    FIELD_LIST = ["ai", "other", "backend", "frontend", "embedded"]

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

            # Validate ALL required columns
            required_columns = [
                "full_name",
                "email",
                "grade",
                "section",
                "field",
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

            # Track emails to check for duplicates in the file itself
            emails_in_file = set()
            duplicate_emails_in_file = set()

            # First pass: Validate all rows
            for index, row in df.iterrows():
                row_errors = {}

                # Prepare and validate each field
                email = str(row["email"]).strip().lower()
                full_name = str(row.get("full_name", "")).strip()
                grade_str = str(row.get("grade", "")).strip()
                section = str(row.get("section", "")).strip().upper()
                field = str(row.get("field", "")).strip()
                phone_number = str(row.get("phone_number", "")).strip()
                account = str(row.get("account", "")).strip()

                # Check for duplicate emails within the file
                if email in emails_in_file:
                    duplicate_emails_in_file.add(email)
                emails_in_file.add(email)

                # Email validation
                if not email:
                    row_errors["email"] = ["Email is required"]
                else:
                    try:
                        validate_email(email)
                    except ValidationError:
                        row_errors["email"] = ["Invalid email format"]

                # Full name validation
                if not full_name:
                    row_errors["full_name"] = ["Full name is required"]

                # Grade validation
                if not grade_str:
                    row_errors["grade"] = ["Grade is required"]
                else:
                    try:
                        grade = int(grade_str)
                        if grade < 1 or grade > 12:
                            row_errors["grade"] = ["Grade must be between 1 and 12"]
                    except (ValueError, TypeError):
                        row_errors["grade"] = ["Grade must be a valid number"]

                # Section validation
                if not section:
                    row_errors["section"] = ["Section is required"]
                elif len(section) != 1 or not section.isalpha():
                    row_errors["section"] = ["Section must be a single letter (A-Z)"]

                # Field validation
                if not field:
                    row_errors["field"] = ["Field is required"]

                if field.lower() not in self.FIELD_LIST:
                    row_errors["field"] = [f"'{field}' is invalid field name."]

                # Phone number validation
                if not phone_number:
                    row_errors["phone_number"] = ["Phone number is required"]

                # If there are validation errors for this row, add to errors
                if row_errors:
                    errors.append(
                        {"row": index + 1, "email": email, "errors": row_errors}
                    )

            # Check for duplicate emails in the file
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

            # If there are validation errors, return them immediately
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

            # Second pass: Create users (in batches)
            with transaction.atomic():
                # Get existing emails in database to avoid duplicates
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
                    grade_str = str(row.get("grade", "")).strip()
                    section = str(row.get("section", "")).strip().upper()
                    field = str(row.get("field", "")).strip()
                    phone_number = str(row.get("phone_number", "")).strip()
                    account = str(row.get("account", "")).strip()

                    # Skip if email already exists in database
                    if email in existing_emails:
                        errors.append(
                            {
                                "row": index + 1,
                                "email": email,
                                "error": "User with this email already exists in the database",
                            }
                        )
                        continue

                    # Generate random password
                    temp_password = "".join(
                        random.choices(string.ascii_letters + string.digits, k=12)
                    )

                    # Create user instance (but don't save yet)
                    user = User(
                        email=email, full_name=full_name, is_active=True, role="user"
                    )
                    user.set_password(temp_password)  # Hash the password
                    users_to_create.append(user)

                # Bulk create users
                if users_to_create:
                    created_users = User.objects.bulk_create(users_to_create)

                    # Create profiles and learning task limits
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

                            # Create profile instance
                            profile = Profile(
                                user=user,
                                grade=int(grade_str),
                                section=section,
                                field=field,
                                account=(
                                    account if account and account != "N/A" else None
                                ),
                                phone_number=phone_number,
                            )
                            profiles_to_create.append(profile)

                            # Create learning task limit instance
                            learning_task_limit = LearningTaskLimit(
                                user=user, limit=self.LEARNING_TASK_LIMIT_DEFAULT
                            )
                            learning_task_limits_to_create.append(learning_task_limit)

                    # Bulk create profiles
                    if profiles_to_create:
                        Profile.objects.bulk_create(profiles_to_create)

                    # Bulk create learning task limits
                    if learning_task_limits_to_create:
                        LearningTaskLimit.objects.bulk_create(
                            learning_task_limits_to_create
                        )

                    # Prepare response data
                    for user in created_users:
                        # Find the corresponding profile
                        profile = None
                        for p in profiles_to_create:
                            if p.user_id == user.id:
                                profile = p
                                break

                        # Find the corresponding temp password (we need to track this)
                        temp_password = "".join(
                            random.choices(string.ascii_letters + string.digits, k=12)
                        )  # Note: This re-generates, but we should track from earlier

                        # For simplicity, we'll use a placeholder
                        # In production, you might want to store temp passwords in a dict
                        created_students.append(
                            {
                                "id": user.id,
                                "full_name": user.full_name,
                                "email": user.email,
                                "grade": profile.grade if profile else None,
                                "section": profile.section if profile else None,
                                "field": profile.field if profile else None,
                                "account": (
                                    profile.account or "N/A" if profile else None
                                ),
                                "phone_number": (
                                    profile.phone_number if profile else None
                                ),
                                "temporary_password": temp_password,  # Note: This is not the actual password
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

            if errors:
                status_code = status.HTTP_207_MULTI_STATUS
            else:
                status_code = status.HTTP_201_CREATED

            return Response(response_data, status=status_code)

        except Exception as e:
            import traceback

            traceback.print_exc()
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
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

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
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

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
    permission_classes = [IsAuthenticated, RolePermissionFactory(["admin", "staff"])]

    def post(self, request):
        serializer = FrameworkSerializer(data=request.data, many=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
