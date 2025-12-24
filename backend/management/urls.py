# students/urls.py
from django.urls import path
from .views import (
    StudentsView,
    StudentDetailView,
    StudentCreateView,
    StudentsBulkUploadView,
    StudentsExportView,
    StudentsStatsView,
    StudentTemplateView,
)

urlpatterns = [
    path("students/", StudentsView.as_view(), name="students-list"),
    path("students/stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("students/create/", StudentCreateView.as_view(), name="student-create"),
    path(
        "student/<int:student_id>/", StudentDetailView.as_view(), name="student-detail"
    ),
    path("bulk-upload/", StudentsBulkUploadView.as_view(), name="students-bulk-upload"),
    path("export/", StudentsExportView.as_view(), name="students-export"),
    path("stats/", StudentsStatsView.as_view(), name="students-stats"),
    path("template/", StudentTemplateView.as_view(), name="student-template"),
]
