from django.urls import path
from .views import (
    AttendanceSessionVeiw,
    AttendanceAPIView,
    CloseAttendanceSessionAPIView,
    OpenAttendanceSessionAPIView,
    AttendanceSessionAllView,
)

urlpatterns = [
    # CRUD for AttendanceSession
    path(
        "sessions/all/", AttendanceSessionAllView.as_view(), name="attendance_sessions"
    ),
    path("sessions/", AttendanceSessionVeiw.as_view(), name="attendance_sessions"),
    path(
        "sessions/<int:session_id>/",
        AttendanceSessionVeiw.as_view(),
        name="attendance_session",
    ),
    # Mark attendance for users (bulk or single)
    path(
        "<int:session_id>/",
        AttendanceAPIView.as_view(),
        name="mark_attendance",
    ),
    # Close attendance session
    path(
        "sessions/close/<int:session_id>/",
        CloseAttendanceSessionAPIView.as_view(),
        name="close_attendance_session",
    ),
    # Open attendance session
    path(
        "sessions/open/<int:session_id>/",
        OpenAttendanceSessionAPIView.as_view(),
        name="open_attendance_session",
    ),
]
