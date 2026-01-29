from django.urls import path
from .views import AttendanceSessionVeiw

urlpatterns = [
    path("session/", AttendanceSessionVeiw.as_view(), name="session-list-create"),
    path(
        "session/<int:session_id>/",
        AttendanceSessionVeiw.as_view(),
        name="session-detail",
    ),
]
